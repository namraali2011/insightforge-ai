
import type {
  ColumnProfile,
  ColumnType,
  DataRow,
} from "@/types/dataset";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 10000;

export { MAX_FILE_SIZE, MAX_ROWS };

const isEmpty = (value: string) =>
  value.trim() === "";

const isNumber = (value: string) =>
  /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value.trim()) &&
  Number.isFinite(Number(value));

const isBoolean = (value: string) =>
  /^(true|false)$/i.test(value.trim());

const isDate = (value: string) => {
  const text = value.trim();

  // Accept ISO-style dates to avoid ambiguous formats.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export function detectColumnType(
  values: string[]
): ColumnType {
  const nonEmpty = values.filter((v) => !isEmpty(v));

  if (nonEmpty.length === 0) return "empty";

  if (nonEmpty.every(isBoolean)) return "boolean";
  if (nonEmpty.every(isDate)) return "date";

  // Avoid treating identifier columns with leading
  // zeros as numeric measurements.
  const hasLeadingZero = nonEmpty.some((v) =>
    /^[+-]?0\d+/.test(v.trim())
  );

  if (!hasLeadingZero && nonEmpty.every(isNumber)) {
    return "number";
  }

  return "text";
}

export function profileColumns(
  rows: DataRow[],
  fields: string[]
): ColumnProfile[] {
  return fields.map((name) => {
    const values = rows.map((row) => row[name] ?? "");

    const nonEmpty = values.filter(
      (value) => !isEmpty(value)
    );

    return {
      name,
      type: detectColumnType(values),
      missingCount: values.length - nonEmpty.length,
      uniqueCount: new Set(nonEmpty).size,
      sampleValues: [...new Set(nonEmpty)].slice(0, 3),
    };
  });
}
