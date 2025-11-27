"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import CircularProgress from "@mui/material/CircularProgress";
import Router, { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleArrowUp, CloudUpload, Plus, WatchIcon } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import baseURL from "@/utils/constants";
import * as XLSX from "xlsx";

export function UploadFile({ project_list }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [density, setDensity] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [existingProject, setExistingProject] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [lineWeight, setLineWeight] = useState<string>("");
  const [markBlocksCount, setMarkBlocksCount] = useState<number | null>(null);
  const router = useRouter();

  console.log("From upload Component", project_list);

  const generateExcel = (data) => {
    console.log("Generating Excel file with data:");
    const wb = XLSX.utils.book_new();
    const ws_data = [
      ["Mark Blocks Count", data.mark_blocks_count],
      [],
      ["Ignored Blocks"],
      ["Block Name", "Timestamp"],
      ...data.ignored_blocks.map((item) => [item.block, item.timestamp]),
      [],
      ["Ignored MTexts"],
      ["Block Name", "Text", "Timestamp"],
      ...data.ignored_mtexts.map((item) => [
        item.block,
        item.text,
        item.timestamp,
      ]),
      [],
      ["Not in Inventory"],
      ["Item"],
      ...data.not_in_inventory.map((item) => [item]),
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Upload Report");

    // Write the workbook to a file and trigger download
    XLSX.writeFile(wb, "upload_report.xlsx");
  };

  // Shows the size of the file and stores the file
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files && event.target.files.length > 0) {
      const filetemp = event.target.files?.[0];
      if (filetemp) {
        const size = Math.round((filetemp.size / (1000 * 1024)) * 100) / 100;
        const uploadedFile: any = {
          name: filetemp.name,
          size: size,
          type: filetemp.type,
          // cors: "no-cors"
        };
        setUploadedFile(uploadedFile);
        setFile(event.target.files[0]);
      }
      setFile(event.target.files[0]);
    }
  };

  //uploads the file in the server as well as uploads it in S3 Storage
  const handleUpload = async (): Promise<void> => {
    if (!uploadedFile) {
      alert("PLease select a file to upload");
      console.error("");
      return;
    }
    try {
      if (uploadedFile.name.split(".")[1] !== "dxf") {
        alert("Please upload a .dxf file");
        return;
      }
    } catch {
      alert("Please upload proper file");
      return;
    }
    if (newProjectName === "" && existingProject === "") {
      alert("Please select the project Name");
      return;
    }

    if (density.trim() === "" || isNaN(parseInt(density))) {
      alert("Please enter proper value for density");
      return;
    }

    if (
      existingProject === "New Project" &&
      (newProjectName.trim() === "" || newProjectName === "New Project")
    ) {
      alert("Please enter proper project name");
      return;
    }

    if (parseInt(lineWeight) < 1 || parseInt(lineWeight) > 4) {
      alert("Line Weight must be between 1 and 4");
      return;
    }

    if (lineWeight.trim() === "" || isNaN(parseInt(lineWeight))) {
      alert("Please enter a proper value for lineweight");
      return;
    }

    const formData = new FormData();
    if (file !== null) {
      formData.append("file", file);
    }
    formData.append("density", density);
    // formData.append("height", window.innerHeight.toString());
    // formData.append("width", window.innerWidth.toString());
    formData.append("height", (2480).toString());
    formData.append("width", (3508).toString());
    formData.append("filename", uploadedFile.name);
    formData.append("username", localStorage.getItem("username")!);
    formData.append("lineweight", lineWeight);
    if (newProjectName === "") {
      formData.append("projectName", existingProject);
    } else {
      formData.append("projectName", newProjectName);
      try {
        console.log("adding new project in db");
        const response = await fetch(`${baseURL}/add_project`, {
          method: "POST",
          body: JSON.stringify({
            username: [localStorage.getItem("username")],
            projectname: [newProjectName],
            isnew: true,
          }),
          headers: { "content-type": "application/json" },
        });

        console.log(response.status);
        console.log(response.body);

        if (response.status === 200) {
          console.log("new project creation sucess");
        } else {
          alert("Bad request please re-check the form");
          console.log("new project creation failed");
          return;
        }
      } catch {
        alert("cant create a new project");
      }
    }

    setLoading(true);

    try {
      console.log("Uploading file:", formData.get("file"));
      const response = await fetch(`${baseURL}/get_dxf_info`, {
        method: "POST",
        body: formData,
      });

      console.log("Response:", response);
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (response.status == 200) {
        const data = await response.json();
        console.log("Data very yummy:", data);

        // Capture the count from the response
        setMarkBlocksCount(data.mark_blocks_count); // Add this line
        console.log("Mark Blocks Count:", data.mark_blocks_count);
        //show the block count in alert
        alert(`Mark_ Blocks Count: ${data.mark_blocks_count}`);

        localStorage.setItem("filename", data["file_name"]);
        localStorage.removeItem("table_metadata");

        generateExcel(data);

        setLoading(false);
        if (data.mark_blocks_count > 0) {
          router.push("/parts_table");
        } else {
          alert("No Mark_ Blocks found in the file");
        }
      } else {
        alert("Please upload a dxf file with proper format");
        console.error("Data format is incorrect");
      }
    } catch (error) {
      alert("Unable to upload your dxf files");
      console.error("Error uploading file:", error);
    } finally {
      setLoading(false);
    }
  };

  //shows the acess to the projects of the user

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="w-[436px] cursor-pointer p-[20px] border border-gray-300 rounded-md shadow-sm flex items-center gap-3">
          <div className="p-[12px] border border-gray-300 rounded-md shadow-sm">
            <CircleArrowUp size={16} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-gray-700 text-[16px] font-semibold">
              Upload your Autocad DXF file
            </h1>
            <h1 className="text-[14px] font-normal text-gray-600">
              Generate BOQ
            </h1>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="">Upload and attach file</DialogTitle>
          <DialogDescription className="">
            Upload and attach files to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="density" className="text-sm">
            Density(kg/m3)
          </Label>
          <Input
            id="density"
            type="text"
            value={density}
            onChange={(event) => setDensity(event.target.value)}
            placeholder="Density"
          />
          <Label htmlFor="density" className="text-sm">
            Lineweight
          </Label>
          <Input
            id="lineweight"
            type="text"
            value={lineWeight}
            onChange={(event) => setLineWeight(event.target.value)}
            placeholder="Lineweight"
          />
          <div className="flex flex-col gap-1.5 justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="relative flex flex-col items-center justify-center w-full py-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
            >
              <div className="text-center">
                <div className="border p-2 rounded-md max-w-min mx-auto">
                  <CloudUpload size="1.6em" />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-900">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  DXF (max. 100mb)
                </p>
              </div>
            </label>
            <Input
              id="dropzone-file"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {uploadedFile && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">{uploadedFile.name}</p>
              <p className="text-sm text-gray-600">{uploadedFile.size} MB</p>
            </div>
          )}
          <Label htmlFor="density" className="text-sm">
            Select Project
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">{existingProject}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
              <DropdownMenuLabel>Select Project</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuRadioGroup
                value={existingProject}
                onValueChange={setExistingProject}
                className=" max-h-40 overflow-y-auto"
              >
                <DropdownMenuRadioItem value="New Project">
                  ➕ New Project
                </DropdownMenuRadioItem>
                {project_list.map((project) => (
                  <DropdownMenuRadioItem key={project} value={project}>
                    {project}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {existingProject === "New Project" ? (
            <Input
              id="project name"
              type="text"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Project Name"
            />
          ) : (
            <div />
          )}
        </div>

        <DialogFooter>
          <Button
            type="submit"
            className="w-full"
            onClick={() => handleUpload()}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <CircularProgress size={20} color="inherit" />
              </div>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
