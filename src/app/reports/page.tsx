"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Download,
  FileText,
  Trash2,
} from "lucide-react";

import { useDatasetStore } from "@/store/useDatasetStore";
import { useDashboardPlanStore } from "@/store/useDashboardPlanStore";
import { useReportStore } from "@/store/useReportStore";

import { createFallbackPlan } from "@/lib/dashboard-plan";
import type { Report } from "@/lib/reports";

import { ReportDocument } from "@/components/reports/ReportDocument";

import {
  GenerateReportButton,
  ReportGenerationStatus,
} from "@/components/reports/GenerateReportButton";

export default function ReportsPage() {
  const dataset = useDatasetStore(
    (state) => state.dataset
  );

  const savedPlan = useDashboardPlanStore(
    (state) => state.plan
  );

  const savedId = useDashboardPlanStore(
    (state) => state.datasetId
  );

  const reports = useReportStore(
    (state) => state.reports
  );

  const removeReport = useReportStore(
    (state) => state.removeReport
  );

  const [selectedId, setSelectedId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const selected =
    reports.find(
      (report) => report.id === selectedId
    ) ?? reports[0];

  const activePlan = dataset
    ? savedId === dataset.id && savedPlan
      ? savedPlan
      : createFallbackPlan(dataset)
    : null;

  async function download(report: Report) {
    if (!report.narrative) return;

    setDownloading(true);
    setError("");

    try {
      const { downloadReportPDF } =
        await import("@/lib/report-pdf");

      await downloadReportPDF(report);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "PDF download failed."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="if-reports-page space-y-6">
      <div className="if-page-heading">
        <div>
          <span className="if-eyebrow">
            <FileText size={15} />
            AI REPORTS
          </span>

          <h1>Business reports</h1>

          <p>
            KPI explanations and chart summaries are
            generated together.
          </p>
        </div>

        <GenerateReportButton
          dataset={dataset}
          plan={activePlan}
          disabled={downloading}
          label="Generate report from all records"
          onCreated={setSelectedId}
        />
      </div>

      <ReportGenerationStatus />

      <div className="if-notice">
        Reports are session snapshots and clear on
        refresh. Download a PDF to keep a copy.
        Generate a report from the dashboard to
        include its current filters.
      </div>

      {error && (
        <p
          role="alert"
          className="if-error"
        >
          {error}
        </p>
      )}

      {selected ? (
        <>
          <div className="if-report-toolbar">
            <label className="if-report-picker">
              View report

              <select
                value={selected.id}
                disabled={downloading}
                onChange={(event) =>
                  setSelectedId(event.target.value)
                }
              >
                {reports.map((report) => (
                  <option
                    key={report.id}
                    value={report.id}
                  >
                    {report.title}
                    {" / "}
                    {new Date(
                      report.createdAt
                    ).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="if-button if-button-primary"
              disabled={
                downloading ||
                !selected.narrative
              }
              onClick={() =>
                void download(selected)
              }
            >
              <Download size={16} />

              {downloading
                ? "Preparing PDF…"
                : "Download PDF"}
            </button>

            <button
              type="button"
              className="if-button if-button-danger"
              disabled={downloading}
              onClick={() => {
                if (
                  window.confirm(
                    "Remove this session report?"
                  )
                ) {
                  removeReport(selected.id);
                }
              }}
            >
              <Trash2 size={16} />
              Delete report
            </button>
          </div>

          {!selected.narrative && (
            <p className="if-notice">
              This older snapshot has no AI
              explanations. Generate a new report
              to create a complete PDF.
            </p>
          )}

          <ReportDocument report={selected} />
        </>
      ) : (
        <section className="if-empty-state">
          <FileText size={36} />

          <h2>No reports yet</h2>

          <p>
            Generate a report above, or apply
            filters on your dashboard and generate
            it there.
          </p>

          <Link
            href={
              dataset
                ? "/dashboard"
                : "/upload"
            }
            className="if-button"
          >
            {dataset
              ? "Open dashboard"
              : "Upload dataset"}
          </Link>
        </section>
      )}

      <p className="if-footnote">
        Generating a report sends calculated KPI
        values and chart statistics to Gemini, not
        uploaded rows. No separate summary-generation
        step is required.
      </p>
    </div>
  );
}