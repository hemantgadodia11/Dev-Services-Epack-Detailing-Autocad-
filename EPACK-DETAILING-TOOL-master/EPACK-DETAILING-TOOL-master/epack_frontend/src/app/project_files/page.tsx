"use client";
import Navbar from "@/components/Navbar";
import { CircleArrowUp, Ellipsis, FileBarChart2 } from "lucide-react";
import { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { useRouter } from "next/navigation";
import baseURL from "@/utils/constants";

const ProjectFiles = () => {
  const [loading, setLoading] = useState(false);
  const [filesList, setFilesList] = useState([]);
  const [username, setUsername] = useState("");
  const router = useRouter();

  const loadData = async (): Promise<void> => {
    setLoading(true);
    const projectname = localStorage.getItem("projectname");
    try {
      const response = await fetch(
        `${baseURL}/get_project_files`,
        {
           headers: {
           "Content-Type": "application/json"
         },
          method: "POST",
          body: JSON.stringify({projectname:projectname})
        }
      );
      if (response.status == 200) {
        const json_body = await response.json();

        console.log(json_body);
        setFilesList(json_body["data"] === null ? ([]) : (json_body["data"]));
      } else {
        alert("No such user exists");
      }
    } catch (error) {
      alert("Unable to fetch project file List");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const user_name = localStorage.getItem("username") as string;
    setUsername(user_name);
    loadData();
  }, []);
  return (
    <div>
      <Navbar
        is_parts_table={false}
        is_admin={username === "epack" ? true : false}
      />
      <div className="max-w-6xl mx-auto mt-14">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold">Project Files</h1>

          {loading ? <CircularProgress /> : <div className="mb-5">
            {filesList.length > 0 ? (
              filesList.map((file) => (
                <div
                  key={file["hashed_file_name"]}
                  className="w-full border border-gray-300 p-[16px] flex items-center justify-between mb-4 cursor-pointer"
                  onClick={() => {
                    localStorage.setItem("filename", file["hashed_file_name"]);
                    localStorage.setItem("table_metadata", JSON.stringify(file["table_metadata"]))
                    router.push("/parts_table");
                  }}
                >
                  <div className="flex items-center gap-5">
                    <div className="p-[25px] border bg-slate-100 border-gray-300 rounded-md shadow-sm">
                      <FileBarChart2 size={25} />
                    </div>
                    <div className="flex flex-col">
                      <h1 className="text-black text-[15px] underline font-semibold">
                        {file["original_file_name"]}
                      </h1>
                      <h1 className="text-gray-800 text-[15px]">
                        {file["username"]}

                      </h1>
                      <h1 className="text-gray-500 text-[12px]">
                        {file["time"]}

                      </h1>

                    </div>
                    {/* <div className="flex flex-col">
                      <h1 className="text-gray-700 text-[20px] font-semibold">
                        {file["orginal_file_name"]}
                      </h1>
                    </div> */}
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full p-[16px] flex items-center justify-center">
                <h1 className="text-gray-500 text-[20px] font-semibold">
                  No files available
                </h1>
              </div>
            )}
          </div>}

        </div>
      </div>
    </div>
  );
};

export default ProjectFiles;
