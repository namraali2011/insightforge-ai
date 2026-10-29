
import type {
  ColumnProfile,
  DataRow,
  Dataset,
} from "@/types/dataset";

// Identify numeric columns.
export function getNumericColumns(
  dataset: Dataset
): ColumnProfile[] {
  return dataset.columns.filter(
    (column) => column.type === "number"
  );
}

// Identify categorical columns suitable for slicers.
// Avoid high-cardinality fields for this MVP.
export function getCategoryColumns(
  dataset: Dataset
): ColumnProfile[] {
  return dataset.columns.filter(
    (column) =>
      (column.type === "text" ||
        column.type === "boolean") &&
      column.uniqueCount >= 2 &&
      column.uniqueCount <= 30
  );
}

// Identify dates.
export function getDateColumns(
  dataset: Dataset
): ColumnProfile[] {
  return dataset.columns.filter(
    (column) => column.type === "date"
  );
}

// Safely convert CSV text into a numeric value.
export function parseNumericValue(
  value: string | undefined
): number | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const number = Number(value.trim());

  return Number.isFinite(number) ? number : null;
}

// Sum a numeric column.
export function sumColumn(
  rows: DataRow[],
  column: string
): number {
  return rows.reduce((total, row) => {
    const value = parseNumericValue(row[column]);

    return total + (value ?? 0);
  }, 0);
}

// Average a numeric column.
// Empty or invalid values are excluded.
export function averageColumn(
  rows: DataRow[],
  column: string
): number {
  let total = 0;
  let count = 0;

  for (const row of rows) {
    const value = parseNumericValue(row[column]);

    if (value !== null) {
      total += value;
      count++;
    }
  }

  return count === 0 ? 0 : total / count;
}

// Count rows containing valid numeric values.
export function countValidNumericRows(
  rows: DataRow[],
  column: string
): number {
  return rows.filter(
    (row) => parseNumericValue(row[column]) !== null
  ).length;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

// Aggregate a measure by a categorical dimension.
export function groupAndSum(
  rows: DataRow[],
  dimension: string,
  measure: string
): ChartDataPoint[] {
  const groups = new Map<string, number>();

  for (const row of rows) {
    const category =
      row[dimension]?.trim() || "Unknown";

    const value =
      parseNumericValue(row[measure]) ?? 0;

    groups.set(
      category,
      (groups.get(category) ?? 0) + value
    );
  }

  return Array.from(groups.entries())
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

// Aggregate a measure by month.
// Stage 2 detects ISO date values: YYYY-MM-DD.
export function groupByMonth(
  rows: DataRow[],
  dateColumn: string,
  measure: string
): ChartDataPoint[] {
  const groups = new Map<string, number>();

  for (const row of rows) {
    const date = row[dateColumn]?.trim() ?? "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue;
    }

    const month = date.slice(0, 7);

    const value =
      parseNumericValue(row[measure]) ?? 0;

    groups.set(
      month,
      (groups.get(month) ?? 0) + value
    );
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({
      name,
      value,
    }));
}

// Choose a useful default numeric measure.
export function getDefaultMeasure(
  columns: ColumnProfile[]
): string | null {
  const numericColumns = columns.filter(
    (column) => column.type === "number"
  );

  if (numericColumns.length === 0) {
    return null;
  }

  const preferredNames = [
    "revenue",
    "sales",
    "profit",
    "amount",
    "total",
    "quantity",
    "price",
    "cost",
  ];

  for (const preferred of preferredNames) {
    const match = numericColumns.find((column) =>
      column.name.toLowerCase().includes(preferred)
    );

    if (match) {
      return match.name;
    }
  }

  // Numeric identifiers should not usually be measures.
  const nonIdentifier = numericColumns.find(
    (column) =>
      !/(^id$|_id$|^id_|identifier)/i.test(column.name)
  );

  return nonIdentifier?.name ?? numericColumns[0].name;
}

// Make column names readable.
export function getMeasureLabel(
  name: string
): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

// Format dashboard values.
export function formatValue(
  value: number
): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}
