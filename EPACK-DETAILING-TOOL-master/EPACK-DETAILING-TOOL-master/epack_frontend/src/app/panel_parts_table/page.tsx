"use client";
import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";
import jsPDF from "jspdf";
import ExcelJS from "exceljs";
import logoImg from "../../../assets/epack_logo.webp";

interface PanelRow {
  row_number: number;
  Category: string;
  "Item Type": string;
  "Sub Part": string;
  Unit: string;
  Qty: number;
  "Camlock Type": string;
  Width: number;
  Length: number;
  Thickness: number;
  Camlok: string;
  "Set Remarks": string;
}

interface JobCard {
  job_card_no: string;
  building_type: string;
  client_name: string;
  detailer_name: string;
  project_name: string;
  number_of_kits: number;
  iso_kg: number;
  polyol_kg: number;
  camlock_male: number;
  camlock_female: number;
  baker_oil_ltr: number;
  wall_panel_qty_sqm: number;
  ceiling_panel_qty_sqm: number;
  roof_panel_qty_sqm: number;
  roof_sheet_qty_sqm: number;
  floor_slab_qty_sqm: number;
  deck_sheet_qty_sqm: number;
  floor_panel_qty_sqm: number;
  ppgi_top_weight: number;
  ppgi_bottom_weight: number;
  wall_sheet_qty_sqm: number;
}

type FieldRef = { label: string; key: keyof JobCard } | null;

// Mirrors the printed Job Card layout exactly: 3 label/value pairs per row,
// some rows only use 1 or 2 pairs.
const JOB_CARD_GRID: [FieldRef, FieldRef, FieldRef][] = [
  [
    { label: "Job Card No.", key: "job_card_no" },
    { label: "Building Type", key: "building_type" },
    null,
  ],
  [
    { label: "Client Name", key: "client_name" },
    { label: "Number of Kits", key: "number_of_kits" },
    null,
  ],
  [
    { label: "ISO (in Kg)", key: "iso_kg" },
    { label: "Wall Panel Qty. Sqr Mtr", key: "wall_panel_qty_sqm" },
    { label: "BAKER OIL IN LTR.", key: "baker_oil_ltr" },
  ],
  [
    { label: "Polyol (in Kg)", key: "polyol_kg" },
    { label: "Ceiling Panel Qty. Sqr. Mtr.", key: "ceiling_panel_qty_sqm" },
    { label: "PPGI Sheet - Top (Weight)", key: "ppgi_top_weight" },
  ],
  [
    { label: "Camlock Set (Male)", key: "camlock_male" },
    { label: "Roof Panel Qty. Sqr. Mtr.", key: "roof_panel_qty_sqm" },
    { label: "PPGI Sheet - Bottom (Weight)", key: "ppgi_bottom_weight" },
  ],
  [
    { label: "Camlock Set (Female)", key: "camlock_female" },
    { label: "Roof Sheet Qty. Sqr. Mtr.", key: "roof_sheet_qty_sqm" },
    { label: "Wall Sheet Qty. Sqr. Mtr.", key: "wall_sheet_qty_sqm" },
  ],
  [
    { label: "Detailer Name", key: "detailer_name" },
    { label: "Floor Slab Qty.Sqr.Mtr", key: "floor_slab_qty_sqm" },
    null,
  ],
  [null, { label: "Deck Sheet Qty.Sqr.Mtr", key: "deck_sheet_qty_sqm" }, null],
  [
    null,
    { label: "Floor Panel Qty. Sqr. Mtr", key: "floor_panel_qty_sqm" },
    null,
  ],
];

const PANEL_COLUMNS: { key: keyof PanelRow; header: string; width: number }[] = [
  { key: "Category", header: "Category", width: 30 },
  { key: "Item Type", header: "Item Type", width: 30 },
  { key: "Sub Part", header: "Sub Part", width: 20 },
  { key: "Unit", header: "Unit", width: 16 },
  { key: "Qty", header: "Qty", width: 14 },
  { key: "Camlock Type", header: "Camlock Type", width: 24 },
  { key: "Width", header: "Width", width: 20 },
  { key: "Length", header: "Length", width: 20 },
  { key: "Thickness", header: "Thickness", width: 22 },
  { key: "Camlok", header: "Camlok Set", width: 20 },
  { key: "Set Remarks", header: "Remarks", width: 61 },
];

const EXCEL_COL_WIDTHS = [14, 20, 11, 8, 7, 14, 8, 8, 10, 11, 24];

const REPORT_TITLE = "Quantity & Raw Material Consumption Report";

const BLUE_ARGB = "FF1F4E79";
const LIGHT_BLUE_ARGB = "FFDCE6F1";
const YELLOW_ARGB = "FFFFC000";
const WHITE_ARGB = "FFFFFFFF";

const BLUE_RGB: [number, number, number] = [31, 78, 121];
const LIGHT_BLUE_RGB: [number, number, number] = [220, 230, 241];
const YELLOW_RGB: [number, number, number] = [255, 192, 0];
const BORDER_RGB: [number, number, number] = [180, 180, 180];

const columns = [
  { accessorKey: "Category", header: "Category" },
  { accessorKey: "Item Type", header: "Item Type" },
  { accessorKey: "Sub Part", header: "Sub Part" },
  { accessorKey: "Unit", header: "Unit" },
  { accessorKey: "Qty", header: "Qty" },
  { accessorKey: "Camlock Type", header: "Camlock Type" },
  { accessorKey: "Width", header: "Width" },
  { accessorKey: "Length", header: "Length" },
  { accessorKey: "Thickness", header: "Thickness" },
  { accessorKey: "Camlok", header: "Camlok Set" },
  { accessorKey: "Set Remarks", header: "Remarks" },
];

function loadLogoDataUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load logo image"));
    img.src = logoImg.src;
  });
}

const Page = () => {
  const [username, setUsername] = useState("");
  const [rows, setRows] = useState<PanelRow[]>([]);
  const [jobCard, setJobCard] = useState<JobCard | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem("username") as string);

    const storedRows = localStorage.getItem("panel_rows");
    if (storedRows) {
      setRows(JSON.parse(storedRows));
    }

    const storedJobCard = localStorage.getItem("job_card");
    if (storedJobCard) {
      setJobCard(JSON.parse(storedJobCard));
    }
  }, []);

  const table = useMaterialReactTable({
    columns,
    data: rows,
  });

  const fileBaseName = `panel_boq_${(jobCard?.job_card_no || "job_card").replace(
    /[^a-z0-9]/gi,
    "_"
  )}`;

  const reportDateLabel = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  const handleDownloadXlsx = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Panel BOQ");

    sheet.columns = EXCEL_COL_WIDTHS.map((width) => ({ width }));

    const fill = (argb: string): ExcelJS.Fill => ({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb },
    });
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFB7B7B7" } },
      left: { style: "thin", color: { argb: "FFB7B7B7" } },
      bottom: { style: "thin", color: { argb: "FFB7B7B7" } },
      right: { style: "thin", color: { argb: "FFB7B7B7" } },
    };

    // Row 1 is the title row; the job card form occupies rows 2..(JOB_CARD_GRID.length + 1).
    const formStartRow = 2;
    const totalHeaderRows = 1 + JOB_CARD_GRID.length;

    // Logo box (A1:B{n})
    sheet.mergeCells(1, 1, totalHeaderRows, 2);
    sheet.getCell(1, 1).fill = fill(WHITE_ARGB);
    sheet.getCell(1, 1).border = thinBorder;

    // Title band (C1:I1)
    sheet.mergeCells(1, 3, 1, 9);
    const titleCell = sheet.getCell(1, 3);
    titleCell.value = REPORT_TITLE;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = fill(YELLOW_ARGB);
    titleCell.border = thinBorder;

    // Date box (J1:K{n})
    sheet.mergeCells(1, 10, totalHeaderRows, 11);
    const dateCell = sheet.getCell(1, 10);
    dateCell.value = reportDateLabel;
    dateCell.font = { bold: true, size: 14, color: { argb: WHITE_ARGB } };
    dateCell.alignment = { horizontal: "center", vertical: "middle" };
    dateCell.fill = fill(BLUE_ARGB);
    dateCell.border = thinBorder;

    JOB_CARD_GRID.forEach((rowDef, i) => {
      const r = formStartRow + i;
      const bandColor = i % 2 === 0 ? WHITE_ARGB : LIGHT_BLUE_ARGB;
      const [p1, p2, p3] = rowDef;

      for (let c = 3; c <= 9; c++) {
        const cell = sheet.getCell(r, c);
        cell.fill = fill(bandColor);
        cell.border = thinBorder;
        cell.font = { size: 9 };
        cell.alignment = { vertical: "middle" };
      }

      const label1Cell = sheet.getCell(r, 3);
      const value1Cell = sheet.getCell(r, 4);
      if (p1) {
        label1Cell.value = p1.label;
        label1Cell.font = { italic: true, bold: true, size: 9 };
        value1Cell.value = jobCard ? (jobCard[p1.key] as any) : "";
      }

      sheet.mergeCells(r, 5, r, 6);
      const label2Cell = sheet.getCell(r, 5);
      if (p2) {
        label2Cell.value = p2.label;
        label2Cell.font = { italic: true, bold: true, size: 9 };
      }

      if (p3) {
        const value2Cell = sheet.getCell(r, 7);
        if (p2) value2Cell.value = jobCard ? (jobCard[p2.key] as any) : "";
        const label3Cell = sheet.getCell(r, 8);
        const value3Cell = sheet.getCell(r, 9);
        label3Cell.value = p3.label;
        label3Cell.font = { italic: true, bold: true, size: 9 };
        value3Cell.value = jobCard ? (jobCard[p3.key] as any) : "";
      } else {
        sheet.mergeCells(r, 7, r, 9);
        const value2Cell = sheet.getCell(r, 7);
        if (p2) value2Cell.value = jobCard ? (jobCard[p2.key] as any) : "";
      }
    });

    // Blank separator row
    const sepRow = totalHeaderRows + 1;
    for (let c = 1; c <= PANEL_COLUMNS.length; c++) {
      sheet.getCell(sepRow, c).fill = fill(WHITE_ARGB);
    }

    // Table header row
    const tableHeaderRow = sepRow + 1;
    PANEL_COLUMNS.forEach((col, idx) => {
      const cell = sheet.getCell(tableHeaderRow, idx + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: WHITE_ARGB }, size: 10 };
      cell.fill = fill(BLUE_ARGB);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    });

    // Data rows
    rows.forEach((row, rIdx) => {
      const excelRow = tableHeaderRow + 1 + rIdx;
      PANEL_COLUMNS.forEach((col, cIdx) => {
        const cell = sheet.getCell(excelRow, cIdx + 1);
        cell.value = (row[col.key] as any) ?? "";
        cell.font = { size: 9 };
        cell.border = thinBorder;
      });
    });

    try {
      const base64 = await loadLogoDataUrl();
      const imageId = workbook.addImage({ base64, extension: "png" });
      const logoAspect = logoImg.width / logoImg.height;
      const imgWidthPx = 150;
      sheet.addImage(imageId, {
        tl: { col: 0.15, row: 0.15 },
        ext: { width: imgWidthPx, height: imgWidthPx / logoAspect },
        editAs: "oneCell",
      });
    } catch (e) {
      console.error("Failed to embed logo in xlsx", e);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const marginX = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - marginX * 2;

    let logoDataUrl: string | null = null;
    try {
      logoDataUrl = await loadLogoDataUrl();
    } catch (e) {
      console.error("Failed to load logo for PDF", e);
    }
    const logoAspect = logoImg.width / logoImg.height;

    const logoW = 40;
    const dateW = 35;
    const middleW = usableWidth - logoW - dateW;
    const formColWidths = [26, 30, 48, 30, 34, 34];
    const titleRowH = 9;
    const formRowH = 9;
    const headerBlockH = titleRowH + formRowH * JOB_CARD_GRID.length;
    const tableHeaderRowH = 7;
    const dataRowH = 6.5;

    const drawHeaderBlock = (): number => {
      const top = 12;

      doc.setDrawColor(...BORDER_RGB);
      doc.rect(marginX, top, logoW, headerBlockH);
      if (logoDataUrl) {
        const pad = 3;
        const maxW = logoW - pad * 2;
        const maxH = headerBlockH - pad * 2;
        let imgW = maxW;
        let imgH = imgW / logoAspect;
        if (imgH > maxH) {
          imgH = maxH;
          imgW = imgH * logoAspect;
        }
        const imgX = marginX + (logoW - imgW) / 2;
        const imgY = top + (headerBlockH - imgH) / 2;
        doc.addImage(logoDataUrl, "PNG", imgX, imgY, imgW, imgH);
      }

      const titleX = marginX + logoW;
      doc.setFillColor(...YELLOW_RGB);
      doc.rect(titleX, top, middleW, titleRowH, "F");
      doc.setDrawColor(...BORDER_RGB);
      doc.rect(titleX, top, middleW, titleRowH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(REPORT_TITLE, titleX + middleW / 2, top + titleRowH / 2 + 1.5, {
        align: "center",
      });

      const dateX = titleX + middleW;
      doc.setFillColor(...BLUE_RGB);
      doc.rect(dateX, top, dateW, headerBlockH, "F");
      doc.setDrawColor(...BORDER_RGB);
      doc.rect(dateX, top, dateW, headerBlockH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(reportDateLabel, dateX + dateW / 2, top + headerBlockH / 2, {
        align: "center",
      });

      let rowY = top + titleRowH;
      JOB_CARD_GRID.forEach((rowDef, i) => {
        const bandColor = i % 2 === 0 ? [255, 255, 255] : LIGHT_BLUE_RGB;
        doc.setFillColor(bandColor[0], bandColor[1], bandColor[2]);
        doc.rect(titleX, rowY, middleW, formRowH, "F");

        const [p1, p2, p3] = rowDef;
        const colXs = [titleX];
        formColWidths.forEach((w) => colXs.push(colXs[colXs.length - 1] + w));

        doc.setTextColor(0, 0, 0);
        const textY = rowY + 3.4;

        if (p1) {
          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(6.5);
          doc.text(p1.label, colXs[0] + 1.5, textY, {
            maxWidth: formColWidths[0] - 2.5,
          });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.text(String(jobCard ? jobCard[p1.key] : ""), colXs[1] + 1.5, textY, {
            maxWidth: formColWidths[1] - 2.5,
          });
        }
        if (p2) {
          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(6.5);
          doc.text(p2.label, colXs[2] + 1.5, textY, {
            maxWidth: formColWidths[2] - 2.5,
          });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          const value2Width = p3
            ? formColWidths[3]
            : formColWidths[3] + formColWidths[4] + formColWidths[5];
          doc.text(String(jobCard ? jobCard[p2.key] : ""), colXs[3] + 1.5, textY, {
            maxWidth: value2Width - 2.5,
          });
        }
        if (p3) {
          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(6.5);
          doc.text(p3.label, colXs[4] + 1.5, textY, {
            maxWidth: formColWidths[4] - 2.5,
          });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.text(String(jobCard ? jobCard[p3.key] : ""), colXs[5] + 1.5, textY, {
            maxWidth: formColWidths[5] - 2.5,
          });
        }

        doc.setDrawColor(...BORDER_RGB);
        doc.rect(titleX, rowY, middleW, formRowH);
        rowY += formRowH;
      });

      return top + headerBlockH;
    };

    const drawTableHeader = (startY: number): number => {
      let x = marginX;
      doc.setFillColor(...BLUE_RGB);
      PANEL_COLUMNS.forEach((col) => {
        doc.rect(x, startY, col.width, tableHeaderRowH, "F");
        x += col.width;
      });
      x = marginX;
      doc.setDrawColor(...BORDER_RGB);
      PANEL_COLUMNS.forEach((col) => {
        doc.rect(x, startY, col.width, tableHeaderRowH);
        x += col.width;
      });
      x = marginX;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      PANEL_COLUMNS.forEach((col) => {
        doc.text(col.header, x + col.width / 2, startY + tableHeaderRowH / 2 + 1, {
          align: "center",
          maxWidth: col.width - 2,
        });
        x += col.width;
      });
      return startY + tableHeaderRowH;
    };

    let y = drawHeaderBlock();
    y += 4;
    y = drawTableHeader(y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    rows.forEach((row) => {
      if (y + dataRowH > pageHeight - 12) {
        doc.addPage();
        let newY = drawHeaderBlock();
        newY += 4;
        y = drawTableHeader(newY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
      }
      let x = marginX;
      doc.setDrawColor(...BORDER_RGB);
      PANEL_COLUMNS.forEach((col) => {
        doc.rect(x, y, col.width, dataRowH);
        const value = row[col.key];
        doc.text(String(value ?? ""), x + 1.5, y + dataRowH / 2 + 1, {
          maxWidth: col.width - 3,
        });
        x += col.width;
      });
      y += dataRowH;
    });

    doc.save(`${fileBaseName}.pdf`);
  };

  return (
    <div>
      <Navbar is_parts_table={true} is_admin={username === "epack"} />
      <div className="max-w-6xl mx-auto mt-14">
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => handleDownloadPdf()}
              disabled={rows.length === 0}
            >
              <FileText size={16} />
              Download PDF
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => handleDownloadXlsx()}
              disabled={rows.length === 0}
            >
              <FileSpreadsheet size={16} />
              Download XLSX
            </Button>
          </div>

          <h1 className="text-4xl font-bold mb-3">Panel BOQ</h1>

          {jobCard && (
            <div className="grid grid-cols-3 gap-4 p-4 border border-gray-300 rounded-md shadow-sm">
              <div>
                <p className="text-sm text-gray-500">Job Card No.</p>
                <p className="font-semibold">{jobCard.job_card_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Client Name</p>
                <p className="font-semibold">{jobCard.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Building Type</p>
                <p className="font-semibold">{jobCard.building_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Detailer Name</p>
                <p className="font-semibold">{jobCard.detailer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Number of Kits</p>
                <p className="font-semibold">{jobCard.number_of_kits}</p>
              </div>
            </div>
          )}

          <div>
            <MaterialReactTable table={table} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
