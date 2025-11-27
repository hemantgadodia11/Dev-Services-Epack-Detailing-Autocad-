import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { create } from "zustand";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const useStore = create((set) => ({
  excelLink: "",
  setExcelLink: (link) => set({ excelLink: link }),
}));
