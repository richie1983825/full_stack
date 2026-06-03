import { create } from 'zustand';
import { cmpApi, type BusinessSystemInfo, type NetworkMetric } from '../api/cmp';

const DEFAULT_DATE = '2026-05-13';

interface CmpStore {
  selectedDate: string;
  metrics: NetworkMetric[];
  businessSystem: BusinessSystemInfo | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setDate: (date: string) => void;
  fetchData: () => Promise<void>;
}

export const useCmpStore = create<CmpStore>((set, get) => ({
  selectedDate: DEFAULT_DATE,
  metrics: [],
  businessSystem: null,
  loading: false,
  error: null,
  initialized: false,

  setDate: (date: string) => {
    set({ selectedDate: date });
    void get().fetchData();
  },

  fetchData: async () => {
    const { selectedDate } = get();
    set({ loading: true, error: null });

    try {
      const [frame, businessSystem] = await Promise.all([
        cmpApi.getNetworkMetrics({ date: selectedDate }),
        cmpApi.getBusinessSystems({ id: '1' }),
      ]);

      set({
        metrics: frame.rows,
        businessSystem,
        loading: false,
        initialized: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '数据加载失败';
      set({
        loading: false,
        initialized: true,
        error: message,
      });
    }
  },
}));
