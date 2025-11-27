"use client";
import DeleteProject from "@/components/DeleteProject";
import Navbar from "@/components/Navbar";
import { ProjectAssign } from "@/components/ProjectAssign";
import { RegisterUser } from "@/components/RegisterUser";
import RevokeProjectAcess from "@/components/RevokeProjectAcess";
import baseURL from "@/utils/constants";
import InventoryAccess from "@/components/InventoryAccess";
import RevokeInventoryAccess from "@/components/RevokeInventoryAccess";

import { useEffect, useState } from "react";



export default function AdminPanel(){
    const [allProjectList,setAllProjectList]=useState([])
    const [allUsersList,setAllUsersList]=useState([])
    const [projectAcessList,setProjectAcessList]=useState([])
    const [username,setUsername]=useState("")
    const [triggerRerender, setTriggerRerender] = useState(false)

    const loadData = async () => {
    
        const user_name = localStorage.getItem("username") as string
        //get projects    
        try {
          const response = await fetch(
            `${baseURL}/get_projects?username=${user_name}`,
            {
              method: "GET",
            }
          );
          if (response.status == 200) {
            const json_body = await response.json();
            console.log(json_body)
            setAllProjectList(json_body["project_list"])

            
            
          }else{
            alert("No such user exists")
          }
        } catch (error) {
          alert("Unable to fetch project List")
        }finally{
          
        }  
        //get all users
        try {
            const response = await fetch(
              `${baseURL}/get_all_users`,
              {
                method: "GET",
              }
            );
            if (response.status == 200) {
              const json_body = await response.json();
              console.log(json_body)
              setAllUsersList(json_body["data"])
  
              
              
            }else{
              alert("Some error occuered")
            }
          } catch (error) {
            alert("Unable to fetch User List")
          }finally{
            
          }

          try {
            const response = await fetch(
              `${baseURL}/get_project_access_list`,
              {
                method: "GET",
              }
            );
            if (response.status == 200) {
              const json_body = await response.json();
              console.log(json_body)
              setProjectAcessList(json_body["data"])
  
              
              
            }else{
              alert("unable to fetch the list")
            }
          } catch (error) {
            alert("Unable to fetch project List")
          }finally{
            
          }



      };

      const handleRerender = () => {
        setTriggerRerender((prev) => !prev); // Toggle the state to cause rerender
    };



    useEffect(()=>{
        loadData()

        const user_name=localStorage.getItem("username") as string
        setUsername(user_name)

    },[triggerRerender])
   

    return(<div>
        <Navbar is_parts_table={false} is_admin={username==='epack'?(true):(false)}/>
        <div className="max-w-6xl mx-auto mt-14">
        <div className="flex flex-col zgap-4 mb-5">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <div className="grid grid-cols-2 gap-4">
            <RegisterUser refresh_trigger={handleRerender}/>
            <ProjectAssign project_list={allProjectList} user_list={allUsersList} refresh_trigger={handleRerender} project_acess_list={projectAcessList}/>
            <RevokeProjectAcess project_acess_list={projectAcessList} refresh_trgger={handleRerender}  />
            <DeleteProject project_list={allProjectList} refresh_trigger={handleRerender}/>
            <InventoryAccess user_list={allUsersList} refresh_trigger={handleRerender}/>
            <RevokeInventoryAccess user_list={allUsersList} refresh_trigger={handleRerender}/>
            
            
          </div>
          
        </div>
        </div>
        
        </div>
    )
}