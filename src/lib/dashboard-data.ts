import { parseNumericValue } from "@/lib/analytics";
import type {
  ChartConfig,
  Operation,
} from "@/lib/dashboard-plan";
import type { DataRow, Dataset } from "@/types/dataset";

export interface Point {
  name: string;
  value: number;
  x?: number;
  values?: Record<string, number>;
}

export interface ChartResult {
  points: Point[];
  series: string[];
  note: string;
  totalPoints: number;
}

export function aggregate(
  rows: DataRow[],
  field: string,
  operation: Operation
): number {
  const present = rows
    .map((row) => (row[field] ?? "").trim())
    .filter(Boolean);

  if (operation === "count") {
    return present.length;
  }

  if (operation === "distinctCount") {
    return new Set(present).size;
  }

  const values = present
    .map((value) => parseNumericValue(value))
    .filter((value): value is number => value !== null);

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  );

  return operation === "average"
    ? values.length
      ? total / values.length
      : 0
    : total;
}

export function buildChartData(
  rows: DataRow[],
  chart: ChartConfig,
  dataset: Dataset
): ChartResult {
  if (chart.type === "scatter") {
    const all = rows.flatMap((row) => {
      const x = parseNumericValue(row[chart.dimension]);
      const y = parseNumericValue(row[chart.measure]);

      return x === null || y === null
        ? []
        : [{ name: "Observation", x, value: y }];
    });

    const points =
      all.length <= 1000
        ? all
        : Array.from(
            { length: 1000 },
            (_, index) =>
              all[
                Math.floor(
                  (index * (all.length - 1)) / 999
                )
              ]
          );

    return {
      points,
      series: [],
      totalPoints: all.length,
      note:
        `${points.length} of ${all.length} valid observations shown; ` +
        `no aggregation. ` +
        (
          all.length > 1000
            ? "Evenly sampled in source order."
            : ""
        ),
    };
  }

  const isDate =
    dataset.columns.find(
      (column) => column.name === chart.dimension
    )?.type === "date";

  const groups = new Map<string, DataRow[]>();

  for (const row of rows) {
    const raw = (row[chart.dimension] ?? "").trim();

    const key = isDate
      ? /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? raw.slice(0, 7)
        : ""
      : raw || "Unknown";

    if (!key) continue;

    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  let series: string[] = [];

  if (chart.type === "stacked") {
    series = [
      ...new Set(
        rows.map(
          (row) =>
            (row[chart.series] ?? "").trim() || "Unknown"
        )
      ),
    ].sort();
  }

  if (series.length > 12) {
    return {
      points: [],
      series: [],
      totalPoints: groups.size,
      note:
        "Stacked charts support up to 12 series. " +
        "Choose a lower-cardinality grouping field.",
    };
  }

  const all: Point[] = [...groups].map(([name, group]) => ({
    name,
    value: aggregate(
      group,
      chart.measure,
      chart.aggregation
    ),

    ...(series.length
      ? {
          values: Object.fromEntries(
            series.map((selectedSeries) => [
              selectedSeries,
              aggregate(
                group.filter(
                  (row) =>
                    (
                      (row[chart.series] ?? "").trim() ||
                      "Unknown"
                    ) === selectedSeries
                ),
                chart.measure,
                chart.aggregation
              ),
            ])
          ),
        }
      : {}),
  }));

  all.sort(
    isDate
      ? (a, b) => a.name.localeCompare(b.name)
      : (a, b) => b.value - a.value
  );

  const points = isDate ? all : all.slice(0, 15);

  return {
    points,
    series,
    totalPoints: all.length,

    note: isDate
      ? "Monthly aggregation; records without a valid ISO date are excluded."
      : (
          `Showing ${points.length} of ${all.length} categories ranked by value.` +
          (
            chart.type === "donut"
              ? " Shares refer to displayed categories."
              : ""
          )
        ),
  };
}

export function chartData(
  rows: DataRow[],
  chart: ChartConfig,
  dataset: Dataset
) {
  return buildChartData(rows, chart, dataset).points;
}