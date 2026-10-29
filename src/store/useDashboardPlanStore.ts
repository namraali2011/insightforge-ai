
import { create } from "zustand";
import type { DashboardPlan } from "@/lib/dashboard-plan";

type PlanSource = "gemini" | "rules";

interface DashboardPlanStore {
  datasetId: string | null;
  plan: DashboardPlan | null;
  originalPlan: DashboardPlan | null;
  source: PlanSource;

  setPlan: (
    datasetId: string,
    plan: DashboardPlan,
    source: PlanSource
  ) => void;

  updatePlan: (plan: DashboardPlan) => void;
  resetPlan: () => void;
  clearPlan: () => void;
}

function clonePlan(plan: DashboardPlan): DashboardPlan {
  return JSON.parse(JSON.stringify(plan)) as DashboardPlan;
}

export const useDashboardPlanStore =
  create<DashboardPlanStore>()((set, get) => ({
    datasetId: null,
    plan: null,
    originalPlan: null,
    source: "rules",

    setPlan: (datasetId, plan, source) => {
      set({
        datasetId,
        plan: clonePlan(plan),
        originalPlan: clonePlan(plan),
        source,
      });
    },

    updatePlan: (plan) => {
      if (!get().datasetId) return;

      set({
        plan: clonePlan(plan),
      });
    },

    resetPlan: () => {
      const original = get().originalPlan;

      if (!original) return;

      set({
        plan: clonePlan(original),
      });
    },

    clearPlan: () => {
      set({
        datasetId: null,
        plan: null,
        originalPlan: null,
        source: "rules",
      });
    },
  }));
