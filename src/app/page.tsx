
"use client";

import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 48000 },
  { month: "Mar", revenue: 45000 },
  { month: "Apr", revenue: 56000 },
  { month: "May", revenue: 62000 },
  { month: "Jun", revenue: 73000 },
];

const categoryData = [
  { category: "Electronics", sales: 74000 },
  { category: "Clothing", sales: 52000 },
  { category: "Furniture", sales: 39000 },
  { category: "Accessories", sales: 28000 },
];

const kpis = [
  {
    label: "Total Revenue",
    value: "$326,000",
    change: "+12.5%",
    icon: DollarSign,
  },
  {
    label: "Total Orders",
    value: "2,456",
    change: "+8.2%",
    icon: ShoppingCart,
  },
  {
    label: "Customers",
    value: "1,284",
    change: "+6.4%",
    icon: Users,
  },
  {
    label: "Growth Rate",
    value: "18.6%",
    change: "+3.1%",
    icon: TrendingUp,
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Business Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Explore your business performance and insights.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Demo data — not connected to an uploaded dataset.
          </p>
        </div>

        <Link
          href="/upload"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Upload size={17} />
          Upload Dataset
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{kpi.label}</p>
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <Icon size={19} />
                </div>
              </div>

              <h3 className="mt-3 text-2xl font-bold text-slate-900">
                {kpi.value}
              </h3>

              <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <ArrowUpRight size={14} />
                {kpi.change} (illustrative)
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Revenue Trend
          </h2>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4f46e5"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Sales by Category
          </h2>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={65}
                />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="sales"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={22} />
          <h2 className="font-semibold text-indigo-900">
            AI Insights — Preview
          </h2>
        </div>

        <p className="mt-3 text-sm leading-7 text-indigo-900">
          The example revenue series increases from $42,000 in January
          to $73,000 in June. Once AI generation is connected, this
          section will explain verified findings from the uploaded data.
        </p>
      </div>
    </div>
  );
}
