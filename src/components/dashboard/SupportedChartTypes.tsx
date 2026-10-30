"use client";

import {
  ChartSchema,
  type ChartConfig,
} from "@/lib/dashboard-plan";

const descriptions: Record<
  ChartConfig["type"],
  {
    label: string;
    description: string;
  }
> = {
  bar: {
    label: "Horizontal bar",
    description:
      "Compare categories using horizontal bars.",
  },

  column: {
    label: "Column",
    description:
      "Compare categories using vertical bars.",
  },

  line: {
    label: "Line",
    description:
      "Show a trend, such as monthly sales.",
  },

  area: {
    label: "Area",
    description:
      "Show a single filled trend; this is not stacked area.",
  },

  donut: {
    label: "Donut",
    description:
      "Show category shares using nonnegative values with a positive total.",
  },

  scatter: {
    label: "Scatter",
    description:
      "Compare two numeric fields using individual observations.",
  },

  stacked: {
    label: "Stacked column",
    description:
      "Break down a sum or count by a second grouping field, with up to 12 series.",
  },
};

export function SupportedChartTypes({
  mode = "dashboard",
}: {
  mode?: "dashboard" | "chart";
}) {
  return (
    <aside
      className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3"
      aria-label="Supported chart types"
    >
      <p className="text-xs font-semibold text-indigo-900">
        Supported chart types
      </p>

      <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
        {ChartSchema.shape.type.options.map((type) => (
          <li key={type}>
            <span
              title={descriptions[type].description}
              className="inline-flex rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700"
            >
              {descriptions[type].label}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        {mode === "dashboard"
          ? "Request up to six initial charts in a numbered list."
          : "Request one additional chart at a time; it will be appended to the dashboard."}
        {" "}
        Use exact dataset column names and specify
        the measure, grouping and aggregation.
      </p>

      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Use a date field for monthly trends and two
        numeric fields for scatter plots. Stacked
        columns need a separate grouping field.
      </p>

      <p className="mt-1 text-xs font-medium text-amber-800">
        Not supported: heatmaps, grouped bars and
        stacked-area charts.
      </p>
    </aside>
  );
}