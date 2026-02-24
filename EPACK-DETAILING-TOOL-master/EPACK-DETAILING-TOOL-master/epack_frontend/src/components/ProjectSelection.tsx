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

import { CircleArrowUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ProjectSelection({ project_list }) {
  const router = useRouter();

  const [existingProject, setExistingProject] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return project_list;
    }
    return project_list.filter((project) =>
      project.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [project_list, searchQuery]);

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
            Select from the existing Project
          </DialogDescription>
        </DialogHeader>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {existingProject || "Select a project"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-96 max-h-[350px]">
            <DropdownMenuLabel className="">Select Project</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Search Box */}
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
            
            <div className="max-h-[200px] overflow-y-auto">
              <DropdownMenuRadioGroup
                value={existingProject}
                onValueChange={setExistingProject}
              >
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
            </div>
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