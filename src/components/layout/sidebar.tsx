
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BarChart3,
  Database,
  FileText,
  LayoutDashboard,
  UploadCloud,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Upload Data", href: "/upload", icon: UploadCloud },
  { name: "Datasets", href: "/datasets", icon: Database },
  { name: "Reports", href: "/reports", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="mb-9 flex items-center gap-3">
        <div className="rounded-xl bg-indigo-600 p-2 text-white">
          <Sparkles size={22} />
        </div>

        <div>
          <h1 className="text-lg font-bold text-slate-900">
            InsightForge
          </h1>
          <p className="text-xs text-slate-500">
            AI Analytics
          </p>
        </div>
      </div>

      <nav className="space-y-2" aria-label="Main navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl bg-indigo-50 p-4">
        <p className="text-sm font-semibold text-indigo-900">
          AI Dashboard Builder
        </p>
        <p className="mt-1 text-xs text-indigo-700">
          Turn your datasets into interactive insights.
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-5 z-30 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm md:hidden"
      >
        <Menu size={22} />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        {navContent}
      </aside>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-900/50"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white p-5 shadow-xl"
          >
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
