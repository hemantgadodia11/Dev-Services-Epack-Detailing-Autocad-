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
import { FolderKanban } from "lucide-react";
import { Label } from "@/components/ui/label";
import {  useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import baseURL from "@/utils/constants";

export function ProjectAssign({ project_list, user_list,refresh_trigger ,project_acess_list}) {
 
  const [projects,setProjects]=useState<{ [key: string]: boolean }>({})
  const [username,setUsername]=useState<string|undefined>(undefined)
  const [projectOpen, setProjectOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  
  
  const filteredProjects = project_acess_list.filter(
    (project) => project["username"] === username
  );

  const nonAccessProjects = project_list.filter(
    (project)=> filteredProjects.length > 0 && filteredProjects[0].projects.includes(project)==false
  );


  const handleAssign = async (): Promise<void> => {
    
    let us_list:string[]=[]
    let pro_list:string[]=[]

    console.log(projects)


    Object.keys(projects).forEach(key=>{
       if (projects[key]===true){
        pro_list.push(key)
        console.log(key)
       }
    })

    if (username !== undefined) {
       us_list.push(username);
    }


   console.log("users",us_list)
   console.log("project",pro_list)


    

    if (us_list.length===0||pro_list.length===0){
        alert("Please populate all the feilds")
        return
    }

    

    setLoading(true);
    try{
      const response = await fetch(
        `${baseURL}/add_project`,
        {
          headers:{'content-type': 'application/json'},
          method: "POST",
          body: JSON.stringify({"username":us_list,"projectname":pro_list,"isnew":false})
        }  
      );

      if (response.status===200){
        alert("Project Assigned Succcesfully")

      }else{
        alert("Project already assigned")
        
      }
    }catch{
      
      alert("Not able to assign the project try again later")
    }
    finally{
      setLoading(false)
      refresh_trigger()
      setProjects({})
      setUsername(undefined)

    }
   
  }

  return (
    <Dialog onOpenChange={()=>{
      setProjectOpen(false)
      setUserOpen(false)
    }}>
      <DialogTrigger asChild >
        <div className="w-[436px] cursor-pointer p-[20px] border border-gray-300 rounded-md shadow-sm flex items-center gap-3">
          <div className="p-[12px] border border-gray-300 rounded-md shadow-sm">
            <FolderKanban size={16} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-gray-700 text-[16px] font-semibold">
              Assign Project
            </h1>
            <h1 className="text-[14px] font-normal text-gray-600">
              Assign project to a exisitng user
            </h1>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="">Assign Project</DialogTitle>
          <DialogDescription className="">
            Assign project to a exisitng user
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="username" className="text-sm">
            Select Username
          </Label>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{username || "Select a username"}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                <DropdownMenuLabel>Username</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={username} onValueChange={(value)=>{
                    setUsername(value)
                    console.log(filteredProjects)

                }}>
                  {user_list.map((user) => (
                    <DropdownMenuRadioItem
                      key={user}
                      value={user}
                    >
                      {user}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>


          <Label htmlFor="project" className="text-sm">
            Select Project
          </Label>
          <DropdownMenu open={projectOpen} >
      <DropdownMenuTrigger asChild >
        <Button variant="outline" onClick={()=>setProjectOpen((prev)=>!prev)} ></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
        <DropdownMenuLabel>Projects Acess to this user</DropdownMenuLabel>
        <DropdownMenuSeparator />
       
        
          {filteredProjects.length > 0 &&
            filteredProjects[0].projects.map((project) => (
              <DropdownMenuLabel
                key={project}
                
              >
                {project}
              </DropdownMenuLabel>
            ))}

       <DropdownMenuSeparator />





       

          

        
        
        {nonAccessProjects.map((project_name) => (
            <DropdownMenuCheckboxItem
              key={project_name}
              checked={projects[project_name]}
              onCheckedChange={(e) => {
                setProjects((prevProjects) => ({
                  ...prevProjects,
                  [project_name]: !prevProjects[project_name],
                }));
                console.log(project_name);

              }}
            >
              {project_name}
            </DropdownMenuCheckboxItem>
          ))}
        
       
      </DropdownMenuContent>
    </DropdownMenu >
          
   </div>

        <DialogFooter>
          <Button
            type="submit"
            className="w-full"
            onClick={ handleAssign}
          >
             {loading ? <CircularProgress size={20} color="inherit" /> : "Assign Projects"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
