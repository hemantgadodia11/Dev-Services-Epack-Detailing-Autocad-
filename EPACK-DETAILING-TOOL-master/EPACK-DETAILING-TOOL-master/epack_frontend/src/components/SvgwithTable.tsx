"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  MRT_ColumnDef,
} from "material-react-table";
import { Button } from "@/components/ui/button";

interface PartsObject {
  parts: Record<string, any>[];
  image_url: string;
  phase: Record<string, number>;
}

interface Position {
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

interface SvgwithTableProps {
  block_name: string;
  parts_object: PartsObject;
  phase_qty: number;
  setTableIndex: any;
  tableIndex: any;
  pos: {
    [key: string]: Position;
  };
  index: number;
}

function ChunkTable({ data, columns, handleAddPart, block_name,isLast,grandTotals }) {
  const colsWithFooter = useMemo(() => {
    return columns.map((c) => {
      if (c.accessorKey === "QTY./BLDG.") {
        return { ...c, Footer: isLast ? "TOTAL" : undefined };
      }
      if (c.accessorKey === "Weight (kg)") {
        return {
          ...c,
          Footer: isLast ? (() => grandTotals.weight.toFixed(2)) : undefined,
        };
      }
      if (c.accessorKey === "Area (m2)") {
        return {
          ...c,
          Footer: isLast ? (() => grandTotals.area.toFixed(2)) : undefined,
        };
      }
      return c;
    });
  }, [columns, isLast, grandTotals]);

  const table = useMaterialReactTable({
    columns:colsWithFooter,
    data,
    enablePagination: false,
    enableColumnActions: false,
    enableToolbarInternalActions: false,
    onEditingRowSave: ({ table }) => {
      table.setEditingRow(null);
    },
    onCreatingRowSave: ({ values, table }) => {
      handleAddPart(values);
      table.setCreatingRow(null);
    },
    renderTopToolbarCustomActions: ({ table }) => (
      <div>
        <Button className="print-hidden" onClick={() => table.setCreatingRow(true)}>Add Item</Button>
      </div>
    ),
    renderBottomToolbarCustomActions: () => (
      <div className="text-[37px]">{block_name?.replace("mark_", "")}</div>
    ),
    muiTableProps: {
      sx: {
        caption: { captionSide: "top" },
        padding: "10px",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontStyle: "normal",
        fontWeight: "bold",
        fontSize: "22px",
        margin: 0,
        padding: "10px",
        width: "fit-content",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontStyle: "normal",
        fontWeight: "bold",
        fontSize: "22px",
        margin: 0,
        padding: "10px",
        width: "fit-content",
      },
    },
    muiTableFooterCellProps: {
      sx: {
        fontSize: "22px",
        color: "black",
        fontWeight: "bold",
      },
    },
  });
  return (<MaterialReactTable table={table} />)
}

function SvgwithTable({
  block_name,
  parts_object,
  phase_qty,
  setTableIndex,
  tableIndex,
  pos,
  index,
}: SvgwithTableProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const [data, setData] = useState(parts_object.parts.sort((a, b) =>
    collator.compare(String(a?.["Part Name"] ?? ""), String(b?.["Part Name"] ?? ""))
  ));

  const svgCacheRef = useRef<string | null>(null);

  const handleAddPart = useCallback((values: Record<string, any>) => {
    setData((prev) => [...prev, values].sort((a, b) =>
      collator.compare(String(a?.["Part Name"] ?? ""), String(b?.["Part Name"] ?? ""))
    ));
  }, []);


  const columns = useMemo<MRT_ColumnDef<Record<string, any>>[]>(
    () => [
      {
        accessorKey: "Part Name", header: "Part Name",
      },
      {
        accessorKey: "Length (mm)", header: "Length (mm)",
      },
      { accessorKey: "Width (mm)", header: "Width (mm)" },
      { accessorKey: "Thickness (mm)", header: "Thickness (mm)" },
      { accessorKey: "Quantity", header: "Quantity" },
      {
        accessorKey: "QTY./BLDG.",
        header: "QTY./BLDG.",
        Footer: "TOTAL",
        accessorFn: (row) => phase_qty * Number(row["Quantity"]),
      },
      {
        accessorKey: "Weight (kg)",
        header: "Weight (kg)",
        accessorFn: (row) =>
          (Number(row["Weight (kg)"]) * Number(row["Quantity"])).toFixed(2),
        Footer: ({ table }) => {
          const totalWeight = table
            .getPreFilteredRowModel()
            .rows.reduce((sum, row) => {
              return (
                sum +
                Number(row.original["Weight (kg)"]) *
                Number(row.original["Quantity"])
              );
            }, 0);
          return totalWeight.toFixed(2);
        },
      },
      {
        accessorKey: "Yield",
        header: "Yield",
      },
      {
        accessorKey: "Area (m2)",
        header: "Area (m2)",
        accessorFn: (row) => row["Area (m2)"] * row["Quantity"],
        Footer: ({ table }) => {
          const totalArea = table
            .getPreFilteredRowModel()
            .rows.reduce((sum, row) => {
              return sum + Number(row.original["Area (m2)"] || 0);
            }, 0);
          return totalArea.toFixed(2);
        },
      },
    ],
    [phase_qty]
  );

  const chunkArray = <T,>(arr: T[], size = 20): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };


  const dataChunks = chunkArray(data, 20);

  const grandTotals = useMemo(() => {
    const totals = data.reduce(
      (acc, row) => {
        const qty = Number(row["Quantity"] || 0);
        const wt = Number(row["Weight (kg)"] || 0);
        const area = Number(row["Area (m2)"] || 0);
        acc.weight += wt * qty;
        acc.area += area * qty;          // note: multiply by Quantity
        return acc;
      },
      { weight: 0, area: 0 }
    );
    return {
      weight: Number(totals.weight.toFixed(2)),
      area: Number(totals.area.toFixed(2)),
    };
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgContent = parts_object.image_url;

    if (!svgCacheRef.current) {
      canvas.width = 3508;
      canvas.height = 2480;
      setCanvasSize({ width: canvas.width, height: canvas.height });

      const svgBlob = new Blob([svgContent], {
        type: "image/svg+xml;charset=utf-8",
      });
      const URLObj = window.URL || window.webkitURL;
      const blobURL = URLObj.createObjectURL(svgBlob);
      svgCacheRef.current = blobURL;
    }

    const img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0);
    };
    img.src = svgCacheRef.current || "";
  }, [parts_object, phase_qty]);

  const isSelected = tableIndex === block_name;

  return (
    <div
      style={{
        position: "relative",
        width: canvasSize.width,
        height: canvasSize.height,
      }}
      className="p-0 m-0"
    >
      <canvas ref={canvasRef} />
      <div className="absolute top-0 print:hidden right-0 text-black text-8xl font-bold bg-white px-10 py-3 rounded-lg border-4 border-black">
        {index}
      </div>
      <div
        style={{
          transform: `scale(${pos[block_name]?.scale || 1})`,
          transformOrigin: "top left",
          width: "fit-content",
          transition: "all 0.2s",
        }}
        className={`absolute top-5 left-8 flex cursor-pointer ${isSelected ? "z-10 print:border-0 print:shadow-none" : ""
          } ${isSelected
            ? "border-4 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.6)] print:border-0 print:shadow-none"
            : ""
          }`}
        onClick={() => { setTableIndex(block_name) }}
      >
        {dataChunks?.map((data, index) => <ChunkTable key={block_name + String(index)} data={data} columns={columns} handleAddPart={handleAddPart} block_name={block_name} isLast={index === dataChunks?.length - 1} grandTotals={grandTotals}/>)}
      </div>
    </div>
  );
}

export default React.memo(SvgwithTable);