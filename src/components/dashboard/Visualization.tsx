"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import type { ChartConfig } from "@/lib/dashboard-plan";
import type { Point } from "@/lib/dashboard-data";

export const COLORS = [
  "#6366f1",
  "#0d9488",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#0284c7",
  "#84cc16",
  "#f97316",
  "#475569",
  "#991b1b",
  "#0369a1",
  "#166534",
];

export function Visualization({
  chart,
  data,
  series = [],
  className,
  staticRender = false,
}: {
  chart: ChartConfig;
  data: Point[];
  series?: string[];
  className?: string;
  staticRender?: boolean;
  dimensionType?: string;
}) {
  if (!data.length) {
    return (
      <div className="p-8 text-sm text-slate-500">
        No valid data for this chart.
      </div>
    );
  }

  if (
    chart.type === "donut" &&
    (
      data.some((point) => point.value < 0) ||
      !data.some((point) => point.value > 0)
    )
  ) {
    return (
      <p className="p-8">
        Donut requires nonnegative values and a positive total.
      </p>
    );
  }

  const horizontal = chart.type === "bar";

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" />

      <XAxis
        type={horizontal ? "number" : "category"}
        dataKey={horizontal ? undefined : "name"}
        tick={{ fontSize: 10 }}
        minTickGap={20}
      />

      <YAxis
        type={horizontal ? "category" : "number"}
        dataKey={horizontal ? "name" : undefined}
        width={horizontal ? 95 : 60}
        tick={{ fontSize: 10 }}
      />

      <Tooltip />
    </>
  );

  return (
    <div className={className ?? "h-72 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === "scatter" ? (
          <ScatterChart
            margin={{
              top: 10,
              right: 20,
              bottom: 20,
              left: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              type="number"
              dataKey="x"
              name={chart.dimension}
              tick={{ fontSize: 10 }}
              label={{
                value: chart.dimension,
                position: "insideBottom",
                offset: -12,
              }}
            />

            <YAxis
              type="number"
              dataKey="value"
              name={chart.measure}
              width={65}
              tick={{ fontSize: 10 }}
            />

            <Tooltip cursor={{ strokeDasharray: "3 3" }} />

            <Scatter
              data={data}
              fill={COLORS[0]}
              isAnimationActive={!staticRender}
            />
          </ScatterChart>
        ) : chart.type === "donut" ? (
          <PieChart>
            <Pie
              data={data.filter((point) => point.value > 0)}
              dataKey="value"
              nameKey="name"
              innerRadius="45%"
              outerRadius="72%"
              isAnimationActive={!staticRender}
            >
              {data
                .filter((point) => point.value > 0)
                .map((point, index) => (
                  <Cell
                    key={point.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
            </Pie>

            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        ) : chart.type === "line" ? (
          <LineChart data={data}>
            {axes}
            <Line
              dataKey="value"
              stroke={COLORS[0]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={!staticRender}
            />
          </LineChart>
        ) : chart.type === "area" ? (
          <AreaChart data={data}>
            {axes}
            <Area
              dataKey="value"
              stroke={COLORS[0]}
              fill="#c7d2fe"
              isAnimationActive={!staticRender}
            />
          </AreaChart>
        ) : (
          <BarChart
            data={data}
            layout={horizontal ? "vertical" : "horizontal"}
          >
            {axes}

            {chart.type === "stacked" ? (
              series.map((name, index) => (
                <Bar
                  key={name}
                  name={name}
                  dataKey={(point: Point) =>
                    point.values?.[name] ?? 0
                  }
                  stackId="stack"
                  fill={COLORS[index % COLORS.length]}
                  isAnimationActive={!staticRender}
                />
              ))
            ) : (
              <Bar
                dataKey="value"
                fill={COLORS[0]}
                isAnimationActive={!staticRender}
              />
            )}

            {chart.type === "stacked" && (
              <Legend wrapperStyle={{ fontSize: 10 }} />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}