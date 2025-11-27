"use client";
import React from "react";
import { Button } from "./ui/button";
import {
  OctagonAlert,
  DatabaseZap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import logo from "../../assets/epack_logo.webp";

const Navbar = ({ is_parts_table, is_admin }) => {
  const router = useRouter();
  return (
    <div className="flex bg-white border-b shadow-sm p-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
        <Image
          src={logo}
          alt="EPack Logo"
          className="w-auto h-12 object-cover"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              window.location.href = "https://forms.gle/kex9fL6V5jngzrfL7";
            }}
          >
            
            <OctagonAlert
              style={{
                color: "red",
              }}
            />
          </Button>



          {is_admin ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                router.push("/admin_panel");
              }}
            >
              <DatabaseZap className="h-[20px] w-[20px] text-gray-500" />
            </Button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
