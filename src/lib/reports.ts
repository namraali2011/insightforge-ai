import { z } from "zod";

import type { Dataset } from "@/types/dataset";
import type { DashboardPlan } from "@/lib/dashboard-plan";

import {
  aggregate,
  buildChartData,
  type ChartResult,
} from "@/lib/dashboard-data";

export const NarrativeSchema = z.object({
  overview: z.string().max(800),

  metrics: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1).max(500),
    })
  ).max(4),

  charts: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1).max(700),
    })
  ).max(200),
});

export type Narrative = z.infer<typeof NarrativeSchema>;

export interface Report {
  id: string;
  title: string;
  description: string;
  createdAt: string;

  dataset: {
    id: string;
    name: string;
    rowCount: number;
  };

  matchingRows: number;
  filters: { field: string; value: string }[];
  warnings: string[];

  metrics: (
    DashboardPlan["metrics"][number] & {
      value: number;
    }
  )[];

  charts: {
    config: DashboardPlan["charts"][number];
    result: ChartResult;
  }[];

  narrative?: Narrative;
}

export function createReport(
  dataset: Dataset,
  plan: DashboardPlan,
  selections: Record<string, string> = {}
): Report {
  const filters = plan.filters.flatMap((field) =>
    selections[field] &&
    selections[field] !== "__all__"
      ? [{ field, value: selections[field] }]
      : []
  );

  const rows = dataset.rows.filter((row) =>
    filters.every(
      (filter) =>
        (row[filter.field]?.trim() || "Unknown") ===
        filter.value
    )
  );

  return {
    id: crypto.randomUUID(),
    title: plan.title,
    description: plan.description,
    createdAt: new Date().toISOString(),

    dataset: {
      id: dataset.id,
      name: dataset.name,
      rowCount: dataset.rowCount,
    },

    matchingRows: rows.length,
    filters,
    warnings: plan.warnings ?? [],

    metrics: plan.metrics.map((metric) => ({
      ...metric,
      value: aggregate(
        rows,
        metric.field,
        metric.aggregation
      ),
    })),

    charts: plan.charts.map((config) => ({
      config: { ...config },
      result: buildChartData(rows, config, dataset),
    })),
  };
}

export function narrativeInput(report: Report) {
  return {
    title: report.title,
    matchingRows: report.matchingRows,

    metrics: report.metrics.map(
      ({ id, title, field, aggregation, value }) => ({
        id,
        title,
        field,
        aggregation,
        value,
      })
    ),

    charts: report.charts.map(({ config, result }) => {
      const values = result.points.map(
        (point) => point.value
      );

      const xValues = result.points.flatMap(
        (point) =>
          point.x === undefined ? [] : [point.x]
      );

      const sum = values.reduce(
        (total, value) => total + value,
        0
      );

      const isTrend =
        config.type === "line" ||
        config.type === "area";

      return {
        id: config.id,
        title: config.title,
        type: config.type,
        dimension: config.dimension,
        measure: config.measure,

        aggregation:
          config.type === "scatter"
            ? "none"
            : config.aggregation,

        note: result.note,
        displayedPoints: values.length,
        totalPoints: result.totalPoints,

        min: values.length ? Math.min(...values) : null,
        max: values.length ? Math.max(...values) : null,

        mean: values.length
          ? sum / values.length
          : null,

        xMin: xValues.length
          ? Math.min(...xValues)
          : null,

        xMax: xValues.length
          ? Math.max(...xValues)
          : null,

        first: isTrend
          ? result.points[0] ?? null
          : null,

        last: isTrend
          ? result.points.at(-1) ?? null
          : null,

        top:
          config.type === "scatter"
            ? []
            : [...result.points]
                .sort((a, b) => b.value - a.value)
                .slice(0, 3),

        series: result.series,
      };
    }),
  };
}