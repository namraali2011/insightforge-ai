import { create } from "zustand";

import {
  createReport,
  narrativeInput,
  NarrativeSchema,
  type Report,
  type Narrative,
} from "@/lib/reports";

import type { Dataset } from "@/types/dataset";
import type { DashboardPlan } from "@/lib/dashboard-plan";

interface State {
  reports: Report[];
  generating: boolean;
  generationError: string;

  addReport: (report: Report) => void;
  removeReport: (id: string) => void;

  setNarrative: (
    id: string,
    narrative: Narrative
  ) => void;

  generateReport: (
    dataset: Dataset,
    plan: DashboardPlan,
    filters?: Record<string, string>
  ) => Promise<string | null>;
}

export const useReportStore = create<State>()(
  (set, get) => ({
    reports: [],
    generating: false,
    generationError: "",

    addReport: (report) =>
      set((state) => ({
        reports: [
          structuredClone(report),
          ...state.reports,
        ],
      })),

    removeReport: (id) =>
      set((state) => ({
        reports: state.reports.filter(
          (report) => report.id !== id
        ),
      })),

    setNarrative: (id, narrative) =>
      set((state) => ({
        reports: state.reports.map((report) =>
          report.id === id
            ? {
                ...report,
                narrative: structuredClone(narrative),
              }
            : report
        ),
      })),

    generateReport: async (
      dataset,
      plan,
      filters = {}
    ) => {
      // Prevent duplicate clicks across both pages.
      if (get().generating) return null;

      set({
        generating: true,
        generationError: "",
      });

      try {
        // Capture the dataset calculations and filters
        // before waiting for the AI response.
        const report = createReport(
          dataset,
          plan,
          filters
        );

        if (
          !report.metrics.length &&
          !report.charts.length
        ) {
          throw new Error(
            "Add a KPI or chart before generating a report."
          );
        }

        if (report.charts.length > 200) {
          throw new Error(
            "AI reports currently support up to 200 charts. " +
            "Reduce the chart count and try again."
          );
        }

        const response = await fetch(
          "/api/report-summary",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(
              narrativeInput(report)
            ),

            signal: AbortSignal.timeout(120000),
          }
        );

        const body: unknown = await response.json();

        if (!response.ok) {
          if (response.status === 503) {
            throw new Error(
              "AI report generation is unavailable. " +
              "Check your Gemini API configuration and try again."
            );
          }

          const message =
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : "AI report generation failed.";

          throw new Error(message);
        }

        if (
          typeof body !== "object" ||
          body === null ||
          !("narrative" in body)
        ) {
          throw new Error(
            "Invalid report response."
          );
        }

        const narrative = NarrativeSchema.parse(
          body.narrative
        );

        const complete = (
          items: { id: string }[],
          expected: { id: string }[]
        ) =>
          items.length === expected.length &&
          new Set(
            items.map((item) => item.id)
          ).size === expected.length &&
          items.every((item) =>
            expected.some(
              (expectedItem) =>
                expectedItem.id === item.id
            )
          );

        if (
          !complete(
            narrative.metrics,
            report.metrics
          ) ||
          !complete(
            narrative.charts,
            report.charts.map(
              (chart) => chart.config
            )
          )
        ) {
          throw new Error(
            "Some AI explanations were missing. " +
            "Please generate the report again."
          );
        }

        const completed: Report = {
          ...report,
          narrative,
        };

        // Do not publish incomplete reports.
        set((state) => ({
          reports: [
            structuredClone(completed),
            ...state.reports,
          ],
        }));

        return completed.id;
      } catch (error) {
        set({
          generationError:
            error instanceof Error &&
            error.name === "TimeoutError"
              ? (
                  "Report generation timed out. " +
                  "Try again or use fewer charts."
                )
              : error instanceof Error
                ? error.message
                : (
                    "Report generation failed. " +
                    "Please try again."
                  ),
        });

        return null;
      } finally {
        set({ generating: false });
      }
    },
  })
);