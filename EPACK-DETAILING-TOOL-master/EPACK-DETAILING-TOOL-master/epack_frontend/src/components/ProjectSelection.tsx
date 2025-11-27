"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CircleArrowUp, CloudUpload, Plus, WatchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ProjectSelection({ project_list }) {
  const router = useRouter();

  const [existingProject, setExistingProject] = useState("");

  const handleClick = async (): Promise<void> => {
    if (existingProject === "") {
      alert("please select a project");
      return;
    }
    localStorage.setItem("projectname", existingProject);
    router.push("/project_files");
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
              Select Existing Projects
            </h1>
            <h1 className="text-[14px] font-normal text-gray-600">
              Generate BOQ from existing files
            </h1>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="">Select Project name</DialogTitle>
          <DialogDescription className="">
            Select from the exsting Project
          </DialogDescription>
        </DialogHeader>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{existingProject}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-96 max-h-[300px] overflow-y-auto">
            <DropdownMenuLabel className="">Select Project</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuRadioGroup
              value={existingProject}
              onValueChange={setExistingProject}
            >
              {project_list.map((project) => (
                <DropdownMenuRadioItem key={project} value={project}>
                  {project}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DialogFooter>
          <Button type="submit" className="w-full" onClick={handleClick}>
            Show Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
