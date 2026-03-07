import { useEffect } from 'react';
import TitleBar from './components/TitleBar';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import EditorArea from './components/EditorArea';
import BottomPanel from './components/BottomPanel';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import Notifications from './components/Notifications';
import SettingsPanel from './components/SettingsPanel';
import { useUIStore, useThemeStore, useSettingsStore, useEditorSchemeStore } from './stores';
import { useGlobalKeybindings } from './hooks/useKeybindings';
import { useResizable } from './hooks/useResizable';
import { loadConfig } from './services/configService';
import { initializeCommands, saveSession, restoreSession } from './services/commandService';
import { useSolveCounterStore } from './stores/solveCounterStore';
import type { AppSettings } from './types';

// Initialize commands once at module load
initializeCommands();

export default function App() {
  const sidebarVisible = useUIStore((s) => s.sidebarVisible);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const bottomPanelVisible = useUIStore((s) => s.bottomPanelVisible);
  const bottomPanelHeight = useUIStore((s) => s.bottomPanelHeight);
  const setBottomPanelHeight = useUIStore((s) => s.setBottomPanelHeight);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const zoomLevel = useUIStore((s) => s.zoomLevel);
  const uiFontSize = useSettingsStore((s) => s.settings.ui.fontSize);
  const uiFontFamily = useSettingsStore((s) => s.settings.ui.fontFamily);
  const setTheme = useThemeStore((s) => s.setTheme);
  const currentTheme = useThemeStore((s) => s.currentTheme);

  // Register global keybindings
  useGlobalKeybindings();

  // Sidebar resizer — use functional updater to avoid stale closure
  const sidebarResizer = useResizable('horizontal', (delta) => {
    useUIStore.getState().setSidebarWidth(useUIStore.getState().sidebarWidth + delta);
  });

  // Bottom panel resizer — use functional updater to avoid stale closure
  const panelResizer = useResizable('vertical', (delta) => {
    useUIStore.getState().setBottomPanelHeight(useUIStore.getState().bottomPanelHeight - delta);
  });

  // Load settings and restore session on startup
  useEffect(() => {
    (async () => {
      // Load custom themes and custom editor schemes first
      await useThemeStore.getState().loadCustomThemesFromDisk();
      await useEditorSchemeStore.getState().loadCustomSchemesFromDisk();

      try {
        const settings = await loadConfig<AppSettings>('settings.json');
        if (settings) {
          useSettingsStore.getState().loadSettings(settings);
          if (settings.ui?.theme) {
            setTheme(settings.ui.theme);
          }
          if (settings.ui?.editorColorScheme) {
            useEditorSchemeStore.getState().setScheme(settings.ui.editorColorScheme);
          }
        }
      } catch {
        // Use defaults
      }

      // Restore previous session (open tabs, folder, UI state)
      await restoreSession();

      // Load solve counter data
      await useSolveCounterStore.getState().loadFromDisk();
    })();
  }, [setTheme]);

  // Auto-save session periodically and on window close
  useEffect(() => {
    const interval = setInterval(() => {
      saveSession();
    }, 30000); // Save every 30s

    const handleBeforeUnload = () => {
      saveSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Apply theme to DOM on mount and change
  useEffect(() => {
    const root = document.documentElement;
    const c = currentTheme.colors;
    root.style.setProperty('--bg-deepest', c.bgDeepest);
    root.style.setProperty('--bg-base', c.bgBase);
    root.style.setProperty('--bg-surface', c.bgSurface);
    root.style.setProperty('--bg-elevated', c.bgElevated);
    root.style.setProperty('--bg-overlay', c.bgOverlay);
    root.style.setProperty('--bg-highlight', c.bgHighlight);
    root.style.setProperty('--bg-active', c.bgActive);
    root.style.setProperty('--bg-intense', c.bgIntense);
    root.style.setProperty('--accent-primary', c.accentPrimary);
    root.style.setProperty('--accent-secondary', c.accentSecondary);
    root.style.setProperty('--accent-tertiary', c.accentTertiary);
    root.style.setProperty('--accent-glow', c.accentGlow);
    root.style.setProperty('--accent-blue', c.accentBlue);
    root.style.setProperty('--accent-green', c.accentGreen);
    root.style.setProperty('--accent-red', c.accentRed);
    root.style.setProperty('--accent-yellow', c.accentYellow);
    root.style.setProperty('--accent-orange', c.accentOrange);
    root.style.setProperty('--accent-purple', c.accentPurple);
    root.style.setProperty('--accent-cyan', c.accentCyan);
    root.style.setProperty('--accent-teal', c.accentTeal);
    root.style.setProperty('--accent-pink', c.accentPink);
    root.style.setProperty('--text-primary', c.textPrimary);
    root.style.setProperty('--text-secondary', c.textSecondary);
    root.style.setProperty('--text-muted', c.textMuted);
    root.style.setProperty('--text-faint', c.textFaint);
    root.style.setProperty('--text-inverse', c.textInverse);
    root.style.setProperty('--border-subtle', c.borderSubtle);
    root.style.setProperty('--border-default', c.borderDefault);
    root.style.setProperty('--border-strong', c.borderStrong);
    root.style.setProperty('--border-accent', c.borderAccent);
    root.style.setProperty('--scrollbar-thumb', c.scrollbarThumb);
    root.style.setProperty('--scrollbar-thumb-hover', c.scrollbarThumbHover);
    root.style.setProperty('--scrollbar-track', c.scrollbarTrack);
  }, [currentTheme]);

  // Apply UI font size (sets root px for rem-based text scaling)
  useEffect(() => {
    document.documentElement.style.fontSize = `${uiFontSize || 13}px`;
  }, [uiFontSize]);

  // Apply zoom level (scales entire app uniformly)
  useEffect(() => {
    document.body.style.zoom = `${zoomLevel / 100}`;
  }, [zoomLevel]);

  // Apply UI font family
  useEffect(() => {
    if (uiFontFamily) {
      document.body.style.fontFamily = uiFontFamily;
    }
  }, [uiFontFamily]);

  // Prevent browser/webview native zoom so our keybindings work
  useEffect(() => {
    const preventNativeZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault();
      }
    };
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', preventNativeZoom, { capture: true });
    window.addEventListener('wheel', preventWheelZoom, { passive: false, capture: true });
    return () => {
      window.removeEventListener('keydown', preventNativeZoom, { capture: true });
      window.removeEventListener('wheel', preventWheelZoom, { capture: true } as EventListenerOptions);
    };
  }, []);

  return (
    <div className="app-container">
      <TitleBar />
      <div className="app-main">
        <ActivityBar />
        {sidebarVisible && (
          <>
            <Sidebar style={{ width: sidebarWidth }} />
            <div className="resizer horizontal" onMouseDown={sidebarResizer.onMouseDown} />
          </>
        )}
        <div className="app-content">
          {settingsOpen ? (
            <SettingsPanel />
          ) : (
            <>
              <div className="app-editor-area">
                <EditorArea />
              </div>
              {bottomPanelVisible && (
                <>
                  <div className="resizer vertical" onMouseDown={panelResizer.onMouseDown} />
                  <BottomPanel style={{ height: bottomPanelHeight }} />
                </>
              )}
            </>
          )}
        </div>
      </div>
      <StatusBar />
      {commandPaletteOpen && <CommandPalette />}
      <Notifications />
    </div>
  );
}
