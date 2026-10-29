
export type ColumnType =
  | "number"
  | "date"
  | "boolean"
  | "text"
  | "empty";

export type DataRow = Record<string, string>;

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missingCount: number;
  uniqueCount: number;
  sampleValues: string[];
}

export interface Dataset {
  id: string;
  name: string;
  rows: DataRow[];
  columns: ColumnProfile[];
  rowCount: number;
  uploadedAt: string;
  warnings: string[];
}
