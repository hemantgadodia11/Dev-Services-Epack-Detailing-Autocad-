
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
      DropdownMenuSeparator,
      DropdownMenuTrigger,
      DropdownMenuRadioGroup,
      DropdownMenuRadioItem,
     
      
  } from "@/components/ui/dropdown-menu";
  import { Button } from "@/components/ui/button";
  import {  Warehouse } from "lucide-react";
  import { Label } from "@/components/ui/label";
  import {  useState } from "react";
import baseURL from "@/utils/constants";
import { CircularProgress } from "@mui/material";

export default function InventoryAccess({user_list,refresh_trigger}){

    const [user,setUser]=useState("")
    const [loading,setLoading]=useState(false)

    const handleInventoryAcesss = async (): Promise<void> => {

      setLoading(true)
        try{
            const response = await fetch(
              `${baseURL}/update_inventory_access`,
              {
                headers:{'content-type': 'application/json'},
                method: "POST",
                body: JSON.stringify({"username":[user]})
                
              }  
            );
      
            if (response.status===200){
              alert("Sucessfully gave Access to the Inventory")
      
            }else{
              alert("BAD request")
              
            }
          }catch{
            
            alert("Unable to give inventory access as of right now")
          }
          finally{

            setUser("")
            setLoading(false)
            refresh_trigger()


          }

    }

 return (
    <Dialog>
        <DialogTrigger asChild >
          <div className="w-[436px] cursor-pointer p-[20px] border border-gray-300 rounded-md shadow-sm flex items-center gap-3">
            <div className="p-[12px] border border-gray-300 rounded-md shadow-sm">
              <Warehouse size={16} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-gray-700 text-[16px] font-semibold">
               Inventory Access
              </h1>
              <h1 className="text-[14px] font-normal text-gray-600">
                Give Inventory Access to a user
              </h1>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="">Inventory Access</DialogTitle>
            <DialogDescription className="">
            Update Inventory Access
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="project" className="text-sm">
              Select User
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{user || "Select a User"}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                <DropdownMenuLabel>Users</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={user} onValueChange={(value)=>{
                    setUser(value)

                }}>
                  {user_list.map((project) => (
                    <DropdownMenuRadioItem
                      key={project}
                      value={project}
                    >
                      {project}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            
          </div>
  
          <DialogFooter>
            <Button
              type="submit"
              className="w-full"
              onClick={handleInventoryAcesss}
            >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Give Inventory Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 )

}