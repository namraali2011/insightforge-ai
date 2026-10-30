"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import { useDatasetStore } from "@/store/useDatasetStore";
import { useDashboardPlanStore } from "@/store/useDashboardPlanStore";
import {
  GenerateReportButton,
  ReportGenerationStatus,
} from "@/components/reports/GenerateReportButton";
import { SupportedChartTypes } from "@/components/dashboard/SupportedChartTypes";


import {
  DashboardPlanSchema,
  ChartSchema,
  createFallbackPlan,
  validateDashboardPlan,
  type DashboardPlan,
  type ChartConfig,
  type Operation,
} from "@/lib/dashboard-plan";

import {
  aggregate,
  buildChartData,
} from "@/lib/dashboard-data";

import { formatValue } from "@/lib/analytics";
import { Visualization } from "@/components/dashboard/Visualization";

import type { Dataset } from "@/types/dataset";

const operations: Operation[] = [
  "sum",
  "average",
  "count",
  "distinctCount",
];

const types: ChartConfig["type"][] = [
  "bar",
  "column",
  "line",
  "area",
  "donut",
  "scatter",
  "stacked",
];

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 text-xs text-slate-600">
      {label}

      <select
        className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option || "None"}
          </option>
        ))}
      </select>
    </label>
  );
}

function Content({
  dataset,
}: {
  dataset: Dataset;
}) {
  const store = useDashboardPlanStore();

  const fallback = useMemo(
    () => createFallbackPlan(dataset),
    [dataset]
  );

  const current =
    store.datasetId === dataset.id && store.plan
      ? store.plan
      : fallback;

  const [draft, setDraft] =
    useState<DashboardPlan | null>(null);

  const [filters, setFilters] =
    useState<Record<string, string>>({});

  const [goal, setGoal] = useState(
    "Analyze important business KPIs, trends and categories."
  );

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [focus, setFocus] = useState(false);

  const pending = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  const plan = draft ?? current;

  const fields = dataset.columns.map(
    (column) => column.name
  );

  const numeric = dataset.columns
    .filter((column) => column.type === "number")
    .map((column) => column.name);

  const dimensions = dataset.columns
    .filter((column) => column.type !== "empty")
    .map((column) => column.name);

  const categories = dataset.columns
    .filter(
      (column) =>
        ["text", "boolean"].includes(column.type) &&
        column.uniqueCount >= 2 &&
        column.uniqueCount <= 30
    )
    .map((column) => column.name);

  const rows = useMemo(
    () =>
      dataset.rows.filter((row) =>
        plan.filters.every(
          (field) =>
            !filters[field] ||
            filters[field] === "__all__" ||
            (row[field]?.trim() || "Unknown") ===
              filters[field]
        )
      ),
    [dataset, plan.filters, filters]
  );

  const button = "if-button";

  useEffect(() => {
    const handleChange = () => {
      if (!document.fullscreenElement) {
        setFocus(false);
      }
    };

    document.addEventListener(
      "fullscreenchange",
      handleChange
    );

    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleChange
      );
  }, []);

  async function fullscreen() {
    if (focus) {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      setFocus(false);
    } else {
      setFocus(true);

      await root.current
        ?.requestFullscreen?.()
        .catch(() => {});
    }
  }

  function mutate(
    change: (plan: DashboardPlan) => DashboardPlan
  ) {
    setDraft((previous) =>
      previous ? change(previous) : previous
    );
  }

  function editChart(
    id: string,
    changes: Partial<ChartConfig>
  ) {
    mutate((previous) => ({
      ...previous,

      charts: previous.charts.map((chart) =>
        chart.id === id
          ? { ...chart, ...changes }
          : chart
      ),
    }));
  }

  function save() {
    if (!draft) return;

    const parsed =
      DashboardPlanSchema.safeParse(draft);

    if (!parsed.success) {
      setError(
        "Please check widget titles and configuration."
      );
      return;
    }

    const valid = validateDashboardPlan(
      parsed.data,
      dataset
    );

    if (
      valid.metrics.length !== draft.metrics.length ||
      valid.charts.length !== draft.charts.length
    ) {
      setError(
        "Some fields are incompatible. Scatter needs numeric " +
        "axes; stacked needs a separate grouping field."
      );
      return;
    }

    if (store.datasetId !== dataset.id) {
      store.setPlan(
        dataset.id,
        fallback,
        "rules"
      );
    }

    store.updatePlan(valid);
    setDraft(null);
    setError("");
    setNotice("Dashboard saved for this session.");
  }

  async function generate(
    mode: "dashboard" | "add-chart"
  ) {
    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/generate",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          signal: AbortSignal.timeout(60000),

          body: JSON.stringify({
            mode,

            goal:
              mode === "dashboard"
                ? goal
                : prompt,

            dataset: {
              name: dataset.name,
              rowCount: dataset.rowCount,

              columns: dataset.columns.map(
                ({
                  name,
                  type,
                  missingCount,
                  uniqueCount,
                }) => ({
                  name,
                  type,
                  missingCount,
                  uniqueCount,
                })
              ),
            },
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.error || "Generation failed."
        );
      }

      if (
        useDatasetStore.getState().dataset?.id !==
        dataset.id
      ) {
        return;
      }

      if (mode === "add-chart") {
        const chart = ChartSchema.parse(
          body.chart
        );

        const appended =
          useDashboardPlanStore
            .getState()
            .appendChart(dataset, chart);

        if (!appended) {
          throw new Error(
            "Invalid chart. Existing dashboard kept."
          );
        }

        setPrompt("");
        setNotice("AI chart appended.");
      } else {
        const generated =
          DashboardPlanSchema.parse(body.plan);

        const valid = validateDashboardPlan(
          generated,
          dataset
        );

        if (
          valid.charts.length !==
            generated.charts.length ||
          valid.metrics.length !==
            generated.metrics.length
        ) {
          throw new Error("Invalid plan fields.");
        }

        store.setPlan(
          dataset.id,
          valid,
          "gemini"
        );

        setFilters({});

        setNotice(
          "Dashboard generated. Review any request limitations below."
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Request failed."
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      ref={root}
      className={
        focus
          ? "if-dashboard fixed inset-0 z-[100] overflow-auto bg-slate-50 p-4 sm:p-6"
          : "if-dashboard min-w-0 space-y-5"
      }
    >
      <div className="space-y-5">
        <header className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="break-words text-2xl font-bold">
              {plan.title}
            </h1>

            <p className="break-all text-xs text-slate-500">
              {dataset.name} | {dataset.rowCount} rows
            </p>
          </div>

          <div className="if-dashboard-actions flex flex-wrap items-start gap-2">
            {draft ? (
              <>
                <button
                  className={button}
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </button>

                <button
                  className={button}
                  onClick={save}
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    setDraft(structuredClone(current))
                  }
                >
                  Edit
                </button>

                <GenerateReportButton
                  dataset={dataset}
                  plan={current}
                  filters={filters}
                  disabled={busy}
                />

                <Link
                  href="/reports"
                  className={button}
                >
                  Reports
                </Link>
              </>
            )}

            <button
              className={button}
              onClick={() => void fullscreen()}
            >
              {focus ? "Exit Fullscreen" : "Fullscreen"}
            </button>
          </div>
        </header>
        <ReportGenerationStatus />

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="rounded-lg bg-emerald-50 p-3 text-sm"
          >
            {notice}
          </p>
        )}

        {(plan.warnings ?? []).map(
          (warning, index) => (
            <p
              key={index}
              className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
            >
              {warning}
            </p>
          )
        )}

        {!draft && !focus && (
          <section className="space-y-3 rounded-xl border bg-white p-4">
            <h2 className="font-semibold">
              AI dashboard planner
            </h2>
            
            <SupportedChartTypes mode="dashboard" />

            <p className="text-xs text-slate-500">
              Use numbered chart requests to enforce types.
              Missing fields are reported instead of silently
              substituted. Generate replaces the layout.
            </p>

            <textarea
              aria-label="Dashboard prompt"
              rows={5}
              maxLength={6000}
              value={goal}
              onChange={(event) =>
                setGoal(event.target.value)
              }
              className="w-full rounded-lg border p-3 text-sm"
            />

            <p className="text-xs text-slate-500">
              {goal.length} / 6,000 characters
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                className={button}
                disabled={
                  busy || goal.trim().length < 3
                }
                onClick={() =>
                  void generate("dashboard")
                }
              >
                {busy
                  ? "Working…"
                  : "Generate / Replace Dashboard"}
              </button>

              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  store.setPlan(
                    dataset.id,
                    fallback,
                    "rules"
                  );
                  setFilters({});
                }}
              >
                Use Rule-Based
              </button>

              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  store.resetPlan();
                  setFilters({});
                }}
              >
                Reset Edits
              </button>
            </div>

            <h3 className="pt-2 font-semibold">
              Add one chart with AI
            </h3>

            <SupportedChartTypes mode="chart" />

            <textarea
              aria-label="Chart prompt"
              rows={2}
              maxLength={6000}
              value={prompt}
              onChange={(event) =>
                setPrompt(event.target.value)
              }
              className="w-full rounded-lg border p-3 text-sm"
            />

            <button
              className={button}
              disabled={
                busy || prompt.trim().length < 3
              }
              onClick={() =>
                void generate("add-chart")
              }
            >
              Add Chart with AI
            </button>
          </section>
        )}

        {draft ? (
          <section className="space-y-3 rounded-xl border bg-white p-4">
            <label className="block text-sm">
              Dashboard title
              <input
                className="mt-1 w-full rounded border p-2"
                value={plan.title}
                onChange={(event) =>
                  mutate((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
              />
            </label>

            <label className="block text-sm">
              Description
              <textarea
                className="mt-1 w-full rounded border p-2"
                value={plan.description}
                onChange={(event) =>
                  mutate((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
              />
            </label>
          </section>
        ) : (
          <p className="text-sm text-slate-500">
            {plan.description}
          </p>
        )}

        <section className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex justify-between">
            <h2 className="font-semibold">
              Filters
            </h2>

            <button
              onClick={() => setFilters({})}
              className="text-sm text-indigo-600"
            >
              Clear Filters
            </button>
          </div>

          {draft && (
            <div className="mb-3 flex flex-wrap gap-3">
              {categories.map((field) => (
                <label
                  key={field}
                  className="text-sm"
                >
                  <input
                    type="checkbox"
                    checked={plan.filters.includes(field)}
                    disabled={
                      !plan.filters.includes(field) &&
                      plan.filters.length >= 3
                    }
                    onChange={(event) =>
                      mutate((previous) => ({
                        ...previous,
                        filters: event.target.checked
                          ? [...previous.filters, field]
                          : previous.filters.filter(
                              (item) => item !== field
                            ),
                      }))
                    }
                  />
                  {" "}
                  {field}
                </label>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {plan.filters.map((field) => (
              <Select
                key={field}
                label={field}
                value={
                  filters[field] ?? "__all__"
                }
                options={[
                  "__all__",
                  ...[
                    ...new Set(
                      dataset.rows.map(
                        (row) =>
                          row[field]?.trim() ||
                          "Unknown"
                      )
                    ),
                  ].sort(),
                ]}
                onChange={(value) =>
                  setFilters((previous) => ({
                    ...previous,
                    [field]: value,
                  }))
                }
              />
            ))}
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {rows.length} / {dataset.rowCount} records
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">
              KPIs
            </h2>

            {draft && (
              <button
                className={button}
                disabled={
                  plan.metrics.length >= 4 ||
                  !fields.length
                }
                onClick={() =>
                  mutate((previous) => ({
                    ...previous,

                    metrics: [
                      ...previous.metrics,
                      {
                        id: crypto.randomUUID(),
                        title: "New KPI",
                        field: numeric[0] ?? fields[0],
                        aggregation: numeric.length
                          ? "sum"
                          : "count",
                      },
                    ],
                  }))
                }
              >
                Add KPI
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {plan.metrics.map((metric) => (
              <div
                key={metric.id}
                className="min-w-0 space-y-2 rounded-xl border bg-white p-4"
              >
                {draft ? (
                  <>
                    <input
                      aria-label="KPI title"
                      className="w-full rounded border p-2 text-sm"
                      value={metric.title}
                      onChange={(event) =>
                        mutate((previous) => ({
                          ...previous,

                          metrics: previous.metrics.map(
                            (item) =>
                              item.id === metric.id
                                ? {
                                    ...item,
                                    title: event.target.value,
                                  }
                                : item
                          ),
                        }))
                      }
                    />

                    <Select
                      label="Aggregation"
                      value={metric.aggregation}
                      options={operations}
                      onChange={(value) =>
                        mutate((previous) => ({
                          ...previous,

                          metrics: previous.metrics.map(
                            (item) =>
                              item.id === metric.id
                                ? {
                                    ...item,
                                    aggregation:
                                      value as Operation,
                                  }
                                : item
                          ),
                        }))
                      }
                    />

                    <Select
                      label="Field"
                      value={metric.field}
                      options={fields}
                      onChange={(value) =>
                        mutate((previous) => ({
                          ...previous,

                          metrics: previous.metrics.map(
                            (item) =>
                              item.id === metric.id
                                ? {
                                    ...item,
                                    field: value,
                                  }
                                : item
                          ),
                        }))
                      }
                    />

                    <button
                      className="text-sm text-red-600"
                      onClick={() =>
                        mutate((previous) => ({
                          ...previous,

                          metrics:
                            previous.metrics.filter(
                              (item) =>
                                item.id !== metric.id
                            ),
                        }))
                      }
                    >
                      Remove KPI
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm text-slate-500">
                      {metric.title}
                    </h3>

                    <p className="text-2xl font-bold">
                      {formatValue(
                        aggregate(
                          rows,
                          metric.field,
                          metric.aggregation
                        )
                      )}
                    </p>

                    <p className="text-xs text-slate-500">
                      {metric.aggregation} of {metric.field}
                    </p>
                  </>
                )}
              </div>
            ))}

            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm text-slate-500">
                Matching Records
              </h3>

              <p className="mt-2 text-2xl font-bold">
                {rows.length.toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">
              Visualizations
            </h2>

            {draft && (
              <button
                className={button}
                disabled={!dimensions.length}
                onClick={() =>
                  mutate((previous) => ({
                    ...previous,

                    charts: [
                      ...previous.charts,
                      {
                        id: crypto.randomUUID(),
                        title: "New Chart",
                        type: "bar",
                        dimension: dimensions[0],
                        measure: numeric[0] ?? fields[0],
                        aggregation: numeric.length
                          ? "sum"
                          : "count",
                        series: "",
                        requestId: "",
                        emphasis: "",
                      },
                    ],
                  }))
                }
              >
                Add Chart
              </button>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {plan.charts.map((chart, index) => {
              const data = buildChartData(
                rows,
                chart,
                dataset
              );

              return (
                <div
                  key={chart.id}
                  className="min-w-0 space-y-3 rounded-xl border bg-white p-4"
                >
                  {draft && (
                    <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                      <div className="flex flex-wrap gap-3">
                        <button
                          disabled={index === 0}
                          onClick={() =>
                            mutate((previous) => {
                              const charts = [
                                ...previous.charts,
                              ];

                              [
                                charts[index - 1],
                                charts[index],
                              ] = [
                                charts[index],
                                charts[index - 1],
                              ];

                              return {
                                ...previous,
                                charts,
                              };
                            })
                          }
                        >
                          Move up
                        </button>

                        <button
                          disabled={
                            index ===
                            plan.charts.length - 1
                          }
                          onClick={() =>
                            mutate((previous) => {
                              const charts = [
                                ...previous.charts,
                              ];

                              [
                                charts[index + 1],
                                charts[index],
                              ] = [
                                charts[index],
                                charts[index + 1],
                              ];

                              return {
                                ...previous,
                                charts,
                              };
                            })
                          }
                        >
                          Move down
                        </button>

                        <button
                          className="text-red-600"
                          onClick={() =>
                            mutate((previous) => ({
                              ...previous,

                              charts:
                                previous.charts.filter(
                                  (item) =>
                                    item.id !== chart.id
                                ),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        aria-label="Chart title"
                        className="w-full rounded border p-2 text-sm"
                        value={chart.title}
                        onChange={(event) =>
                          editChart(chart.id, {
                            title: event.target.value,
                          })
                        }
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Select
                          label="Chart type"
                          value={chart.type}
                          options={types}
                          onChange={(value) =>
                            editChart(chart.id, {
                              type:
                                value as ChartConfig["type"],
                            })
                          }
                        />

                        <Select
                          label={
                            chart.type === "scatter"
                              ? "X field"
                              : "Dimension"
                          }
                          value={chart.dimension}
                          options={
                            chart.type === "scatter"
                              ? numeric
                              : dimensions
                          }
                          onChange={(value) =>
                            editChart(chart.id, {
                              dimension: value,
                            })
                          }
                        />

                        <Select
                          label={
                            chart.type === "scatter"
                              ? "Y field"
                              : "Measure"
                          }
                          value={chart.measure}
                          options={
                            chart.type === "scatter"
                              ? numeric
                              : fields
                          }
                          onChange={(value) =>
                            editChart(chart.id, {
                              measure: value,
                            })
                          }
                        />

                        {chart.type !== "scatter" && (
                          <Select
                            label="Aggregation"
                            value={chart.aggregation}
                            options={operations}
                            onChange={(value) =>
                              editChart(chart.id, {
                                aggregation:
                                  value as Operation,
                              })
                            }
                          />
                        )}

                        {chart.type === "stacked" && (
                          <Select
                            label="Series / grouping field"
                            value={chart.series}
                            options={[
                              "",
                              ...dimensions.filter(
                                (field) =>
                                  field !==
                                  chart.dimension
                              ),
                            ]}
                            onChange={(value) =>
                              editChart(chart.id, {
                                series: value,
                              })
                            }
                          />
                        )}
                      </div>

                      <input
                        aria-label="Chart explanation"
                        className="w-full rounded border p-2 text-sm"
                        value={chart.emphasis}
                        onChange={(event) =>
                          editChart(chart.id, {
                            emphasis: event.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <h3 className="break-words font-semibold">
                    {chart.title}
                  </h3>

                  <p className="text-xs text-slate-500">
                    {chart.emphasis}
                  </p>

                  <Visualization
                    chart={chart}
                    data={data.points}
                    series={data.series}
                  />

                  <p className="text-xs text-slate-500">
                    {data.note}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-xs text-slate-500">
          Session only. Refreshing clears datasets, edits
          and reports. Additional charts have no fixed
          count limit; larger dashboards can be slower.
          Bar means horizontal; column means vertical.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const dataset = useDatasetStore(
    (state) => state.dataset
  );

  return dataset ? (
    <Content
      key={dataset.id}
      dataset={dataset}
    />
  ) : (
    <div className="rounded-xl border bg-white p-8">
      <h1 className="text-xl font-semibold">
        No dataset in this session
      </h1>

      <Link
        href="/upload"
        className="mt-3 inline-block text-indigo-600"
      >
        Upload CSV or XLSX
      </Link>
    </div>
  );
}