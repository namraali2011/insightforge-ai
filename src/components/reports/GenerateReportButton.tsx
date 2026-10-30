"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  Loader2,
  X,
} from "lucide-react";

import { useReportStore } from "@/store/useReportStore";

import type { Dataset } from "@/types/dataset";
import type { DashboardPlan } from "@/lib/dashboard-plan";

interface Props {
  dataset: Dataset | null;
  plan: DashboardPlan | null;
  filters?: Record<string, string>;
  disabled?: boolean;
  label?: string;
  onCreated?: (id: string) => void;
}

export function GenerateReportButton({
  dataset,
  plan,
  filters = {},
  disabled = false,
  label = "Generate report",
  onCreated,
}: Props) {
  const router = useRouter();

  const generating = useReportStore(
    (state) => state.generating
  );

  const generateReport = useReportStore(
    (state) => state.generateReport
  );

  async function generate() {
    if (!dataset || !plan) return;

    const id = await generateReport(
      dataset,
      plan,
      filters
    );

    if (!id) return;

    if (document.fullscreenElement) {
      await document
        .exitFullscreen()
        .catch(() => {});
    }

    if (onCreated) {
      onCreated(id);
    } else {
      router.push("/reports");
    }
  }

  return (
    <button
      type="button"
      className="if-button if-button-primary"
      aria-busy={generating}
      disabled={
        disabled ||
        generating ||
        !dataset ||
        !plan
      }
      onClick={() => void generate()}
    >
      {generating ? (
        <Loader2
          size={16}
          className="animate-spin"
        />
      ) : (
        <FileText size={16} />
      )}

      {generating
        ? "Generating AI report…"
        : label}
    </button>
  );
}

export function ReportGenerationStatus() {
  const generating = useReportStore(
    (state) => state.generating
  );

  const error = useReportStore(
    (state) => state.generationError
  );

  if (!generating && !error) return null;

  return (
    <div
      className={
        "if-report-feedback" +
        (error
          ? " if-report-feedback-error"
          : "")
      }
      role={error ? "alert" : "status"}
    >
      {error ? (
        <>
          <div>
            <strong>
              Report generation failed
            </strong>

            <p>{error}</p>

            <p>
              No new report was saved.
              Existing reports are unchanged.
            </p>
          </div>

          <button
            type="button"
            aria-label="Dismiss report error"
            className="if-feedback-close"
            onClick={() =>
              useReportStore.setState({
                generationError: "",
              })
            }
          >
            <X size={18} />
          </button>
        </>
      ) : (
        <>
          <Loader2
            size={18}
            className="animate-spin"
          />

          <div>
            <strong>
              Preparing your report
            </strong>

            <p>
              Calculating the snapshot and
              generating KPI explanations and
              chart summaries.
            </p>
          </div>
        </>
      )}
    </div>
  );
}