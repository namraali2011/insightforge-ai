import type { Dataset } from "@/types/dataset";

import type {
  ChartConfig,
  DashboardPlan,
  Operation,
} from "@/lib/dashboard-plan";

type Kind = ChartConfig["type"];

export interface Requirement {
  id: string;
  text: string;
  types: Kind[];

  fields: string[];
  measureFields: string[];
  dimensionFields: string[];
  seriesFields: string[];

  operation: Operation | null;
  unavailable: string;
}

const escape = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/ies$/, "y")
    .replace(/s$/, "");

const mentions = (
  text: string,
  name: string
) =>
  new RegExp(
    `(^|[^A-Za-z0-9_])${escape(name)}(?=$|[^A-Za-z0-9_])`,
    "i"
  ).test(text);

export function requirements(
  goal: string,
  dataset: Dataset
): Requirement[] {
  const numbered = goal
    .split(/\n/)
    .filter(
      (line) =>
        /^\s*\d+[.)]/.test(line) &&
        /chart|scatter|heatmap|plot/i.test(line)
    );

  const lines = numbered.length
    ? numbered
    : /scatter|stacked|grouped\s+bar|heatmap|(?:line|bar|column|area|donut|pie)\s+(?:chart|plot)/i.test(
        goal
      )
      ? [goal]
      : [];

  return lines.map((text, index) => {
    const types: Kind[] = [];

    const stackedArea =
      /stacked\s+area/i.test(text);

    const groupedBar =
      /grouped\s+(?:bar|column)/i.test(text);

    if (/scatter/i.test(text)) {
      types.push("scatter");
    } else if (
      /stacked/i.test(text) &&
      (
        !stackedArea ||
        /stacked\s+(?:column|bar)/i.test(text)
      )
    ) {
      types.push("stacked");
    } else if (
      /horizontal\s+bar/i.test(text) &&
      !groupedBar
    ) {
      types.push("bar");
    } else if (
      /bar|column/i.test(text) &&
      !groupedBar &&
      !stackedArea
    ) {
      types.push(
        /column/i.test(text)
          ? "column"
          : "bar"
      );
    }

    if (/line\s+(?:chart|plot)/i.test(text)) {
      types.push("line");
    }

    if (
      /area\s+chart/i.test(text) &&
      !stackedArea
    ) {
      types.push("area");
    }

    if (/donut|pie/i.test(text)) {
      types.push("donut");
    }

    const mentioned = dataset.columns.filter(
      (column) => mentions(text, column.name)
    );

    const fields = mentioned.map(
      (column) => column.name
    );

    const by = dataset.columns
      .filter((column) =>
        new RegExp(
          `\\bby\\s+(?:the\\s+)?["'\\x60*]*` +
          `${escape(column.name)}` +
          `(?=$|[^A-Za-z0-9_])`,
          "i"
        ).test(text)
      )
      .map((column) => column.name);

    const dates = dataset.columns
      .filter(
        (column) => column.type === "date"
      )
      .map((column) => column.name);

    const timeRequest =
      /monthly|over\s+time|time[- ]series|seasonality|over\s+the\s+months/i.test(
        text
      );

    let dimensionFields = [...by];
    let seriesFields: string[] = [];

    let unavailable = !types.length
      ? stackedArea || groupedBar
        ? (
            "Stacked-area and grouped-bar renderers " +
            "are not implemented. Use a stacked " +
            "column chart for this analysis."
          )
        : "This chart type is not supported."
      : "";

    const across =
      /across\s+(.+?)(?:\s+to\s+|\s+over\s+|$)/i
        .exec(text)?.[1]
        ?.split(/\s+or\s+|\//i)
        .map((value) => value.trim()) ?? [];

    const acrossFields = across.flatMap(
      (name) =>
        dataset.columns
          .filter(
            (column) =>
              normalize(column.name) ===
              normalize(name)
          )
          .map((column) => column.name)
    );

    if (types.includes("stacked")) {
      if (
        across.length &&
        !acrossFields.length
      ) {
        unavailable =
          "Missing requested grouping column: " +
          `${across.join(" or ")}.`;
      }

      if (
        timeRequest ||
        by.some((field) => dates.includes(field))
      ) {
        // Monthly stacked chart:
        // date dimension + categorical series.
        dimensionFields = dates;

        seriesFields = acrossFields.length
          ? acrossFields
          : by.filter(
              (field) => !dates.includes(field)
            );

        if (!seriesFields.length) {
          seriesFields = mentioned
            .filter((column) =>
              ["text", "boolean"].includes(
                column.type
              )
            )
            .map((column) => column.name);
        }

        if (!dates.length) {
          unavailable =
            "A monthly chart requires a date column.";
        }
      } else {
        dimensionFields = by.length
          ? [by[0]]
          : [];

        seriesFields = acrossFields.length
          ? acrossFields
          : mentioned
              .filter(
                (column) =>
                  !dimensionFields.includes(
                    column.name
                  ) &&
                  ["text", "boolean"].includes(
                    column.type
                  )
              )
              .map((column) => column.name);
      }
    } else if (
      (
        types.includes("line") ||
        types.includes("area")
      ) &&
      timeRequest
    ) {
      dimensionFields = dates;

      if (!dates.length) {
        unavailable =
          "A time-trend chart requires a date column.";
      }
    }

    const xFields = dataset.columns
      .filter((column) =>
        new RegExp(
          `${escape(column.name)}\\s+(?:versus|vs\\.?)`,
          "i"
        ).test(text)
      )
      .map((column) => column.name);

    const yFields = dataset.columns
      .filter((column) =>
        new RegExp(
          `(?:versus|vs\\.?)\\s+${escape(column.name)}`,
          "i"
        ).test(text)
      )
      .map((column) => column.name);

    if (types.includes("scatter")) {
      dimensionFields = xFields;

      if (
        dataset.columns.filter(
          (column) => column.type === "number"
        ).length < 2
      ) {
        unavailable =
          "Scatter requires two numeric columns.";
      }
    }

    // A mentioned category is not a measure.
    const explicitMeasures = mentioned
      .filter(
        (column) =>
          column.type === "number" &&
          !dimensionFields.includes(column.name) &&
          !seriesFields.includes(column.name)
      )
      .map((column) => column.name);

    const operatedFields = dataset.columns
      .filter((column) =>
        new RegExp(
          "\\b(?:sum|average|count|distinct count)" +
          '\\s+(?:of\\s+)?["\'\\x60*]*' +
          `${escape(column.name)}` +
          "(?=$|[^A-Za-z0-9_])",
          "i"
        ).test(text)
      )
      .map((column) => column.name);

    const measureFields = types.includes("scatter")
      ? yFields
      : operatedFields.length
        ? operatedFields
        : explicitMeasures;

    const operation: Operation | null =
      /unique|distinct/i.test(text)
        ? "distinctCount"
        : /\baverage\b|\bmean\b/i.test(text)
          ? "average"
          : /\bsum\b/i.test(text)
            ? "sum"
            : /\bcount\b/i.test(text)
              ? "count"
              : null;

    return {
      id: `request-${index + 1}`,
      text,
      types,
      fields,
      measureFields,
      dimensionFields,
      seriesFields: [...new Set(seriesFields)],
      operation,
      unavailable,
    };
  });
}

export function enforceRequirements(
  plan: DashboardPlan,
  requests: Requirement[],
  goal: string,
  dataset: Dataset
): DashboardPlan {
  const warnings = requests
    .filter((request) => request.unavailable)
    .map(
      (request) =>
        `${request.text}: ${request.unavailable}`
    );

  const charts: ChartConfig[] = [];

  if (requests.length) {
    for (const request of requests.filter(
      (item) => !item.unavailable
    )) {
      const chart = plan.charts.find(
        (item) =>
          item.requestId === request.id
      );

      if (
        !chart ||
        !request.types.includes(chart.type)
      ) {
        throw new Error(
          "Requested chart type was not respected: " +
          request.text
        );
      }

      if (
        request.measureFields.length &&
        !request.measureFields.includes(
          chart.measure
        )
      ) {
        throw new Error(
          `Expected measure ${
            request.measureFields.join(" or ")
          }; AI selected ${chart.measure}.`
        );
      }

      if (
        request.dimensionFields.length &&
        !request.dimensionFields.includes(
          chart.dimension
        )
      ) {
        throw new Error(
          `Expected dimension ${
            request.dimensionFields.join(" or ")
          }; AI selected ${chart.dimension}.`
        );
      }

      if (
        chart.type === "stacked" &&
        request.seriesFields.length &&
        !request.seriesFields.includes(
          chart.series
        )
      ) {
        throw new Error(
          `Expected grouping field ${
            request.seriesFields.join(" or ")
          }; AI selected ${chart.series}.`
        );
      }

      if (
        chart.type !== "scatter" &&
        request.operation &&
        chart.aggregation !== request.operation
      ) {
        throw new Error(
          `Expected ${request.operation}; ` +
          `AI selected ${chart.aggregation}.`
        );
      }

      charts.push(chart);
    }
  } else {
    charts.push(...plan.charts.slice(0, 6));
  }

  if (
    /unique\s+customer|distinct\s+(customer|buyer)/i.test(
      goal
    )
  ) {
    const customer = dataset.columns.find(
      (column) =>
        /customer.*id/i.test(column.name)
    );

    if (
      customer &&
      !plan.metrics.some(
        (metric) =>
          metric.field === customer.name &&
          metric.aggregation === "distinctCount"
      )
    ) {
      throw new Error(
        "Unique customers requires distinctCount on Customer ID."
      );
    }

    if (!customer) {
      warnings.push(
        "Unique customers unavailable: " +
        "no Customer ID column exists."
      );
    }
  }

  return {
    ...plan,
    charts,
    warnings,
  };
}