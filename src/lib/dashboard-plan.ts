import { z } from "zod";
import type { Dataset } from "@/types/dataset";
import {
  getCategoryColumns,
  getDateColumns,
  getDefaultMeasure,
} from "@/lib/analytics";

export const OperationSchema = z.enum([
  "sum",
  "average",
  "count",
  "distinctCount",
]);

export const MetricSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  field: z.string(),
  aggregation: OperationSchema,
});

export const ChartSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),

  type: z.enum([
    "bar",
    "column",
    "line",
    "area",
    "donut",
    "scatter",
    "stacked",
  ]),

  dimension: z.string(),
  measure: z.string(),
  aggregation: OperationSchema,

  series: z.string().default(""),
  requestId: z.string().default(""),
  emphasis: z.string().max(300),
});

export const DashboardPlanSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(600),

  metrics: z.array(MetricSchema).max(4),
  charts: z.array(ChartSchema),
  filters: z.array(z.string()).max(3),

  warnings: z.array(z.string()).default([]),
});

export type DashboardPlan = z.infer<typeof DashboardPlanSchema>;
export type ChartConfig = DashboardPlan["charts"][number];
export type Operation = z.infer<typeof OperationSchema>;

export function metricValid(
  metric: DashboardPlan["metrics"][number],
  dataset: Dataset
) {
  const column = dataset.columns.find(
    (item) => item.name === metric.field
  );

  return (
    !!column &&
    (
      ["count", "distinctCount"].includes(metric.aggregation) ||
      column.type === "number"
    )
  );
}

export function chartValid(
  chart: ChartConfig,
  dataset: Dataset
) {
  const dimension = dataset.columns.find(
    (column) => column.name === chart.dimension
  );

  const measure = dataset.columns.find(
    (column) => column.name === chart.measure
  );

  if (!dimension || dimension.type === "empty" || !measure) {
    return false;
  }

  if (chart.type === "scatter") {
    return (
      dimension.type === "number" &&
      measure.type === "number"
    );
  }

  if (
    !["count", "distinctCount"].includes(chart.aggregation) &&
    measure.type !== "number"
  ) {
    return false;
  }

  if (
    chart.type === "donut" &&
    !["text", "boolean"].includes(dimension.type)
  ) {
    return false;
  }

  if (chart.type === "stacked") {
    const series = dataset.columns.find(
      (column) => column.name === chart.series
    );

    if (
      !series ||
      series.type === "empty" ||
      chart.series === chart.dimension ||
      series.uniqueCount > 12
    ) {
      return false;
    }

    // Stacking averages or distinct counts can imply
    // misleading additive totals.
    if (!["sum", "count"].includes(chart.aggregation)) {
      return false;
    }
  }

  return true;
}

export function validateDashboardPlan(
  plan: DashboardPlan,
  dataset: Dataset
): DashboardPlan {
  return {
    ...plan,

    metrics: plan.metrics.filter((metric) =>
      metricValid(metric, dataset)
    ),

    charts: plan.charts.filter((chart) =>
      chartValid(chart, dataset)
    ),

    filters: [...new Set(plan.filters)].filter((field) =>
      getCategoryColumns(dataset).some(
        (column) => column.name === field
      )
    ),
  };
}

export function createFallbackPlan(
  dataset: Dataset
): DashboardPlan {
  const measure = getDefaultMeasure(dataset.columns);
  const category = getCategoryColumns(dataset)[0]?.name;
  const date = getDateColumns(dataset)[0]?.name;

  const charts: ChartConfig[] = [];

  if (measure && (date || category)) {
    charts.push({
      id: "overview",
      title: `${measure} by ${date || category}`,
      type: date ? "line" : "bar",
      dimension: (date || category)!,
      measure,
      aggregation: "sum",
      emphasis: "Dataset overview",
      series: "",
      requestId: "",
    });
  }

  return {
    title: "Dataset Overview",
    description: "Local rule-based dashboard.",
    warnings: [],

    metrics: measure
      ? [
          {
            id: "total",
            title: `Total ${measure}`,
            field: measure,
            aggregation: "sum",
          },
          {
            id: "average",
            title: `Average ${measure}`,
            field: measure,
            aggregation: "average",
          },
        ]
      : [],

    charts,

    filters: getCategoryColumns(dataset)
      .slice(0, 3)
      .map((column) => column.name),
  };
}