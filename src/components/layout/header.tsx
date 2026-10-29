
"use client";

import { usePathname } from "next/navigation";
import { CircleUserRound } from "lucide-react";

const titles: Record<string, string> = {
  "/": "Overview",
  "/dashboard": "Dashboard",
  "/upload": "Upload Data",
  "/datasets": "Datasets",
  "/reports": "Reports",
};

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white py-3 pl-16 pr-4 sm:pr-6 md:pl-6">
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-slate-900 sm:text-xl">
          {titles[pathname] ?? "InsightForge AI"}
        </h2>

        <p className="hidden text-sm text-slate-500 sm:block">
          Your intelligent business analytics workspace
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-slate-600">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-medium text-slate-700">
            Demo Workspace
          </p>
          <p className="text-xs text-slate-400">
            Portfolio project
          </p>
        </div>

        <CircleUserRound size={28} />
      </div>
    </header>
  );
}
