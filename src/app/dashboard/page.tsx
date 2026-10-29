
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowDown, ArrowUp, Check, Database,
  Expand, Shrink, Loader2, Pencil, Plus,
  RotateCcw, Save, Sparkles, Trash2, X,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  AreaChart, Area, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";

import { useDatasetStore } from "@/store/useDatasetStore";
import { useDashboardPlanStore } from "@/store/useDashboardPlanStore";
import {
  DashboardPlanSchema, createFallbackPlan,
  validateDashboardPlan,
  type DashboardPlan,
} from "@/lib/dashboard-plan";
import { formatValue, parseNumericValue } from "@/lib/analytics";
import type { DataRow, Dataset } from "@/types/dataset";

type Metric = DashboardPlan["metrics"][number];
type ChartConfig = DashboardPlan["charts"][number];
type Operation = Metric["aggregation"];
type ChartType = ChartConfig["type"];

const ALL = "__all__";
const CHART_TYPES: ChartType[] = [
  "bar", "line", "area", "donut"
];
const COLORS = [
  "#6366f1", "#0d9488", "#f59e0b",
  "#ec4899", "#8b5cf6", "#0284c7",
  "#84cc16", "#f97316"
];

function aggregate(
  rows: DataRow[], field: string, operation: Operation
): number {
  if (operation === "count") {
    return rows.filter(
      r => (r[field] ?? "").trim() !== ""
    ).length;
  }

  const values = rows
    .map(r => parseNumericValue(r[field]))
    .filter((n): n is number => n !== null);

  if (!values.length) return 0;
  const total = values.reduce((a, b) => a + b, 0);
  return operation === "average"
    ? total / values.length
    : total;
}

function chartData(
  rows: DataRow[],
  chart: ChartConfig,
  dataset: Dataset
) {
  const type = dataset.columns.find(
    c => c.name === chart.dimension
  )?.type;

  const groups = new Map<string, DataRow[]>();

  for (const row of rows) {
    const raw = (row[chart.dimension] ?? "").trim();
    const key = type === "date"
      ? (/^\d{4}-\d{2}-\d{2}$/.test(raw)
          ? raw.slice(0, 7) : "")
      : raw || "Unknown";

    if (!key) continue;
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  const points = [...groups.entries()].map(
    ([name, group]) => ({
      name,
      value: aggregate(
        group, chart.measure, chart.aggregation
      ),
    })
  );

  if (type === "date") {
    return points.sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }

  return points
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}

function FieldSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-900"
      >
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function Visualization({
  chart, rows, dataset,
}: {
  chart: ChartConfig;
  rows: DataRow[];
  dataset: Dataset;
}) {
  const data = chartData(rows, chart, dataset);
  const dimensionType = dataset.columns.find(
    c => c.name === chart.dimension
  )?.type;

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        No matching data
      </div>
    );
  }

  if (chart.type === "donut") {
    const invalid =
      data.some(p => p.value < 0) ||
      data.every(p => p.value === 0);

    if (invalid) {
      return (
        <div className="flex h-64 items-center justify-center p-4 text-center text-sm text-amber-700">
          A donut chart requires nonnegative values
          with a positive total. Try a bar chart.
        </div>
      );
    }
  }

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === "donut" ? (
          <PieChart>
            <Pie
              data={data.filter(p => p.value > 0)}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="48%"
              outerRadius="76%"
              paddingAngle={2}
            >
              {data.filter(p => p.value > 0).map((p, i) => (
                <Cell
                  key={p.name}
                  fill={COLORS[i % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={v => formatValue(Number(v ?? 0))}
            />
          </PieChart>
        ) : chart.type === "area" ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              minTickGap={18}
            />
            <YAxis width={55} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              fill="#c7d2fe"
              strokeWidth={2}
            />
          </AreaChart>
        ) : chart.type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              minTickGap={18}
            />
            <YAxis width={55} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        ) : (
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 5, right: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={85}
              tick={{ fontSize: 10 }}
            />
            <Tooltip />
            <Bar
              dataKey="value"
              fill="#6366f1"
              radius={[0, 5, 5, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
      {dimensionType !== "date" && data.length > 8 && (
        <p className="text-center text-xs text-slate-400">
          Showing up to 15 categories
        </p>
      )}
    </div>
  );
}

function DashboardContent({ dataset }: { dataset: Dataset }) {
  const saved = useDashboardPlanStore(s => s.plan);
  const savedId = useDashboardPlanStore(s => s.datasetId);
  const source = useDashboardPlanStore(s => s.source);
  const setPlan = useDashboardPlanStore(s => s.setPlan);
  const updatePlan = useDashboardPlanStore(s => s.updatePlan);
  const resetPlan = useDashboardPlanStore(s => s.resetPlan);

  const fallback = useMemo(
    () => createFallbackPlan(dataset), [dataset]
  );
  const current =
    savedId === dataset.id && saved ? saved : fallback;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DashboardPlan | null>(null);
  const [goal, setGoal] = useState(
    "Analyze important business KPIs, trends and categories."
  );
  const [filters, setFilters] =
    useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [focusMode, setFocusMode] = useState(false);

  const presentationRef = useRef<HTMLDivElement>(null);
  const plan = editing && draft ? draft : current;

  const fields = dataset.columns.map(c => c.name);
  const numbers = dataset.columns.filter(
    c => c.type === "number"
  ).map(c => c.name);
  const dimensions = dataset.columns.filter(
    c => c.type !== "empty"
  ).map(c => c.name);
  const categories = dataset.columns.filter(
    c => ["text", "boolean"].includes(c.type) &&
      c.uniqueCount > 1 && c.uniqueCount <= 30
  ).map(c => c.name);

  const filteredRows = useMemo(
    () => dataset.rows.filter(row =>
      plan.filters.every(field => {
        const selected = filters[field] ?? ALL;
        return selected === ALL ||
          (row[field]?.trim() || "Unknown") === selected;
      })
    ),
    [dataset, filters, plan.filters]
  );

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setFocusMode(false);
      }
    }
    document.addEventListener(
      "fullscreenchange", handleFullscreenChange
    );
    return () => document.removeEventListener(
      "fullscreenchange", handleFullscreenChange
    );
  }, []);

  async function toggleFocus() {
    if (focusMode) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      setFocusMode(false);
      return;
    }

    setFocusMode(true);

    const element = presentationRef.current;
    if (element?.requestFullscreen) {
      // On unsupported browsers, CSS focus mode remains.
      await element.requestFullscreen().catch(() => {});
    }
  }

  function changeDraft(
    fn: (p: DashboardPlan) => DashboardPlan
  ) {
    setDraft(p => p ? fn(p) : p);
  }

  function startEditing() {
    setDraft(structuredClone(current));
    setEditing(true);
    setError("");
    setNotice("");
  }

  function saveChanges() {
    if (!draft) return;

    const parsed = DashboardPlanSchema.safeParse(draft);
    if (!parsed.success) {
      setError("Invalid dashboard configuration.");
      return;
    }

    const valid = validateDashboardPlan(parsed.data, dataset);

    if (
      valid.metrics.length !== draft.metrics.length ||
      valid.charts.length !== draft.charts.length ||
      valid.filters.length !== draft.filters.length
    ) {
      setError("Some selected fields are incompatible.");
      return;
    }

    if (savedId !== dataset.id) {
      setPlan(dataset.id, valid, "rules");
    } else {
      updatePlan(valid);
    }

    setEditing(false);
    setDraft(null);
    setFilters({});
    setError("");
    setNotice("Dashboard saved for this session.");
  }

  function editMetric(id: string, changes: Partial<Metric>) {
    changeDraft(p => ({
      ...p,
      metrics: p.metrics.map(m =>
        m.id === id ? { ...m, ...changes } : m
      ),
    }));
  }

  function editChart(id: string, changes: Partial<ChartConfig>) {
    changeDraft(p => ({
      ...p,
      charts: p.charts.map(c =>
        c.id === id ? { ...c, ...changes } : c
      ),
    }));
  }

  function moveChart(index: number, direction: number) {
    changeDraft(p => {
      const to = index + direction;
      if (to < 0 || to >= p.charts.length) return p;

      const charts = [...p.charts];
      [charts[index], charts[to]] =
        [charts[to], charts[index]];

      return { ...p, charts };
    });
  }

  function addChart() {
    if (!dimensions.length || !fields.length) return;

    changeDraft(p => p.charts.length >= 6 ? p : ({
      ...p,
      charts: [...p.charts, {
        id: crypto.randomUUID(),
        title: "New Visualization",
        type: "bar",
        dimension: dimensions[0],
        measure: numbers[0] ?? fields[0],
        aggregation: numbers.length ? "sum" : "count",
        emphasis: "Compare values",
      }],
    }));
  }

  function addMetric() {
    if (!fields.length) return;

    changeDraft(p => p.metrics.length >= 4 ? p : ({
      ...p,
      metrics: [...p.metrics, {
        id: crypto.randomUUID(),
        title: "New KPI",
        field: numbers[0] ?? fields[0],
        aggregation: numbers.length ? "sum" : "count",
      }],
    }));
  }

  async function generateWithAI() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          dataset: {
            name: dataset.name,
            rowCount: dataset.rowCount,
            columns: dataset.columns.map(c => ({
              name: c.name, type: c.type,
              missingCount: c.missingCount,
              uniqueCount: c.uniqueCount,
            })),
          },
        }),
      });

      const body: unknown = await response.json();
      if (!response.ok) {
        if (
          typeof body === "object" && body !== null &&
          "error" in body && typeof body.error === "string"
        ) {
          throw new Error(body.error);
        }
        throw new Error("AI generation failed.");
      }

      if (
        typeof body !== "object" || body === null ||
        !("plan" in body)
      ) {
        throw new Error("Invalid AI response.");
      }

      const result = DashboardPlanSchema.parse(body.plan);
      const validated = validateDashboardPlan(result, dataset);

      if (!validated.metrics.length && !validated.charts.length) {
        throw new Error("AI returned no compatible widgets.");
      }

      setPlan(dataset.id, validated, "gemini");
      setEditing(false);
      setDraft(null);
      setFilters({});
      setNotice("AI dashboard generated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed.");
    } finally {
      setLoading(false);
    }
  }

  const buttonBase =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition";
  const outline = `${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
  const primary = `${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700`;

  return (
    <div
      ref={presentationRef}
      className={
        focusMode
          ? "fixed inset-0 z-[100] overflow-y-auto bg-slate-50 p-3 sm:p-6"
          : "min-w-0 space-y-6"
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold text-slate-900 sm:text-2xl">
              {plan.title}
            </h1>
            <p className="mt-1 break-all text-xs text-slate-500 sm:text-sm">
              {dataset.name} • {dataset.rowCount} rows
            </p>
            <p className="mt-1 text-xs text-indigo-600">
              {savedId === dataset.id && source === "gemini"
                ? "AI-generated dashboard"
                : "Rule-based dashboard"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  className={outline}
                  onClick={() => {
                    setEditing(false);
                    setDraft(null);
                  }}
                >
                  <X size={16} /> Cancel
                </button>
                <button className={primary} onClick={saveChanges}>
                  <Save size={16} /> Save
                </button>
              </>
            ) : (
              <button className={primary} onClick={startEditing}>
                <Pencil size={16} /> Edit
              </button>
            )}

            <button
              className={outline}
              onClick={() => void toggleFocus()}
            >
              {focusMode
                ? <Shrink size={16} />
                : <Expand size={16} />}
              {focusMode ? "Exit Fullscreen" : "Fullscreen"}
            </button>

            {!focusMode && (
              <Link href="/upload" className={outline}>
                <ArrowLeft size={16} /> Upload
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
            <Check size={16} className="mr-2 inline" />
            {notice}
          </div>
        )}

        {!editing && !focusMode && (
          <section className="rounded-xl border border-indigo-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles size={20} className="text-indigo-600" />
              AI Dashboard Generator
            </div>
            <textarea
              aria-label="Analysis goal"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              rows={2}
              maxLength={500}
              className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={primary}
                disabled={loading || goal.trim().length < 3}
                onClick={() => void generateWithAI()}
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Sparkles size={16} />}
                Generate with AI
              </button>
              <button
                className={outline}
                onClick={() => {
                  setPlan(dataset.id, fallback, "rules");
                  setFilters({});
                  setNotice("Rule-based dashboard loaded.");
                }}
                disabled={loading}
              >
                Use Rule-Based
              </button>
              <button
                className={outline}
                onClick={() => {
                  if (savedId === dataset.id) resetPlan();
                  setFilters({});
                  setNotice("Dashboard reset.");
                }}
              >
                <RotateCcw size={15} /> Reset Edits
              </button>
            </div>
          </section>
        )}

        {editing && draft ? (
          <section className="space-y-3 rounded-xl border bg-white p-4">
            <label className="block text-sm">
              Dashboard Title
              <input
                value={draft.title}
                onChange={e => changeDraft(p => ({
                  ...p, title: e.target.value
                }))}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="block text-sm">
              Description
              <textarea
                value={draft.description}
                onChange={e => changeDraft(p => ({
                  ...p, description: e.target.value
                }))}
                rows={2}
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
          </section>
        ) : (
          <p className="text-sm text-slate-500">{plan.description}</p>
        )}

        {/* Filters */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Dashboard Filters</h2>
            <button
              className="inline-flex items-center gap-1 text-sm text-indigo-600"
              onClick={() => setFilters({})}
            >
              <RotateCcw size={15} /> Clear Filters
            </button>
          </div>

          {editing && (
            <div className="mb-4 flex flex-wrap gap-3">
              {categories.map(field => (
                <label key={field} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={plan.filters.includes(field)}
                    disabled={
                      !plan.filters.includes(field) &&
                      plan.filters.length >= 3
                    }
                    onChange={e => changeDraft(p => ({
                      ...p,
                      filters: e.target.checked
                        ? [...p.filters, field]
                        : p.filters.filter(f => f !== field),
                    }))}
                  />
                  {field}
                </label>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.filters.map(field => {
              const values = [...new Set(dataset.rows.map(
                r => r[field]?.trim() || "Unknown"
              ))].sort();

              return (
                <FieldSelect
                  key={field}
                  label={field}
                  value={filters[field] ?? ALL}
                  options={[ALL, ...values]}
                  onChange={value => setFilters(p => ({
                    ...p, [field]: value
                  }))}
                />
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {filteredRows.length} / {dataset.rowCount} records
          </p>
        </section>

        {/* KPI Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">KPIs</h2>
            {editing && (
              <button
                className={outline}
                disabled={plan.metrics.length >= 4}
                onClick={addMetric}
              >
                <Plus size={16} /> Add KPI
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {plan.metrics.map(metric => (
              <div key={metric.id} className="min-w-0 rounded-xl border bg-white p-4 shadow-sm">
                {editing ? (
                  <div className="space-y-2">
                    <input
                      aria-label="KPI title"
                      value={metric.title}
                      onChange={e => editMetric(metric.id, {
                        title: e.target.value
                      })}
                      className="w-full rounded-lg border p-2 text-sm"
                    />
                    <FieldSelect
                      label="Aggregation"
                      value={metric.aggregation}
                      options={["sum", "average", "count"]}
                      onChange={value => editMetric(metric.id, {
                        aggregation: value as Operation,
                        field: value === "count"
                          ? metric.field
                          : numbers.includes(metric.field)
                            ? metric.field
                            : numbers[0] ?? metric.field,
                      })}
                    />
                    <FieldSelect
                      label="Field"
                      value={metric.field}
                      options={metric.aggregation === "count"
                        ? fields : numbers}
                      onChange={value => editMetric(metric.id, {
                        field: value
                      })}
                    />
                    <button
                      className="text-sm text-red-600"
                      onClick={() => changeDraft(p => ({
                        ...p,
                        metrics: p.metrics.filter(m => m.id !== metric.id),
                      }))}
                    >
                      <Trash2 size={15} className="inline" /> Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="break-words text-sm text-slate-500">
                      {metric.title}
                    </p>
                    <p className="mt-2 text-2xl font-bold tabular-nums">
                      {formatValue(aggregate(
                        filteredRows, metric.field, metric.aggregation
                      ))}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {metric.aggregation} • {metric.field}
                    </p>
                  </>
                )}
              </div>
            ))}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Matching Records</p>
              <p className="mt-2 text-2xl font-bold">
                {formatValue(filteredRows.length)}
              </p>
            </div>
          </div>
        </section>

        {/* Visualizations */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Visualizations</h2>
            {editing && (
              <button
                className={outline}
                disabled={plan.charts.length >= 6}
                onClick={addChart}
              >
                <Plus size={16} /> Add Chart
              </button>
            )}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {plan.charts.map((chart, index) => (
              <div
                key={chart.id}
                className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
              >
                {editing && (
                  <div className="mb-4 space-y-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        aria-label="Move chart up"
                        disabled={index === 0}
                        onClick={() => moveChart(index, -1)}
                        className="disabled:opacity-30"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        aria-label="Move chart down"
                        disabled={index === plan.charts.length - 1}
                        onClick={() => moveChart(index, 1)}
                        className="disabled:opacity-30"
                      >
                        <ArrowDown size={18} />
                      </button>
                      <button
                        aria-label="Remove chart"
                        className="text-red-600"
                        onClick={() => changeDraft(p => ({
                          ...p,
                          charts: p.charts.filter(c => c.id !== chart.id),
                        }))}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <input
                      aria-label="Chart title"
                      value={chart.title}
                      onChange={e => editChart(chart.id, {
                        title: e.target.value
                      })}
                      className="w-full rounded-lg border p-2 text-sm"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <FieldSelect
                        label="Chart Type"
                        value={chart.type}
                        options={CHART_TYPES}
                        onChange={value => editChart(chart.id, {
                          type: value as ChartType,
                          dimension: value === "donut" &&
                            !categories.includes(chart.dimension)
                              ? categories[0] ?? chart.dimension
                              : chart.dimension,
                        })}
                      />
                      <FieldSelect
                        label="Dimension"
                        value={chart.dimension}
                        options={chart.type === "donut"
                          ? categories : dimensions}
                        onChange={value => editChart(chart.id, {
                          dimension: value
                        })}
                      />
                      <FieldSelect
                        label="Aggregation"
                        value={chart.aggregation}
                        options={["sum", "average", "count"]}
                        onChange={value => editChart(chart.id, {
                          aggregation: value as Operation,
                          measure: value === "count"
                            ? chart.measure
                            : numbers.includes(chart.measure)
                              ? chart.measure
                              : numbers[0] ?? chart.measure,
                        })}
                      />
                      <FieldSelect
                        label="Measure"
                        value={chart.measure}
                        options={chart.aggregation === "count"
                          ? fields : numbers}
                        onChange={value => editChart(chart.id, {
                          measure: value
                        })}
                      />
                    </div>
                    <input
                      aria-label="Chart emphasis"
                      value={chart.emphasis}
                      onChange={e => editChart(chart.id, {
                        emphasis: e.target.value
                      })}
                      className="w-full rounded-lg border p-2 text-sm"
                      placeholder="Chart emphasis"
                    />
                  </div>
                )}

                <h3 className="break-words font-semibold text-slate-900">
                  {chart.title}
                </h3>
                <p className="mb-3 mt-1 text-xs text-slate-500">
                  {chart.emphasis}
                </p>
                <Visualization
                  chart={chart}
                  rows={filteredRows}
                  dataset={dataset}
                />
              </div>
            ))}
          </div>
          {!plan.charts.length && (
            <p className="rounded-lg border bg-white p-5 text-sm text-slate-500">
              No charts yet. Enter Edit Mode to add one.
            </p>
          )}
        </section>
        <p className="pb-4 text-xs text-slate-400">
          Calculations use uploaded data. Dashboard edits are
          stored in memory until database integration.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const dataset = useDatasetStore(s => s.dataset);

  if (!dataset) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center">
        <Database size={40} className="mx-auto text-slate-400" />
        <h2 className="mt-4 text-xl font-semibold">
          No dataset available
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Upload CSV or Excel data to create a dashboard.
        </p>
        <Link
          href="/upload"
          className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-3 text-sm text-white"
        >
          Upload Dataset
        </Link>
      </div>
    );
  }

  return (
    <DashboardContent
      key={dataset.id}
      dataset={dataset}
    />
  );
}
