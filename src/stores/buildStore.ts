import { create } from 'zustand';
import type { BuildProfile, CompileResult, RunResult, TestCase, Verdict } from '../types';
import { defaultBuildProfiles } from '../config/defaultBuildProfiles';
import { generateId } from '../utils/fileUtils';

const PROFILES_STORAGE_KEY = 'doom-code-build-profiles';
const PROFILES_VERSION_KEY = 'doom-code-build-profiles-v';
const CURRENT_PROFILES_VERSION = 3;

function migrateLegacyProfile(profile: BuildProfile): BuildProfile {
  return {
    ...profile,
    id: profile.id === 'vikas' ? 'doom' : profile.id,
    name: profile.name === 'Vikas' ? 'Doom' : profile.name,
  };
}

function loadStoredProfiles(): BuildProfile[] | null {
  try {
    const version = localStorage.getItem(PROFILES_VERSION_KEY);
    // If version doesn't match, discard old profiles and use defaults
    if (version !== String(CURRENT_PROFILES_VERSION)) {
      localStorage.removeItem(PROFILES_STORAGE_KEY);
      localStorage.setItem(PROFILES_VERSION_KEY, String(CURRENT_PROFILES_VERSION));
      return null;
    }
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      const profiles = JSON.parse(raw) as BuildProfile[];
      // Ensure all profiles have mode field
      return profiles.map((p) => {
        const migrated = migrateLegacyProfile(p);
        return {
          ...migrated,
          mode: migrated.mode || 'file',
          customCommand: migrated.customCommand || undefined,
        };
      });
    }
  } catch {}
  return null;
}

function saveStoredProfiles(profiles: BuildProfile[]) {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  localStorage.setItem(PROFILES_VERSION_KEY, String(CURRENT_PROFILES_VERSION));
}

interface BuildState {
  profiles: BuildProfile[];
  activeProfileId: string;
  compilerPath: string;
  compiling: boolean;
  running: boolean;
  buildVisualState: 'idle' | 'running' | 'success' | 'failure';
  buildVisualToken: number;
  warningCount: number;
  errorCount: number;
  killed: boolean;
  compileResult: CompileResult | null;
  runResult: RunResult | null;
  testCases: TestCase[];
  activeTestCaseId: string | null;
  autoRun: boolean;
  showDiff: boolean;

  setActiveProfile: (id: string) => void;
  getActiveProfile: () => BuildProfile;
  setCompilerPath: (path: string) => void;
  setCompiling: (v: boolean) => void;
  setRunning: (v: boolean) => void;
  setBuildVisualState: (state: 'idle' | 'running' | 'success' | 'failure') => void;
  pulseBuildVisualState: (state: 'success' | 'failure') => void;
  setDiagnostics: (warningCount: number, errorCount: number) => void;
  setKilled: (v: boolean) => void;
  setCompileResult: (r: CompileResult | null) => void;
  setRunResult: (r: RunResult | null) => void;

  // Profile CRUD
  addProfile: (profile: Omit<BuildProfile, 'id'>) => void;
  updateProfile: (id: string, updates: Partial<BuildProfile>) => void;
  removeProfile: (id: string) => void;
  resetProfiles: () => void;

  addTestCase: () => void;
  removeTestCase: (id: string) => void;
  updateTestCase: (id: string, updates: Partial<TestCase>) => void;
  setActiveTestCase: (id: string | null) => void;
  setTestVerdict: (id: string, verdict: Verdict, actualOutput?: string, executionTime?: number) => void;
  clearAllVerdicts: () => void;
  duplicateTestCase: (id: string) => void;
  importTestCases: (cases: { input: string; expectedOutput: string }[]) => void;

  setAutoRun: (v: boolean) => void;
  setShowDiff: (v: boolean) => void;
}

const storedProfiles = loadStoredProfiles();
const initialProfiles = storedProfiles ?? defaultBuildProfiles;
const initialActiveProfileId =
  initialProfiles.find((p) => p.id === 'doom')?.id ??
  initialProfiles.find((p) => p.isDefault)?.id ??
  initialProfiles[0]?.id ??
  '';

export const useBuildStore = create<BuildState>((set, get) => ({
  profiles: initialProfiles,
  activeProfileId: initialActiveProfileId,
  compilerPath: 'g++',
  compiling: false,
  running: false,
  buildVisualState: 'idle',
  buildVisualToken: 0,
  warningCount: 0,
  errorCount: 0,
  killed: false,
  compileResult: null,
  runResult: null,
  testCases: [
    {
      id: generateId(),
      name: 'Test 1',
      input: '',
      expectedOutput: '',
      actualOutput: '',
      verdict: 'pending' as Verdict,
      executionTime: null,
      stderr: '',
    },
  ],
  activeTestCaseId: null,
  autoRun: true,
  showDiff: true,

  setActiveProfile: (id) => set({ activeProfileId: id }),

  getActiveProfile: () => {
    const state = get();
    return state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];
  },

  setCompilerPath: (path) => set({ compilerPath: path }),

  setCompiling: (v) => set({ compiling: v }),
  setRunning: (v) => set({ running: v }),
  setBuildVisualState: (state) => set({ buildVisualState: state }),
  pulseBuildVisualState: (state) =>
    set((s) => ({
      buildVisualState: state,
      buildVisualToken: s.buildVisualToken + 1,
    })),
  setDiagnostics: (warningCount, errorCount) => set({ warningCount, errorCount }),
  setKilled: (v) => set({ killed: v }),
  setCompileResult: (r) => set({ compileResult: r }),
  setRunResult: (r) => set({ runResult: r }),

  // Profile CRUD
  addProfile: (profile) => {
    const id = generateId();
    const newProfile: BuildProfile = { ...profile, id };
    set((state) => {
      const updated = [...state.profiles, newProfile];
      saveStoredProfiles(updated);
      return { profiles: updated, activeProfileId: id };
    });
  },

  updateProfile: (id, updates) => {
    set((state) => {
      const updated = state.profiles.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );
      saveStoredProfiles(updated);
      return { profiles: updated };
    });
  },

  removeProfile: (id) => {
    set((state) => {
      if (state.profiles.length <= 1) return state; // Keep at least one profile
      const updated = state.profiles.filter((p) => p.id !== id);
      const newActiveId = state.activeProfileId === id ? updated[0].id : state.activeProfileId;
      saveStoredProfiles(updated);
      return { profiles: updated, activeProfileId: newActiveId };
    });
  },

  resetProfiles: () => {
    saveStoredProfiles(defaultBuildProfiles);
    const defaultActiveProfileId =
      defaultBuildProfiles.find((p) => p.id === 'doom')?.id ??
      defaultBuildProfiles.find((p) => p.isDefault)?.id ??
      defaultBuildProfiles[0]?.id ??
      '';
    set({ profiles: defaultBuildProfiles, activeProfileId: defaultActiveProfileId });
  },

  addTestCase: () => {
    const cases = get().testCases;
    const newCase: TestCase = {
      id: generateId(),
      name: `Test ${cases.length + 1}`,
      input: '',
      expectedOutput: '',
      actualOutput: '',
      verdict: 'pending',
      executionTime: null,
      stderr: '',
    };
    set({ testCases: [...cases, newCase], activeTestCaseId: newCase.id });
  },

  removeTestCase: (id) => {
    const cases = get().testCases.filter((c) => c.id !== id);
    const activeId = get().activeTestCaseId === id ? (cases[0]?.id ?? null) : get().activeTestCaseId;
    set({ testCases: cases, activeTestCaseId: activeId });
  },

  updateTestCase: (id, updates) => {
    set({
      testCases: get().testCases.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  },

  setActiveTestCase: (id) => set({ activeTestCaseId: id }),

  setTestVerdict: (id, verdict, actualOutput, executionTime) => {
    set({
      testCases: get().testCases.map((c) =>
        c.id === id ? { ...c, verdict, actualOutput: actualOutput ?? '', executionTime: executionTime ?? null } : c
      ),
    });
  },

  clearAllVerdicts: () => {
    set({
      testCases: get().testCases.map((c) => ({
        ...c,
        verdict: 'pending' as Verdict,
        actualOutput: '',
        executionTime: null,
      })),
    });
  },

  duplicateTestCase: (id) => {
    const original = get().testCases.find((c) => c.id === id);
    if (!original) return;
    const copy: TestCase = {
      ...original,
      id: generateId(),
      name: `${original.name} (copy)`,
      verdict: 'pending',
      actualOutput: '',
      executionTime: null,
    };
    const idx = get().testCases.findIndex((c) => c.id === id);
    const newCases = [...get().testCases];
    newCases.splice(idx + 1, 0, copy);
    set({ testCases: newCases, activeTestCaseId: copy.id });
  },

  importTestCases: (cases) => {
    const newCases: TestCase[] = cases.map((c, i) => ({
      id: generateId(),
      name: `Imported ${i + 1}`,
      input: c.input,
      expectedOutput: c.expectedOutput,
      actualOutput: '',
      verdict: 'pending' as Verdict,
      executionTime: null,
      stderr: '',
    }));
    set({ testCases: [...get().testCases, ...newCases] });
  },

  setAutoRun: (v) => set({ autoRun: v }),
  setShowDiff: (v) => set({ showDiff: v }),
}));
