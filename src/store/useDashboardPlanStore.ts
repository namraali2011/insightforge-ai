
import { create } from "zustand";
import type { DashboardPlan } from "@/lib/dashboard-plan";
import { createFallbackPlan, ChartSchema, validateDashboardPlan } from "@/lib/dashboard-plan";
import type { Dataset } from "@/types/dataset";

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
  appendChart: (dataset: Dataset, chart: unknown) => boolean;
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

    appendChart: (dataset, input) => {
      const result = ChartSchema.safeParse(input);
      if (!result.success) return false;
      const state = get();
      const sameDataset = state.datasetId === dataset.id && state.plan !== null;
      const base = sameDataset ? state.plan! : createFallbackPlan(dataset);
      const chart = { ...result.data, id: crypto.randomUUID() };
      if (validateDashboardPlan({ ...base, charts: [chart] }, dataset).charts.length !== 1) return false;
      set({ datasetId: dataset.id,
        plan: clonePlan({ ...base, charts: [...base.charts, chart] }),
        originalPlan: sameDataset ? state.originalPlan : clonePlan(base),
        source: sameDataset ? state.source : "rules",
      });
      return true;
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
