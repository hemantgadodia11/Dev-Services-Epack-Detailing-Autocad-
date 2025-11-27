"use client";
import React, {
  useEffect,
  useState,
  useRef,
  lazy,
  Suspense,
  useCallback,
  useMemo,
  CSSProperties,
} from "react";
import Navbar from "../../components/Navbar";
import CircularProgress from "@mui/material/CircularProgress";
import { useReactToPrint } from "react-to-print";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import { toast } from "react-hot-toast";

// Modify SvgWithTable to be more efficient
const SvgwithTable = lazy(() => import("@/components/SvgwithTable"));

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import baseURL from "@/utils/constants";

interface PhaseObject {
  [phase: string]: number;
}

interface BlockObject {
  image_url: string;
  parts: any[];
  phase: PhaseObject;
}

interface DataStructure {
  [group: string]: {
    [key: string]: BlockObject;
  };
}

interface Position {
  x: number;
  y: number;
  scale: number;
  zIndex: number;
}

export default function PartsTable() {
  const [data, setData] = useState<DataStructure>({});
  const [username, setUsername] = useState("");
  const contentRef = useRef<any>(null);
  const [phase, setPhase] = useState("PHASE_1");
  const [phaseList, setPhaseList] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [positions, setPositions] = useState<{ [key: string]: Position }>({});
  const [tableIndex, setTableIndex] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filename, setFilename] = useState("");
  const [printingAllBatches, setPrintingAllBatches] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);

  // Batch printing state
  const [batchPrinting, setBatchPrinting] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [totalBatches, setTotalBatches] = useState(1);
  const [shouldTriggerPrint, setShouldTriggerPrint] = useState(false);

  // Use itemsPerPage as the batchSize for consistency
  const batchSize = itemsPerPage;

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  // Prepare data as flat array for pagination
  const flattenedData = useMemo(() => {
    if (!data?.data) return [];
    return Object.entries(data.data).map(([key, value], index) => ({
      key,
      value,
      index
    })).sort((a, b) =>
      collator.compare(String(a?.["key"] ?? ""), String(b?.["key"] ?? ""))
    );
  }, [data]);


  // Calculate current page items
  const currentPageItems = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return flattenedData.slice(startIndex, endIndex);
  }, [flattenedData, page, itemsPerPage]);

  // Calculate current batch items for printing
  const currentBatchItems = useMemo(() => {
    if (!batchPrinting) return [];
    const startIndex = (currentBatch - 1) * batchSize;
    const endIndex = Math.min(startIndex + batchSize, flattenedData.length);
    return flattenedData.slice(startIndex, endIndex);
  }, [flattenedData, currentBatch, batchPrinting, batchSize]);

  // Update total pages when data changes
  useEffect(() => {
    if (flattenedData.length > 0) {
      setTotalPages(Math.ceil(flattenedData.length / itemsPerPage));
      setTotalBatches(Math.ceil(flattenedData.length / batchSize));
      // Reset to first page when data changes
      setPage(1);
    }
  }, [flattenedData, itemsPerPage, batchSize]);

  // This effect handles the batch printing sequence
  useEffect(() => {
    if (shouldTriggerPrint) {
      setShouldTriggerPrint(false);
      setTimeout(() => {
        handlePrintBatch();
      }, 500);
    }
  }, [shouldTriggerPrint]);

  const floatingButtonStyles = useMemo<CSSProperties>(
    () => ({
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 999,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }),
    []
  );

  const moveButtonStyles = useMemo<CSSProperties>(
    () => ({
      marginBottom: "10px",
      padding: "10px 20px",
      fontSize: "20px",
      backgroundColor: "rgba(255, 255, 255, 1)",
      color: "black",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      transition: "background-color 0.3s, transform 0.2s",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
    }),
    []
  );

  const handleSaveLayout = useCallback(async () => {
    if (!filename) return;
    try {
      const response = await fetch(
        `${baseURL}/save_layout?filename=${filename}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions }),
        }
      );

      response.status === 200
        ? toast.success("Layout saved successfully")
        : toast.error("Error saving layout");
    } catch (error) {
      toast.error("Unable to update Layout");
    }
  }, [positions, filename]);

  const handleExcelDownload = useCallback(async () => {
    if (!filename) return;
    try {
      const response = await fetch(
        `${baseURL}/download_boq?filename=${filename}&phase=${phase}`,
        {
          method: "GET",
        }
      );
      if (!response.ok) {
        toast.error("Error in downloading BOQ");
        throw new Error(`Error fetching file: ${response.statusText}`);
      }
      const contentDisposition = response.headers.get("Content-Disposition");
      let downloadFilename = "boq.xlsx";
      if (contentDisposition && contentDisposition.includes("filename=")) {
        downloadFilename = contentDisposition
          .split("filename=")[1]
          .trim()
          .replace(/"/g, "");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("BOQ downloaded successfully");
    } catch (error) {
      console.error("Error retrieving file:", error);
      toast.error("Couldn't download your file");
    }
  }, [phase, filename]);

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    setTableIndex("");

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Print current batch
  const handlePrintBatch = useReactToPrint({
    pageStyle: `@media print {
          @page { size: ${3508} ${2480}; margin: 0; }
          body { margin: 0; }
    }`,
    content: () => contentRef.current,
    documentTitle: `${filename || 'Partstable'}_${phase}_Batch${currentBatch}of${totalBatches}`,
    onBeforeGetContent: () =>
      new Promise((resolve) => {
        setBatchPrinting(true);
        setIsPrinting(true);
        if (!printingAllBatches) {
          toast.loading(`Preparing batch ${currentBatch} of ${totalBatches} for printing...`, {
            duration: 2000
          });
        } else {
          toast.loading(`Preparing batch ${currentBatch} of ${totalBatches}... (${Math.round((currentBatch / totalBatches) * 100)}% complete)`, {
            duration: 2000
          });
        }
        setTimeout(resolve, 2000);
      }),
    onAfterPrint: () => {
      setIsPrinting(false);

      if (printingAllBatches && currentBatch < totalBatches) {
        toast.success(`Batch ${currentBatch} printed successfully!`);

        // Schedule the next batch
        setCurrentBatch(prev => prev + 1);

        // Set flag to trigger print in the useEffect
        setShouldTriggerPrint(true);
      } else {
        setBatchPrinting(false);
        setPrintingAllBatches(false);

        if (printingAllBatches) {
          setCurrentBatch(1);
          toast.success("All batches have been printed successfully!");
        } else {
          toast.success(`Batch ${currentBatch} printed successfully!`);
        }
      }
    },
  });

  const printSpecificBatch = useCallback((batchNumber) => {
    setCurrentBatch(batchNumber);
    setBatchPrinting(true);
    setPrintingAllBatches(false);
    setShouldTriggerPrint(true);
  }, []);

  const printCurrentBatch = () => {
    const itemsOnCurrentPage = currentPageItems.length;
    if (itemsOnCurrentPage === 0) {
      toast.error("No items to print on current page");
      return;
    }

    const firstItemIndex = (page - 1) * itemsPerPage + 1;
    const batchNumber = Math.ceil(firstItemIndex / batchSize);

    toast.success(`Printing current batch (${itemsOnCurrentPage} items)`);
    printSpecificBatch(batchNumber);
  };

  const printAllBatches = () => {
    toast.success(`Starting to print all ${totalBatches} batches (${flattenedData.length} items)`);
    setCurrentBatch(1);
    setBatchPrinting(true);
    setPrintingAllBatches(true);
    setShouldTriggerPrint(true);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const storedFilename = localStorage.getItem("filename");
    if (!storedFilename) {
      setIsLoading(false);
      toast.error("No filename found in storage");
      return;
    }

    setFilename(storedFilename);
    const loadingToast = toast.loading("Loading data...");

    try {
      const [dataResponse, positionResponse] = await Promise.all([
        fetch(`${baseURL}/get_parts_info?filename=${storedFilename}`, {
          method: "GET",
        }),
        fetch(`${baseURL}/get_layout?filename=${storedFilename}`, {
          method: "GET",
        })
      ]);

      const positionData = await positionResponse.json();
      const table_metadata = positionData?.data?.table_metadata;

      if (table_metadata) {
        setPositions(table_metadata);
      }

      if (dataResponse.status === 200) {
        const json_body: DataStructure = await dataResponse.json();
        setData(json_body);

        const phases: string[] = [];
        const defaultPositions: { [key: string]: Position } = {};

        Object.entries(json_body).forEach(([_, blockGroup]) => {
          Object.entries(blockGroup).forEach(([key, value]) => {
            if (table_metadata === null) {
              defaultPositions[key] = { x: 0, y: 0, scale: 1, zIndex: 999 };
            }

            Object.entries(value.phase).forEach(([ph]) => {
              if (!phases.includes(ph)) phases.push(ph);
            });
          });
        });

        if (Object.keys(defaultPositions).length > 0) {
          setPositions(prevPos => ({ ...prevPos, ...defaultPositions }));
        }

        setPhaseList(phases);
        setPhase(phases[0] || "")
        toast.success("Data loaded successfully", { id: loadingToast });
      } else {
        toast.error("No such file exists in the Cloud", { id: loadingToast });
      }
    } catch (error) {
      console.error("Error retrieving file:", error);
      toast.error("Error loading data", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const user_name = localStorage.getItem("username") || "";
    setUsername(user_name);
    loadData();
  }, [loadData]);

  const increaseTableSize = useCallback(() => {
    if (tableIndex === "") {
      toast.error("No table selected. Please select a table first.");
      return;
    }
    if (positions[tableIndex]?.scale) {
      setPositions((prevPos) => ({
        ...prevPos,
        [tableIndex]: {
          ...prevPos[tableIndex],
          scale: Math.min(3, prevPos[tableIndex].scale + 0.05),
        },
      }));
    } else {
      setPositions((prevPos) => ({
        ...prevPos,
        [tableIndex]:
          { scale: 1.5, x: 48, y: 1130, zIndex: 10 },
      }));
    }

  }, [tableIndex, positions]);

  const decreaseTableSize = useCallback(() => {
    if (tableIndex === "") {
      toast.error("No table selected. Please select a table first.");
      return;
    }
    if (positions[tableIndex]?.scale) {
      setPositions((prevPos) => ({
        ...prevPos,
        [tableIndex]: {
          ...prevPos[tableIndex],
          scale: Math.max(0.5, prevPos[tableIndex].scale - 0.05),
        },
      }));
    } else {
      setPositions((prevPos) => ({
        ...prevPos,
        [tableIndex]:
          { scale: 1.5, x: 48, y: 1130, zIndex: 10 },
      }));
    }

  }, [tableIndex, positions]);

  const getGlobalIndex = useCallback((batchIndex, localIndex) => {
    return ((currentBatch - 1) * batchSize) + localIndex + 1;
  }, [currentBatch, batchSize]);

  return (
    <div className="bg-gray-200 min-h-screen flex flex-col">
      <Navbar is_parts_table={true} is_admin={username === "epack"} />

      {!isPrinting && !isLoading && flattenedData.length > itemsPerPage && (
        <div className="flex justify-center my-4 print:hidden">
          <Stack spacing={2}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              size="large"
              color="primary"
              showFirstButton
              showLastButton
            />
            <div className="text-center text-gray-600">
              Page {page} of {totalPages} ({flattenedData.length} items total)
            </div>
          </Stack>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <CircularProgress />
          <p className="ml-2">Loading data...</p>
        </div>
      ) : (
        <div
          style={{ zoom: 0.34 }}
          ref={contentRef}
          className="flex-1 flex-col print:my-0 gap-12 print:gap-0 my-12 flex justify-center items-center"
        >
          {isPrinting ? (
            batchPrinting ? (
              currentBatchItems.map(({ key, value, index }) => {
                const globalIndex = getGlobalIndex(currentBatch, index);
                return (
                  <div key={key} className="page-break-after">
                    <SvgwithTable
                      index={globalIndex}
                      block_name={key}
                      parts_object={value}
                      phase_qty={value.phase[phase] || 0}
                      pos={positions}
                      setTableIndex={setTableIndex}
                      tableIndex={tableIndex}
                    />
                  </div>
                );
              })
            ) : (
              flattenedData.map(({ key, value, index }) => (
                <div key={key} className="page-break-after">
                  <SvgwithTable
                    index={index + 1}
                    block_name={key}
                    parts_object={value}
                    phase_qty={value.phase[phase] || 0}
                    pos={positions}
                    setTableIndex={setTableIndex}
                    tableIndex={tableIndex}
                  />
                </div>
              ))
            )
          ) : (
            currentPageItems.map(({ key, value, index }) => {
              const globalIndex = (page - 1) * itemsPerPage + index + 1;
              return (
                <Suspense key={key} fallback={<div className="h-96 flex items-center justify-center"><CircularProgress /></div>}>
                  <>
                    <SvgwithTable
                      index={globalIndex}
                      block_name={key}
                      parts_object={value}
                      phase_qty={value.phase[phase] || 0}
                      pos={positions}
                      setTableIndex={setTableIndex}
                      tableIndex={tableIndex}
                    />
                  </>

                </Suspense>
              );
            })
          )}

          {isPrinting && batchPrinting && (
            <div className="print-only text-center text-lg font-bold mt-4 mb-8">
              {filename} - {phase} - Batch {currentBatch} of {totalBatches}
              (Items {(currentBatch - 1) * batchSize + 1} to {Math.min(currentBatch * batchSize, flattenedData.length)})
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls (Bottom) */}
      {!isPrinting && !isLoading && flattenedData.length > itemsPerPage && (
        <div className="flex justify-center my-4 print:hidden">
          <Stack spacing={2}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              size="large"
              color="primary"
              showFirstButton
              showLastButton
            />
          </Stack>
        </div>
      )}

      <div style={floatingButtonStyles} className="print:hidden">
        <button style={moveButtonStyles} onClick={handleSaveLayout}>
          Save Layout
        </button>
        <button style={moveButtonStyles} onClick={increaseTableSize}>
          +
        </button>
        <button style={moveButtonStyles} onClick={decreaseTableSize}>
          -
        </button>
        <button style={moveButtonStyles} onClick={printCurrentBatch}>
          Print Current Batch
        </button>
        <button style={moveButtonStyles} onClick={printAllBatches}>
          Print All Batches
        </button>
        <button style={moveButtonStyles} onClick={handleExcelDownload}>
          Download BOQ
        </button>
        <Dialog>
          <DialogTrigger asChild>
            <button style={moveButtonStyles}>Select Phase</button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Phase Selection</DialogTitle>
              <DialogDescription>Choose a phase from the list</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label htmlFor="phase-select" className="text-sm">
                Select Phase
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">{phase}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Select Phase</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={phase}
                    onValueChange={setPhase}
                  >
                    {phaseList.map((ph) => (
                      <DropdownMenuRadioItem key={ph} value={ph}>
                        {ph}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogContent>
        </Dialog>

        {/* Items Per Page Selector */}
        <select
          style={{
            ...moveButtonStyles,
            backgroundColor: "white",
            padding: "5px 10px"
          }}
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
        >
          <option value={1}>1 per page</option>
          <option value={3}>3 per page</option>
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
        </select>
      </div>

      {/* Display batch printing status with progress */}
      {batchPrinting && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white p-3 rounded-lg shadow-lg print:hidden">
          {printingAllBatches ? (
            <div>
              <div>Printing All Batches: {currentBatch} of {totalBatches}</div>
              <div>Progress: {Math.round((currentBatch / totalBatches) * 100)}%</div>
            </div>
          ) : (
            <div>
              Printing Batch: {currentBatch} of {totalBatches}
              (Items {(currentBatch - 1) * batchSize + 1} to {Math.min(currentBatch * batchSize, flattenedData.length)})
            </div>
          )}
        </div>
      )}

      {/* Selection indicator */}
      {tableIndex && (
        <div className="fixed bottom-5 left-5 bg-white p-3 rounded-lg shadow-lg print:hidden">
          Selected: {tableIndex.replace("mark_", "")}
        </div>
      )}
    </div>
  );
}