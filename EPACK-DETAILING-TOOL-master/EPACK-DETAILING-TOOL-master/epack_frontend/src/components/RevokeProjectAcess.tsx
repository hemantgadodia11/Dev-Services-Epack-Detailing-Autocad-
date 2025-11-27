
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
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuCheckboxItem,
  } from "@/components/ui/dropdown-menu";
  import { Button } from "@/components/ui/button";
  import { BookX } from "lucide-react";
  import { Label } from "@/components/ui/label";
  import { useState } from "react";
import baseURL from "@/utils/constants";
import { CircularProgress } from "@mui/material";
  
  // Define the types for your props
  interface ProjectAccess {
    username: string;
    projects: string[]; // Updated to string[]
  }
  
  interface RevokeProjectAccessProps {
    project_acess_list: ProjectAccess[];
    refresh_trgger: () => void;
  }
  
  export default function RevokeProjectAcess({
    project_acess_list,
    refresh_trgger,
  }: RevokeProjectAccessProps) {
    // Define types for states
    const [userName, setUsername] = useState<string>("");
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [projectOpen,setProjectOpen]=useState(false)
    const [loading,setLoading]=useState(false)

  
    // Filter projects based on the selected username
    const filteredProjects = project_acess_list.filter(
      (project) => project["username"] === userName
    );
  
    // Handle project selection toggling
    const handleProjectSelection = (project: string) => {
      setSelectedProjects((prevSelected) =>
        prevSelected.includes(project)
          ? prevSelected.filter((p) => p !== project)
          : [...prevSelected, project]
      );
    };



    const handleRevokeAcess = async (): Promise<void> => {
      setLoading(true)
        try{
            const response = await fetch(
              `${baseURL}/remove_project_access`,
              {
                headers:{'content-type': 'application/json'},
                method: "DELETE",
                body: JSON.stringify({"username":[userName],"projectname":selectedProjects})
              }  
            );
      
            if (response.status===200){
              alert("Revoked acess suceesfully")
      
            }else{
              alert("Some error occuerd")
              
            }
          }catch{
            
            alert("Not able to revoke the access right now")
          }
          finally{
            setSelectedProjects([])
            setUsername("")
            setLoading(false)
            refresh_trgger()


          }

    }
  
    return (
      <Dialog onOpenChange={()=>setProjectOpen(false)}>
        <DialogTrigger asChild>
          <div className="w-[436px] cursor-pointer p-[20px] border border-gray-300 rounded-md shadow-sm flex items-center gap-3">
            <div className="p-[12px] border border-gray-300 rounded-md shadow-sm">
              <BookX size={16} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-gray-700 text-[16px] font-semibold">Revoke access</h1>
              <h1 className="text-[14px] font-normal text-gray-600">
                Revoke Access of a project from an existing user
              </h1>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="">Revoke access</DialogTitle>
            <DialogDescription className="">
              Revoke Access of a project from an existing user
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="project" className="text-sm">
              Select Username
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{userName || "Select a username"}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                <DropdownMenuLabel>Username</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={userName} onValueChange={(value)=>{
                    setSelectedProjects([])
                    setUsername(value)

                }}>
                  {project_acess_list.map((project_access_user) => (
                    <DropdownMenuRadioItem
                      key={project_access_user["username"]}
                      value={project_access_user["username"]}
                    >
                      {project_access_user["username"]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
  
            <Label htmlFor="username" className="text-sm">
              Select Project
            </Label>
            <DropdownMenu open={projectOpen} >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" onClick={()=>setProjectOpen((prev)=>!prev)}>
                  {selectedProjects.length > 0
                    ? `${selectedProjects.length} projects selected`
                    : "Select projects"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                <DropdownMenuLabel>Project</DropdownMenuLabel>
                <DropdownMenuSeparator  />
  
                {filteredProjects.length > 0 &&
                  filteredProjects[0].projects.map((project) => (
                    <DropdownMenuCheckboxItem 
                      key={project}
                      checked={selectedProjects.includes(project)}
                      onCheckedChange={() => handleProjectSelection(project)}
                    >
                      {project}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
  
          <DialogFooter>
            <Button
              type="submit"
              className="w-full"
              onClick={handleRevokeAcess}
            >
               {loading ? <CircularProgress size={20} color="inherit" /> : "Revoke Acess"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  
