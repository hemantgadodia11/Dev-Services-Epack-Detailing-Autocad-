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
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleArrowUp, CloudUpload, Search } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
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

const NUMERIC_FIELDS: { key: string; label: string }[] = [
  { key: "number_of_kits", label: "Number of Kits" },
  { key: "iso_kg", label: "ISO (in Kg)" },
  { key: "polyol_kg", label: "Polyol (in Kg)" },
  { key: "camlock_male", label: "Camlock Set (Male)" },
  { key: "camlock_female", label: "Camlock Set (Female)" },
  { key: "baker_oil_ltr", label: "BAKER OIL IN LTR." },
  { key: "wall_panel_qty_sqm", label: "Wall Panel Qty. Sqr Mtr" },
  { key: "ceiling_panel_qty_sqm", label: "Ceiling Panel Qty. Sqr. Mtr." },
  { key: "roof_panel_qty_sqm", label: "Roof Panel Qty. Sqr. Mtr." },
  { key: "roof_sheet_qty_sqm", label: "Roof Sheet Qty. Sqr. Mtr." },
  { key: "floor_slab_qty_sqm", label: "Floor Slab Qty.Sqr.Mtr" },
  { key: "deck_sheet_qty_sqm", label: "Deck Sheet Qty.Sqr.Mtr" },
  { key: "floor_panel_qty_sqm", label: "Floor Panel Qty. Sqr. Mtr" },
  { key: "ppgi_top_weight", label: "PPGI Sheet - Top (Weight)" },
  { key: "ppgi_bottom_weight", label: "PPGI Sheet - Bottom (Weight)" },
  { key: "wall_sheet_qty_sqm", label: "Wall Sheet Qty. Sqr. Mtr." },
];

export function PanelDxf({ project_list }) {
  const router = useRouter();

  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [existingProject, setExistingProject] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [jobCardNo, setJobCardNo] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [clientName, setClientName] = useState("");
  const [detailerName, setDetailerName] = useState("");
  const [numericValues, setNumericValues] = useState<Record<string, string>>({});

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return project_list;
    }
    return project_list.filter((project) =>
      project.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [project_list, searchQuery]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files && event.target.files.length > 0) {
      const filetemp = event.target.files[0];
      const size = Math.round((filetemp.size / (1000 * 1024)) * 100) / 100;
      setUploadedFile({ name: filetemp.name, size, type: filetemp.type });
      setFile(filetemp);
    }
  };

  const handleNumericChange = (key: string, value: string) => {
    setNumericValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpload = async (): Promise<void> => {
    if (!uploadedFile) {
      alert("Please select a file to upload");
      return;
    }
    if (uploadedFile.name.split(".").pop() !== "dxf") {
      alert("Please upload a .dxf file");
      return;
    }

    if (newProjectName === "" && existingProject === "") {
      alert("Please select the project Name");
      return;
    }
    if (
      existingProject === "New Project" &&
      (newProjectName.trim() === "" || newProjectName === "New Project")
    ) {
      alert("Please enter proper project name");
      return;
    }
    if (jobCardNo.trim() === "") {
      alert("Please enter Job Card No.");
      return;
    }
    if (buildingType.trim() === "") {
      alert("Please enter Building Type");
      return;
    }
    if (clientName.trim() === "") {
      alert("Please enter Client Name");
      return;
    }
    if (detailerName.trim() === "") {
      alert("Please enter Detailer Name");
      return;
    }

    for (const field of NUMERIC_FIELDS) {
      const raw = numericValues[field.key];
      if (raw !== undefined && raw.trim() !== "" && isNaN(Number(raw))) {
        alert(`Please enter a valid number for ${field.label}`);
        return;
      }
    }

    const formData = new FormData();
    formData.append("file", file as File);
    formData.append("username", localStorage.getItem("username")!);
    formData.append("job_card_no", jobCardNo);
    formData.append("building_type", buildingType);
    formData.append("client_name", clientName);
    formData.append("detailer_name", detailerName);
    NUMERIC_FIELDS.forEach((field) => {
      formData.append(field.key, numericValues[field.key] || "0");
    });

    if (newProjectName === "") {
      formData.append("projectName", existingProject);
    } else {
      formData.append("projectName", newProjectName);
      try {
        const response = await fetch(`${baseURL}/add_project`, {
          method: "POST",
          body: JSON.stringify({
            username: [localStorage.getItem("username")],
            projectname: [newProjectName],
            isnew: true,
          }),
          headers: { "content-type": "application/json" },
        });
        if (response.status !== 200) {
          alert("Bad request please re-check the form");
          return;
        }
      } catch {
        alert("cant create a new project");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`${baseURL}/upload-panel`, {
        method: "POST",
        body: formData,
      });

      if (response.status === 200) {
        const data = await response.json();
        localStorage.setItem("panel_rows", JSON.stringify(data.rows));
        localStorage.setItem("job_card", JSON.stringify(data.job_card));
        router.push("/panel_parts_table");
      } else {
        alert("Please upload a dxf file with proper format");
      }
    } catch (error) {
      alert("Unable to upload your panel dxf file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="w-[436px] cursor-pointer p-[20px] border border-gray-300 rounded-md shadow-sm flex items-center gap-3">
          <div className="p-[12px] border border-gray-300 rounded-md shadow-sm">
            <CircleArrowUp size={16} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-gray-700 text-[16px] font-semibold">
              Panel DXF
            </h1>
            <h1 className="text-[14px] font-normal text-gray-600">
              Generate Panel BOQ
            </h1>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Panel Job Card</DialogTitle>
          <DialogDescription>
            Fill in the job card details and upload the panel DXF file.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job_card_no" className="text-sm">
                Job Card No.
              </Label>
              <Input
                id="job_card_no"
                type="text"
                value={jobCardNo}
                onChange={(event) => setJobCardNo(event.target.value)}
                placeholder="J25/5801"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="building_type" className="text-sm">
                Building Type
              </Label>
              <Input
                id="building_type"
                type="text"
                value={buildingType}
                onChange={(event) => setBuildingType(event.target.value)}
                placeholder="Prefab"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client_name" className="text-sm">
                Client Name
              </Label>
              <Input
                id="client_name"
                type="text"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Client Name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detailer_name" className="text-sm">
                Detailer Name
              </Label>
              <Input
                id="detailer_name"
                type="text"
                value={detailerName}
                onChange={(event) => setDetailerName(event.target.value)}
                placeholder="Detailer Name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {NUMERIC_FIELDS.map((field) => (
              <div className="flex flex-col gap-1.5" key={field.key}>
                <Label htmlFor={field.key} className="text-sm">
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  type="text"
                  value={numericValues[field.key] || ""}
                  onChange={(event) =>
                    handleNumericChange(field.key, event.target.value)
                  }
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 justify-center w-full">
            <label
              htmlFor="panel-dropzone-file"
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
              id="panel-dropzone-file"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {uploadedFile && (
            <div className="mt-1">
              <p className="text-sm text-gray-600">{uploadedFile.name}</p>
              <p className="text-sm text-gray-600">{uploadedFile.size} MB</p>
            </div>
          )}

          <Label htmlFor="panel-project" className="text-sm">
            Select Project
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {existingProject || "Select a project"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
              <DropdownMenuLabel>Select Project</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <div className="p-2 sticky top-0 bg-white">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuRadioGroup
                value={existingProject}
                onValueChange={setExistingProject}
                className="max-h-40 overflow-y-auto"
              >
                <DropdownMenuRadioItem value="New Project">
                  ➕ New Project
                </DropdownMenuRadioItem>

                <DropdownMenuSeparator />

                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <DropdownMenuRadioItem key={project} value={project}>
                      {project}
                    </DropdownMenuRadioItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    No projects found
                  </div>
                )}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {existingProject === "New Project" ? (
            <Input
              id="panel-new-project-name"
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
