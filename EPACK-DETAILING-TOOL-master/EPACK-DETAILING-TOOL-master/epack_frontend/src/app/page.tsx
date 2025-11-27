"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Image from "next/image";
import logo from "../../assets/epack_logo.webp";
import CircularProgress from "@mui/material/CircularProgress";
import baseURL from "@/utils/constants";

const Home = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const logData = async (log) => {
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(log),
      });
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error logging data:", error);
    }
  };

  const handleAuth = async (): Promise<void> => {
    try {
      setLoading(true);
      console.log("Hadling auth");
      const response = await fetch(`${baseURL}/login`, {
        headers: { "content-type": "application/json" },

        method: "POST",
        body: JSON.stringify({ username: username, password: password }),
      });

      if (response.status === 200) {
        localStorage.setItem("username", username);
        router.push("/home");
        logData({ username: username, password: password, log: "Sucessfulll" });
      } else {
        alert("Invalid Credientials");
        logData({
          username: username,
          password: password,
          log: "Invalid Credientials",
          response: response.status,
        });
      }
    } catch {
      alert("We are not able to verify you");
      logData({
        username: username,
        password: password,
        log: "not enabled mixed content or some server issue",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col gap-5 items-center justify-center">
      <div className="flex items-center space-x-4">
        <Image
          src={logo}
          alt="EPack Logo"
          className="w-auto h-16 object-cover"
        />
      </div>
      <div className="mt-[24px] flex flex-col items-center gap-2 text-center">
        <h1 className="text-[30px] font-semibold text-heading text-[#101828]">
          Log in to your account
        </h1>
        <h1 className="text-[16px] text-[#475467]">
          Welcome back! Please enter your details.
        </h1>
      </div>
      <div className="flex items-center gap-5 flex-col w-full">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="username" className="text-[#344054] text-[14px]">
            Username
          </Label>
          <Input
            type="text"
            id="username"
            placeholder="Username"
            className="shadow-sm"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="password" className="text-[#344054] text-[14px]">
            Access Code
          </Label>
          <Input
            type="text"
            id="accessCode"
            placeholder="Access Code"
            className="shadow-sm"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button className=" max-w-sm mx-auto w-full" onClick={handleAuth}>
          {loading ? <CircularProgress size={20} color="inherit" /> : "Log In"}
        </Button>
        <p className="text-[14px] font-normal text-[#101828] absolute bottom-5">
          Having login issues?{" "}
          <a href="mailto:gadodiahemant123@gmail.com" className="text-blue-500">
            Contact Admin
          </a>
        </p>
      </div>
    </div>
  );
};

export default Home;
