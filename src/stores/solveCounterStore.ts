import { create } from 'zustand';
import { loadConfig, saveConfig } from '../services/configService';

/** yyyy-mm-dd */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface DayRecord {
  date: string;       // yyyy-mm-dd
  count: number;      // total solves that day
  additions: number;  // how many + pressed that day
}

interface SolveCounterState {
  /** All daily records, keyed by yyyy-mm-dd */
  records: Record<string, DayRecord>;
  /** Today's running total */
  todayCount: number;
  /** Today's additions (max for minus guard) */
  todayAdditions: number;

  increment: () => void;
  decrement: () => void;
  loadFromDisk: () => Promise<void>;
  saveToDisk: () => Promise<void>;
}

const CONFIG_FILE = 'solve-counter.json';

export const useSolveCounterStore = create<SolveCounterState>((set, get) => ({
  records: {},
  todayCount: 0,
  todayAdditions: 0,

  increment: () => {
    const key = todayKey();
    const state = get();
    const rec = state.records[key] || { date: key, count: 0, additions: 0 };
    const updated: DayRecord = {
      ...rec,
      count: rec.count + 1,
      additions: rec.additions + 1,
    };
    const newRecords = { ...state.records, [key]: updated };
    set({
      records: newRecords,
      todayCount: updated.count,
      todayAdditions: updated.additions,
    });
    // Auto-save
    saveConfig(CONFIG_FILE, { records: newRecords }).catch(() => {});
  },

  decrement: () => {
    const key = todayKey();
    const state = get();
    const rec = state.records[key];
    if (!rec || rec.count <= 0) return; // Can't go below 0
    const updated: DayRecord = {
      ...rec,
      count: rec.count - 1,
    };
    const newRecords = { ...state.records, [key]: updated };
    set({
      records: newRecords,
      todayCount: updated.count,
      todayAdditions: updated.additions,
    });
    saveConfig(CONFIG_FILE, { records: newRecords }).catch(() => {});
  },

  loadFromDisk: async () => {
    try {
      const data = await loadConfig<{ records: Record<string, DayRecord> }>(CONFIG_FILE);
      if (data?.records) {
        const key = todayKey();
        const todayRec = data.records[key];
        set({
          records: data.records,
          todayCount: todayRec?.count ?? 0,
          todayAdditions: todayRec?.additions ?? 0,
        });
      }
    } catch {
      // Use defaults
    }
  },

  saveToDisk: async () => {
    const { records } = get();
    await saveConfig(CONFIG_FILE, { records }).catch(() => {});
  },
}));
