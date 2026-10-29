
import type { DataRow, Dataset } from "@/types/dataset";

import {
  MAX_FILE_SIZE,
  MAX_ROWS,
  profileColumns,
} from "@/lib/csv-utils";

const MAX_COLUMNS = 100;

export async function parseExcelFile(
  file: File
): Promise<Dataset> {
  // Validate extension
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error(
      "Please select a valid .xlsx Excel file."
    );
  }

  // Validate file size
  if (file.size === 0) {
    throw new Error("The selected Excel file is empty.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "Excel file exceeds the 5 MB size limit."
    );
  }

  // Import ExcelJS only when an Excel file is uploaded.
  const ExcelJS = (await import("exceljs")).default;

  const workbook = new ExcelJS.Workbook();

  const arrayBuffer = await file.arrayBuffer();

  try {
    // ExcelJS declares its own Buffer type.
    // Use its load parameter type to resolve the
    // TypeScript mismatch across library versions.
    //
    // This is a type-only conversion.
    // The original ArrayBuffer is unchanged.
    type ExcelLoadInput =
      Parameters<typeof workbook.xlsx.load>[0];

    await workbook.xlsx.load(
      arrayBuffer as unknown as ExcelLoadInput
    );
  } catch {
    throw new Error(
      "Unable to read this Excel workbook. Make sure it is a valid .xlsx file."
    );
  }

  // Choose the first worksheet containing data.
  const sheet = workbook.worksheets.find(
    (worksheet) => worksheet.actualRowCount >= 2
  );

  if (!sheet) {
    throw new Error(
      "No worksheet with a header and data rows was found."
    );
  }

  // The first row contains column names.
  const headerRow = sheet.getRow(1);

  const columnCount = headerRow.cellCount;

  if (columnCount === 0) {
    throw new Error(
      "The first row must contain column headers."
    );
  }

  if (columnCount > MAX_COLUMNS) {
    throw new Error(
      `This demo supports up to ${MAX_COLUMNS} columns.`
    );
  }

  const fields: string[] = [];

  for (
    let column = 1;
    column <= columnCount;
    column++
  ) {
    const header = headerRow
      .getCell(column)
      .text.trim();

    if (!header) {
      throw new Error(
        `Column ${column} has an empty header.`
      );
    }

    fields.push(header);
  }

  // Check for duplicate headers.
  if (new Set(fields).size !== fields.length) {
    throw new Error(
      "Duplicate column names found in Excel."
    );
  }

  const warnings: string[] = [];

  // Convert Excel cell values into strings.
  function cellToString(
    cell: ReturnType<typeof headerRow.getCell>
  ): string {
    const value = cell.value;

    if (value === null || value === undefined) {
      return "";
    }

    // Normalize Excel date cells.
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    // Formula cells may contain cached results.
    // ExcelJS does not evaluate formulas.
    if (
      typeof value === "object" &&
      ("formula" in value ||
        "sharedFormula" in value)
    ) {
      const result = value.result;

      if (result instanceof Date) {
        return result.toISOString().slice(0, 10);
      }

      if (
        typeof result === "string" ||
        typeof result === "number" ||
        typeof result === "boolean"
      ) {
        return String(result);
      }

      return "";
    }

    // Rich text, hyperlinks, and display values.
    return cell.text.trim();
  }

  const rows: DataRow[] = [];

  let missingFormulaResults = 0;

  // Read worksheet rows.
  sheet.eachRow(
    { includeEmpty: false },
    (row, rowNumber) => {
      // Skip header row.
      if (rowNumber === 1) return;

      if (rows.length >= MAX_ROWS) {
        throw new Error(
          `This demo supports up to ${MAX_ROWS.toLocaleString()} rows.`
        );
      }

      const data: DataRow = {};

      fields.forEach((field, index) => {
        const cell = row.getCell(index + 1);
        const value = cell.value;

        // Detect formulas without cached results.
        if (
          value !== null &&
          typeof value === "object" &&
          ("formula" in value ||
            "sharedFormula" in value) &&
          (value.result === null ||
            value.result === undefined)
        ) {
          missingFormulaResults++;
        }

        data[field] = cellToString(cell);
      });

      // Skip completely empty records.
      const hasValues = Object.values(data).some(
        (value) => value.trim() !== ""
      );

      if (hasValues) {
        rows.push(data);
      }
    }
  );

  if (rows.length === 0) {
    throw new Error(
      "The selected Excel worksheet contains no data."
    );
  }

  // Apply the existing CSV column profiler.
  const columns = profileColumns(rows, fields);

  // Data quality warnings.
  if (missingFormulaResults > 0) {
    warnings.push(
      `${missingFormulaResults} formula cells did not contain cached results and were treated as empty.`
    );
  }

  if (
    columns.some(
      (column) => column.missingCount > 0
    )
  ) {
    warnings.push(
      "Missing values were detected in the dataset."
    );
  }

  if (
    columns.some(
      (column) => column.type === "empty"
    )
  ) {
    warnings.push(
      "Some columns contain only empty values."
    );
  }

  if (workbook.worksheets.length > 1) {
    warnings.push(
      `Imported worksheet "${sheet.name}". Other worksheets were not imported.`
    );
  }

  // Return the shared Dataset structure.
  return {
    id: crypto.randomUUID(),
    name: `${file.name} — ${sheet.name}`,
    rows,
    columns,
    rowCount: rows.length,
    uploadedAt: new Date().toISOString(),
    warnings,
  };
}
