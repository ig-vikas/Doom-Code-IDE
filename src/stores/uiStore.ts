import { create } from 'zustand';

export type SidebarView = 'explorer' | 'search' | 'snippets' | 'settings';
export type BottomPanelView = 'testcases' | 'output' | 'terminal';
export type FocusedPanel = 'editor' | 'sidebar' | 'bottom' | null;
export type SaveIndicatorState = 'idle' | 'saving' | 'saved';

interface UIState {
  sidebarVisible: boolean;
  sidebarView: SidebarView;
  sidebarWidth: number;
  bottomPanelVisible: boolean;
  bottomPanelView: BottomPanelView;
  bottomPanelHeight: number;
  commandPaletteOpen: boolean;
  quickOpenOpen: boolean;
  settingsOpen: boolean;
  aboutOpen: boolean;
  docsOpen: boolean;
  zoomLevel: number;
  windowMaximized: boolean;
  windowFocused: boolean;
  focusedPanel: FocusedPanel;
  saveIndicatorState: SaveIndicatorState;

  toggleSidebar: () => void;
  setSidebarVisible: (v: boolean) => void;
  setSidebarView: (view: SidebarView) => void;
  setSidebarWidth: (w: number) => void;
  toggleBottomPanel: () => void;
  setBottomPanelVisible: (v: boolean) => void;
  setBottomPanelView: (view: BottomPanelView) => void;
  setBottomPanelHeight: (h: number) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openQuickOpen: () => void;
  closeQuickOpen: () => void;
  toggleQuickOpen: () => void;
  setSettingsOpen: (v: boolean) => void;
  setAboutOpen: (v: boolean) => void;
  setDocsOpen: (v: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setWindowMaximized: (v: boolean) => void;
  setWindowFocused: (v: boolean) => void;
  setFocusedPanel: (panel: FocusedPanel) => void;
  startSavingIndicator: () => void;
  finishSavingIndicator: () => void;
  resetSavingIndicator: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarVisible: true,
  sidebarView: 'explorer',
  sidebarWidth: 260,
  bottomPanelVisible: true,
  bottomPanelView: 'testcases',
  bottomPanelHeight: 250,
  commandPaletteOpen: false,
  quickOpenOpen: false,
  settingsOpen: false,
  aboutOpen: false,
  docsOpen: false,
  zoomLevel: 100,
  windowMaximized: false,
  windowFocused: true,
  focusedPanel: null,
  saveIndicatorState: 'idle',

  toggleSidebar: () => set({ sidebarVisible: !get().sidebarVisible }),
  setSidebarVisible: (v) => set({ sidebarVisible: v }),
  setSidebarView: (view) => {
    if (get().sidebarView === view && get().sidebarVisible) {
      set({ sidebarVisible: false });
    } else {
      set({ sidebarView: view, sidebarVisible: true });
    }
  },
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(180, Math.min(500, w)) }),

  toggleBottomPanel: () => set({ bottomPanelVisible: !get().bottomPanelVisible }),
  setBottomPanelVisible: (v) => set({ bottomPanelVisible: v }),
  setBottomPanelView: (view) => {
    if (get().bottomPanelView === view && get().bottomPanelVisible) {
      set({ bottomPanelVisible: false });
    } else {
      set({ bottomPanelView: view, bottomPanelVisible: true });
    }
  },
  setBottomPanelHeight: (h) => set({ bottomPanelHeight: Math.max(120, Math.min(600, h)) }),

  openCommandPalette: () => set({ commandPaletteOpen: true, quickOpenOpen: false }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () => {
    if (get().commandPaletteOpen) {
      set({ commandPaletteOpen: false });
    } else {
      set({ commandPaletteOpen: true, quickOpenOpen: false });
    }
  },

  openQuickOpen: () => set({ quickOpenOpen: true, commandPaletteOpen: false }),
  closeQuickOpen: () => set({ quickOpenOpen: false }),
  toggleQuickOpen: () => {
    if (get().quickOpenOpen) {
      set({ quickOpenOpen: false });
    } else {
      set({ quickOpenOpen: true, commandPaletteOpen: false });
    }
  },

  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setAboutOpen: (v) => set({ aboutOpen: v }),
  setDocsOpen: (v) => set({ docsOpen: v }),

  zoomIn: () => set({ zoomLevel: Math.min(200, get().zoomLevel + 10) }),
  zoomOut: () => set({ zoomLevel: Math.max(50, get().zoomLevel - 10) }),
  resetZoom: () => set({ zoomLevel: 100 }),

  setWindowMaximized: (v) => set({ windowMaximized: v }),
  setWindowFocused: (v) => set({ windowFocused: v }),
  setFocusedPanel: (panel) => set({ focusedPanel: panel }),

  startSavingIndicator: () => set({ saveIndicatorState: 'saving' }),
  finishSavingIndicator: () => set({ saveIndicatorState: 'saved' }),
  resetSavingIndicator: () => set({ saveIndicatorState: 'idle' }),
}));
