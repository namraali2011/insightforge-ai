
"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Database,
  Hash,
  Table2,
  Search,
} from "lucide-react";

import type {
  Dataset,
  ColumnType,
} from "@/types/dataset";

interface Props {
  dataset: Dataset;
}

const PAGE_SIZE = 10;

const typeLabels: Record<ColumnType, string> = {
  number: "Number",
  date: "Date",
  boolean: "Boolean",
  text: "Text",
  empty: "Empty",
};

export default function DatasetPreview({
  dataset,
}: Props) {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(
    null
  );
  const [sortDirection, setSortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const [page, setPage] = useState(1);

  const numericCount = dataset.columns.filter(
    (column) => column.type === "number"
  ).length;

  const missingCells = dataset.columns.reduce(
    (total, column) => total + column.missingCount,
    0
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    const matched = dataset.rows.filter((row) =>
      dataset.columns.some((column) =>
        (row[column.name] ?? "")
          .toLowerCase()
          .includes(term)
      )
    );

    if (!sortColumn) return matched;

    const type = dataset.columns.find(
      (column) => column.name === sortColumn
    )?.type;

    return [...matched].sort((a, b) => {
      const left = a[sortColumn] ?? "";
      const right = b[sortColumn] ?? "";

      // Keep missing values at the end.
      if (!left.trim() && !right.trim()) return 0;
      if (!left.trim()) return 1;
      if (!right.trim()) return -1;

      let comparison: number;

      if (type === "number") {
        comparison = Number(left) - Number(right);
      } else {
        comparison = left.localeCompare(right, undefined, {
          numeric: false,
          sensitivity: "base",
        });
      }

      return sortDirection === "asc"
        ? comparison
        : -comparison;
    });
  }, [
    dataset,
    search,
    sortColumn,
    sortDirection,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection((previous) =>
        previous === "asc" ? "desc" : "asc"
      );
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

    setPage(1);
  }

  const stats = [
    {
      label: "Total Rows",
      value: dataset.rowCount.toLocaleString(),
      icon: Table2,
    },
    {
      label: "Columns",
      value: dataset.columns.length.toString(),
      icon: Database,
    },
    {
      label: "Numeric Columns",
      value: numericCount.toString(),
      icon: Hash,
    },
    {
      label: "Missing Cells",
      value: missingCells.toLocaleString(),
      icon: Search,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Dataset Preview
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {dataset.name} — {dataset.rowCount.toLocaleString()} rows
        </p>
      </div>

      {/* Dataset statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {stat.label}
                </p>
                <Icon size={19} className="text-indigo-600" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Column profiles */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900">
            Column Analysis
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Automatically detected field types and quality.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3">Column</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Unique</th>
                <th className="px-5 py-3">Missing</th>
                <th className="px-5 py-3">Examples</th>
              </tr>
            </thead>

            <tbody>
              {dataset.columns.map((column) => {
                const missingPercent = dataset.rowCount
                  ? (
                      (column.missingCount /
                        dataset.rowCount) *
                      100
                    ).toFixed(1)
                  : "0.0";

                return (
                  <tr
                    key={column.name}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {column.name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {typeLabels[column.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {column.uniqueCount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      {missingPercent}%
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-slate-500">
                      {column.sampleValues.join(", ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h3 className="font-semibold text-slate-900">
              Data Records
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Search and sort your uploaded records.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search all columns..."
              aria-label="Search dataset rows"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">#</th>
                {dataset.columns.map((column) => (
                  <th key={column.name} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort(column.name)}
                      className="flex items-center gap-2 font-medium hover:text-indigo-600"
                    >
                      {column.name}
                      {sortColumn !== column.name ? (
                        <ArrowUpDown size={14} />
                      ) : sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((row, index) => (
                <tr
                  key={(currentPage - 1) * PAGE_SIZE + index}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-400">
                    {(currentPage - 1) * PAGE_SIZE + index + 1}
                  </td>

                  {dataset.columns.map((column) => (
                    <td
                      key={column.name}
                      className="max-w-xs truncate px-4 py-3 text-slate-700"
                      title={row[column.name] ?? ""}
                    >
                      {row[column.name] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRows.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No matching records found.
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
          <p className="text-sm text-slate-500">
            {filteredRows.length.toLocaleString()} matching records
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-600">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
