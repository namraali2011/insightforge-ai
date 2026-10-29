
import { z } from "zod";
import type { Dataset } from "@/types/dataset";

import {
  getCategoryColumns,
  getDateColumns,
  getDefaultMeasure,
  getNumericColumns,
} from "@/lib/analytics";

export const MetricSchema = z.object({
  id: z.string(),
  title: z.string(),
  field: z.string(),
  aggregation: z.enum(["sum", "average", "count"]),
});

export const ChartSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["bar", "line", "area", "donut"]),
  dimension: z.string(),
  measure: z.string(),
  aggregation: z.enum(["sum", "average", "count"]),
  emphasis: z.string(),
});

export const DashboardPlanSchema = z.object({
  title: z.string(),
  description: z.string(),
  metrics: z.array(MetricSchema).max(4),
  charts: z.array(ChartSchema).max(6),
  filters: z.array(z.string()).max(3),
});

export type DashboardPlan = z.infer<
  typeof DashboardPlanSchema
>;

export function validateDashboardPlan(
  plan: DashboardPlan,
  dataset: Dataset
): DashboardPlan {
  const columns = new Set(
    dataset.columns.map((c) => c.name)
  );

  const numeric = new Set(
    getNumericColumns(dataset).map((c) => c.name)
  );

  const dimensions = new Set(
    dataset.columns
      .filter((c) => c.type !== "empty")
      .map((c) => c.name)
  );

  const categories = new Set(
    getCategoryColumns(dataset).map((c) => c.name)
  );

  return {
    title: plan.title.slice(0, 100),
    description: plan.description.slice(0, 300),

    metrics: plan.metrics
      .filter(
        (metric) =>
          columns.has(metric.field) &&
          (metric.aggregation === "count" ||
            numeric.has(metric.field))
      )
      .slice(0, 4),

    charts: plan.charts
      .filter(
        (chart) =>
          dimensions.has(chart.dimension) &&
          columns.has(chart.measure) &&
          (chart.aggregation === "count" ||
            numeric.has(chart.measure)) &&
          (
            chart.type !== "donut" ||
            categories.has(chart.dimension)
          )
      )
      .slice(0, 6),

    filters: [...new Set(
      plan.filters.filter((field) =>
        categories.has(field)
      )
    )].slice(0, 3),
  };
}

export function createFallbackPlan(
  dataset: Dataset
): DashboardPlan {
  const numeric = getNumericColumns(dataset);
  const categories = getCategoryColumns(dataset);
  const dates = getDateColumns(dataset);

  const measure =
    getDefaultMeasure(dataset.columns) ??
    numeric[0]?.name ??
    "";

  const metrics: DashboardPlan["metrics"] = [];

  if (measure) {
    metrics.push(
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
      }
    );
  }

  const charts: DashboardPlan["charts"] = [];

  if (measure && dates[0]) {
    charts.push({
      id: "trend",
      title: `${measure} over time`,
      type: "area",
      dimension: dates[0].name,
      measure,
      aggregation: "sum",
      emphasis: "Monthly performance trend",
    });
  }

  if (measure && categories[0]) {
    charts.push({
      id: "category-bar",
      title: `${measure} by ${categories[0].name}`,
      type: "bar",
      dimension: categories[0].name,
      measure,
      aggregation: "sum",
      emphasis: "Compare category performance",
    });
  }

  if (measure && categories[1]) {
    charts.push({
      id: "category-donut",
      title: `${measure} share by ${categories[1].name}`,
      type: "donut",
      dimension: categories[1].name,
      measure,
      aggregation: "sum",
      emphasis: "Show category contribution",
    });
  }

  return {
    title: "Dataset Overview",
    description:
      "Interactive dashboard generated from your uploaded dataset.",
    metrics,
    charts,
    filters: categories.slice(0, 3).map((c) => c.name),
  };
}
