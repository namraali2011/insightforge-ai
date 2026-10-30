
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  LayoutDashboard,
  UploadCloud,
  X,
} from "lucide-react";

import DatasetPreview from "@/components/upload/DatasetPreview";

import {
  MAX_FILE_SIZE,
  MAX_ROWS,
  profileColumns,
} from "@/lib/csv-utils";

import { parseExcelFile } from "@/lib/excel-utils";

import { useDatasetStore } from "@/store/useDatasetStore";

import type {
  DataRow,
  Dataset,
} from "@/types/dataset";

function parseCSVFile(file: File): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    Papa.parse<DataRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      worker: false,

      // Keep the Stage 2 DataCloneError fix.
      transformHeader: (header) => header.trim(),

      complete: (results) => {
        const fields = results.meta.fields ?? [];
        const rows = results.data;

        if (!fields.length || !rows.length) {
          reject(
            new Error(
              "No usable data was found in the CSV."
            )
          );
          return;
        }

        if (rows.length > MAX_ROWS) {
          reject(
            new Error(
              `This demo supports up to ${MAX_ROWS.toLocaleString()} rows.`
            )
          );
          return;
        }

        if (results.errors.length > 0) {
          reject(
            new Error(
              `CSV parsing error: ${results.errors[0].message}`
            )
          );
          return;
        }

        if (fields.some((field) => !field.trim())) {
          reject(
            new Error(
              "The CSV contains empty column headers."
            )
          );
          return;
        }

        if (new Set(fields).size !== fields.length) {
          reject(
            new Error(
              "The CSV contains duplicate column headers."
            )
          );
          return;
        }

        const cleanedRows: DataRow[] = rows.map(
          (row) =>
            Object.fromEntries(
              fields.map((field) => [
                field,
                String(row[field] ?? ""),
              ])
            )
        );

        const columns = profileColumns(
          cleanedRows,
          fields
        );

        const warnings: string[] = [];

        if (results.meta.renamedHeaders) {
          warnings.push(
            "Papa Parse renamed duplicate CSV headers automatically. Review the column names."
          );
        }

        if (
          columns.some(
            (column) => column.missingCount > 0
          )
        ) {
          warnings.push(
            "Missing values were detected in the dataset."
          );
        }

        if (
          columns.some(
            (column) => column.type === "empty"
          )
        ) {
          warnings.push(
            "Some columns contain only empty values."
          );
        }

        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          rows: cleanedRows,
          columns,
          rowCount: cleanedRows.length,
          uploadedAt: new Date().toISOString(),
          warnings,
        });
      },

      error: (error) => {
        reject(error);
      },
    });
  });
}

export default function UploadPage() {
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);

  const [dataset, setLocalDataset] =
    useState<Dataset | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const saveDataset = useDatasetStore(
    (state) => state.setDataset
  );

  const clearStoredDataset = useDatasetStore(
    (state) => state.clearDataset
  );

  async function processFile(file: File) {
    if (loading) return;

    setError("");
    setLocalDataset(null);
    // Retain the current dataset until its replacement parses successfully.

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (
      extension !== "csv" &&
      extension !== "xlsx"
    ) {
      setError(
        "Unsupported format. Please upload a CSV or XLSX file."
      );
      return;
    }

    if (file.size === 0) {
      setError("The selected file is empty.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "File exceeds the 5 MB size limit."
      );
      return;
    }

    setLoading(true);

    try {
      let newDataset: Dataset;

      if (extension === "csv") {
        newDataset = await parseCSVFile(file);
      } else {
        newDataset = await parseExcelFile(file);
      }

      setLocalDataset(newDataset);
      saveDataset(newDataset);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to read the uploaded file.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      void processFile(file);
    }

    event.target.value = "";
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragging(false);

    if (loading) return;

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void processFile(file);
    }
  }

  function clearDataset() {
    setLocalDataset(null);
    clearStoredDataset();

    setError("");
    setDragging(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function generateDashboard() {
    if (!dataset) return;

    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Upload Dataset
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          One active dataset is kept in memory. A successful upload replaces it; refreshing clears it. Upload CSV or Excel data, inspect its
          structure, and generate an interactive
          dashboard.
        </p>
      </div>

      {/* File upload area */}
      <div
        onDragOver={(event) => {
          event.preventDefault();

          if (!loading) {
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 bg-white"
        }`}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
          <UploadCloud
            size={30}
            className="text-indigo-600"
          />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Upload your business data
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Drag and drop a CSV or Excel file, or choose
          one from your computer.
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            CSV
          </span>

          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            XLSX
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload CSV or Excel file"
        />

        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Processing File..."
            : "Choose Data File"}
        </button>

        <p className="mt-3 text-xs text-slate-400">
          CSV or XLSX • Maximum 5 MB • Up to 10,000
          data rows
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle
            size={20}
            className="shrink-0"
          />

          <p>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          role="status"
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700"
        >
          Parsing the file and detecting column types...
        </div>
      )}

      {/* Loaded dataset */}
      {dataset && (
        <>
          {/* Success notification */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2
                size={23}
                className="text-emerald-600"
              />

              <FileSpreadsheet
                size={22}
                className="text-emerald-700"
              />

              <div>
                <h3 className="font-semibold text-emerald-900">
                  Dataset loaded successfully
                </h3>

                <p className="mt-1 text-sm text-emerald-700">
                  {dataset.name}
                </p>

                <p className="text-xs text-emerald-700">
                  {dataset.rowCount.toLocaleString()} rows
                  {" • "}
                  {dataset.columns.length} columns
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearDataset}
              className="flex items-center gap-2 rounded-lg border border-emerald-300 px-4 py-2 text-sm text-emerald-800 hover:bg-emerald-100"
            >
              <X size={16} />
              Clear Dataset
            </button>
          </div>

          {/* Data quality warnings */}
          {dataset.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-900">
                Data Quality Warnings
              </h3>

              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
                {dataset.warnings.map(
                  (warning, index) => (
                    <li key={index}>{warning}</li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Dashboard generation */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
            <div>
              <div className="flex items-center gap-2">
                <LayoutDashboard
                  size={21}
                  className="text-indigo-600"
                />

                <h3 className="font-semibold text-indigo-900">
                  Your dataset is ready!
                </h3>
              </div>

              <p className="mt-2 text-sm text-indigo-700">
                Generate KPI cards, charts, and
                interactive filters from this dataset.
              </p>

              <p className="mt-1 text-xs text-indigo-600">
                Rule-based dashboard generation
              </p>
            </div>

            <button
              type="button"
              onClick={generateDashboard}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <LayoutDashboard size={18} />
              Generate Dashboard
            </button>
          </div>

          {/* Existing data preview */}
          <DatasetPreview dataset={dataset} />
        </>
      )}
    </div>
  );
}
