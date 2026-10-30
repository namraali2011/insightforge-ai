
import { useDashboardPlanStore } from "@/store/useDashboardPlanStore";
import { create } from "zustand";
import type { Dataset } from "@/types/dataset";

interface DatasetStore {
  dataset: Dataset | null;
  setDataset: (dataset: Dataset) => void;
  clearDataset: () => void;
}

export const useDatasetStore = create<DatasetStore>()(
  (set) => ({
    dataset: null,

    setDataset: (dataset) => {
      useDashboardPlanStore.getState().clearPlan();
      set({ dataset });
    },

    clearDataset: () => {
      useDashboardPlanStore.getState().clearPlan();
      set({ dataset: null });
    },
  })
);
