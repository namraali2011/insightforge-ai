"use client";
import Link from "next/link";
import { useDatasetStore } from "@/store/useDatasetStore";
import DatasetPreview from "@/components/upload/DatasetPreview";

export default function DatasetsPage() {
  const dataset = useDatasetStore(s => s.dataset);
  const clearDataset = useDatasetStore(s => s.clearDataset);
  return <div className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">Datasets</h1>
      <Link href="/upload" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">{dataset ? "Replace Dataset" : "Upload Dataset"}</Link>
    </div>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Session only: one active dataset. A successful upload replaces it and resets its dashboard.
      Refreshing or closing this tab clears all data, dashboard edits, and reports. Nothing is saved to a database.
      Export reports before refreshing.
    </p>
    {dataset ? <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div className="min-w-0"><h2 className="break-all font-semibold">{dataset.name}</h2>
          <p className="mt-1 text-sm text-slate-500">Uploaded {new Date(dataset.uploadedAt).toLocaleString()}</p></div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-lg border px-4 py-2 text-sm">Open Dashboard</Link>
          <button className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700" onClick={() => {
            if (window.confirm("Remove the active dataset and dashboard from this session? Existing report snapshots will remain until refresh.")) clearDataset();
          }}>Remove Dataset</button>
        </div>
      </div>
      {dataset.warnings.length > 0 && <section className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        <h2 className="font-semibold">Data quality warnings</h2>
        <ul className="mt-2 list-inside list-disc">{dataset.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
      </section>}
      <DatasetPreview key={dataset.id} dataset={dataset} />
    </> : <section className="rounded-xl border bg-white p-8 text-center">
      <h2 className="text-lg font-semibold">No dataset in this session</h2>
      <p className="mt-2 text-sm text-slate-500">Upload a CSV or XLSX file to inspect its columns and records. After a refresh, upload the original file again.</p>
    </section>}
  </div>;
}
