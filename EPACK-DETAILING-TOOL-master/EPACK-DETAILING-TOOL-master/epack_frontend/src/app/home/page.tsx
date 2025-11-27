"use client";
import Navbar from "@/components/Navbar";
import { ProjectSelection } from "@/components/ProjectSelection";
import { UploadFile } from "@/components/UploadFile";
import React, { useState, useEffect } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Button } from "@/components/ui/button";
import baseURL from "@/utils/constants";
import DeleteIcon from "@mui/icons-material/Delete";

import { Box, CircularProgress, IconButton, Tooltip } from "@mui/material";
const Page = () => {
  const [projectList, setProjectList] = useState([]);
  const [username, setUsername] = useState("");
  const [tableData, setTableData] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [inventoryAccess, setInventoryAccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const columns = [
    {
      accessorKey: "itemDescription",
      header: "ITEMS DESCRIPTION",
    },
    {
      accessorKey: "grade",
      header: "Grade",
    },
    {
      accessorKey: "thickness",
      header: "THICKNESS",
    },

    {
      accessorKey: "weightPerMeter",
      header: "WEIGHT/METER (KG)",
    },
  ];

  const loadData = async () => {
    const user_name = localStorage.getItem("username") as string;
    try {
      const response = await fetch(
        `${baseURL}/get_projects?username=${user_name}`,
        {
          method: "GET",
        }
      );
      if (response.status == 200) {
        const json_body = await response.json();
        console.log(json_body);
        setProjectList(json_body["project_list"]);

        setInventoryAccess(json_body["invetory_access"]);
      } else {
        alert("No such user exists");
      }
    } catch (error) {
      alert("Unable to fetch project List");
    } finally {
    }

    try {
      const response = await fetch(`${baseURL}/get_inventory_list`, {
        method: "GET",
      });
      if (response.status == 200) {
        const json_body = await response.json();
        console.log(json_body);
        setTableData(json_body["data"]);
      } else {
        alert("Invalid Inventory Request");
      }
    } catch (error) {
      alert("Unable to fetch Inventory List");
    } finally {
    }
  };

  useEffect(() => {
    const user_name = localStorage.getItem("username") as string;
    setUsername(user_name);
    loadData();
  }, [refreshTrigger]);

  const handleCreateItem = async (values) => {
    setLoading(true);
    try {
      const response = await fetch(`${baseURL}/add_inventory_item`, {
        headers: { "content-type": "application/json" },
        method: "POST",
        body: JSON.stringify(values),
      });
      if (response.status == 200) {
        const json_body = await response.json();
        console.log(json_body);
      } else {
        alert("Couldnt able to add the item");
      }
    } catch (error) {
      alert("Unable to add the the item");
    } finally {
      setLoading(false);
      setRefreshTrigger((prev) => !prev);
    }
  };

  const handleDeleteItem = async (values) => {
    setLoading(true);
    try {
      const response = await fetch(`${baseURL}/delete_inventory_item`, {
        headers: { "content-type": "application/json" },
        method: "DELETE",
        body: JSON.stringify(values),
      });
      if (response.status == 200) {
        const json_body = await response.json();
        console.log(json_body);
      } else {
        alert("Couldnt able to add the item");
      }
    } catch (error) {
      alert("Unable to add the the item");
    } finally {
      setLoading(false);
      setRefreshTrigger((prev) => !prev);
    }
  };

  const table = useMaterialReactTable({
    columns,
    data: tableData,
    onCreatingRowSave: ({ values, table }) => {
      handleCreateItem(values);
      table.setCreatingRow(null);
    },
    enableRowActions: true,
    renderRowActions: ({ row, table }) => (
      <Box sx={{ display: "flex", flexWrap: "nowrap" }}>
        <Tooltip title="Delete">
          <IconButton
            color="error"
            onClick={() => {
              handleDeleteItem(row.original);
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    state: {
      isLoading: loading,
      showProgressBars: loading,
    },
    renderTopToolbarCustomActions: ({ table }) => (
      <Button
        onClick={() => {
          table.setCreatingRow(true);
        }}
      >
        {loading ? <CircularProgress size={20} color="inherit" /> : "AddItem"}{" "}
      </Button>
    ),
  });

  return (
    <div>
      <Navbar is_parts_table={false} is_admin={username === "epack"} />
      <div className="max-w-6xl mx-auto mt-14">
        <div className="flex flex-col gap-4 mb-5">
          <h1 className="text-4xl font-bold mb-3">Welcome</h1>
          <div className="grid grid-cols-2 gap-4">
            <UploadFile project_list={projectList} />
            <ProjectSelection project_list={projectList} />
          </div>
          {inventoryAccess ? (
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-bold">Inventory Management</h1>
              <div>
                <MaterialReactTable table={table} />
              </div>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
