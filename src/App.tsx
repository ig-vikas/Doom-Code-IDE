import { useEffect, useMemo, useRef, useState } from 'react';
import TitleBar from './components/TitleBar';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import EditorArea from './components/EditorArea';
import BottomPanel from './components/BottomPanel';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import Notifications from './components/Notifications';
import SettingsPanel from './components/SettingsPanel';
import StartupOverlay from './components/StartupOverlay';
import BuildProgressBar from './components/BuildProgressBar';
import { useUIStore, useThemeStore, useSettingsStore, useEditorSchemeStore, useEditorStore } from './stores';
import { useGlobalKeybindings } from './hooks/useKeybindings';
import { useResizable } from './hooks/useResizable';
import { loadConfig } from './services/configService';
import {
  initializeCommands,
  saveSession,
  restoreSession,
  refreshAllOpenFiles,
  isCalibratedFullscreenActive,
  exitCalibratedFullscreenMode,
} from './services/commandService';
import { useSolveCounterStore } from './stores/solveCounterStore';
import { applyWarmTint, getWarmFactorForTime, interpolateColor } from './utils/color';
import type { AppSettings, ThemeColors } from './types';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Initialize commands once at module load
initializeCommands();

const COLOR_KEYS: (keyof ThemeColors)[] = [
  'bgDeepest',
  'bgBase',
  'bgSurface',
  'bgElevated',
  'bgOverlay',
  'bgHighlight',
  'bgActive',
  'bgIntense',
  'accentPrimary',
  'accentSecondary',
  'accentTertiary',
  'accentGlow',
  'accentBlue',
  'accentGreen',
  'accentRed',
  'accentYellow',
  'accentOrange',
  'accentPurple',
  'accentCyan',
  'accentTeal',
  'accentPink',
  'textPrimary',
  'textSecondary',
  'textMuted',
  'textFaint',
  'textInverse',
  'borderSubtle',
  'borderDefault',
  'borderStrong',
  'borderAccent',
  'scrollbarThumb',
  'scrollbarThumbHover',
  'scrollbarTrack',
];

const WARM_BACKGROUND_KEYS = new Set<keyof ThemeColors>([
  'bgDeepest',
  'bgBase',
  'bgSurface',
  'bgElevated',
  'bgOverlay',
  'bgHighlight',
  'bgActive',
  'bgIntense',
]);

function applyThemeToRoot(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty('--bg-deepest', colors.bgDeepest);
  root.style.setProperty('--bg-base', colors.bgBase);
  root.style.setProperty('--bg-surface', colors.bgSurface);
  root.style.setProperty('--bg-elevated', colors.bgElevated);
  root.style.setProperty('--bg-overlay', colors.bgOverlay);
  root.style.setProperty('--bg-highlight', colors.bgHighlight);
  root.style.setProperty('--bg-active', colors.bgActive);
  root.style.setProperty('--bg-intense', colors.bgIntense);
  root.style.setProperty('--accent-primary', colors.accentPrimary);
  root.style.setProperty('--accent-secondary', colors.accentSecondary);
  root.style.setProperty('--accent-tertiary', colors.accentTertiary);
  root.style.setProperty('--accent-glow', colors.accentGlow);
  root.style.setProperty('--accent-blue', colors.accentBlue);
  root.style.setProperty('--accent-green', colors.accentGreen);
  root.style.setProperty('--accent-red', colors.accentRed);
  root.style.setProperty('--accent-yellow', colors.accentYellow);
  root.style.setProperty('--accent-orange', colors.accentOrange);
  root.style.setProperty('--accent-purple', colors.accentPurple);
  root.style.setProperty('--accent-cyan', colors.accentCyan);
  root.style.setProperty('--accent-teal', colors.accentTeal);
  root.style.setProperty('--accent-pink', colors.accentPink);
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--text-faint', colors.textFaint);
  root.style.setProperty('--text-inverse', colors.textInverse);
  root.style.setProperty('--border-subtle', colors.borderSubtle);
  root.style.setProperty('--border-default', colors.borderDefault);
  root.style.setProperty('--border-strong', colors.borderStrong);
  root.style.setProperty('--border-accent', colors.borderAccent);
  root.style.setProperty('--scrollbar-thumb', colors.scrollbarThumb);
  root.style.setProperty('--scrollbar-thumb-hover', colors.scrollbarThumbHover);
  root.style.setProperty('--scrollbar-track', colors.scrollbarTrack);
}

function tintTheme(theme: ThemeColors, warmFactor: number): ThemeColors {
  const next = { ...theme };
  for (const key of WARM_BACKGROUND_KEYS) {
    next[key] = applyWarmTint(theme[key], warmFactor);
  }
  return next;
}

function interpolateTheme(from: ThemeColors, to: ThemeColors, t: number): ThemeColors {
  const next = { ...to };
  for (const key of COLOR_KEYS) {
    next[key] = interpolateColor(from[key], to[key], t);
  }
  return next;
}

export default function App() {
  const sidebarVisible = useUIStore((s) => s.sidebarVisible);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const bottomPanelVisible = useUIStore((s) => s.bottomPanelVisible);
  const bottomPanelHeight = useUIStore((s) => s.bottomPanelHeight);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const zoomLevel = useUIStore((s) => s.zoomLevel);
  const uiFontSize = useSettingsStore((s) => s.settings.ui.fontSize);
  const uiFontFamily = useSettingsStore((s) => s.settings.ui.fontFamily);
  const statusBarVisible = useSettingsStore((s) => s.settings.ui.statusBarVisible);
  const activityBarVisible = useSettingsStore((s) => s.settings.ui.activityBarVisible);
  const setTheme = useThemeStore((s) => s.setTheme);
  const currentTheme = useThemeStore((s) => s.currentTheme);

  const [startupReady, setStartupReady] = useState(false);
  const [startupVisible, setStartupVisible] = useState(true);
  const [paletteMounted, setPaletteMounted] = useState(commandPaletteOpen);
  const [paletteClosing, setPaletteClosing] = useState(false);
  const [warmFactor, setWarmFactor] = useState(() => getWarmFactorForTime(new Date()));
  const previousThemeRef = useRef<ThemeColors | null>(null);

  // Register global keybindings
  useGlobalKeybindings();

  const sidebarResizer = useResizable('horizontal', (delta) => {
    useUIStore.getState().setSidebarWidth(useUIStore.getState().sidebarWidth + delta);
  });

  const panelResizer = useResizable('vertical', (delta) => {
    useUIStore.getState().setBottomPanelHeight(useUIStore.getState().bottomPanelHeight - delta);
  });

  useEffect(() => {
    let cancelled = false;
    let finished = false;
    const markReady = () => {
      if (cancelled || finished) return;
      finished = true;
      setStartupReady(true);
    };

    const startupGuard = window.setTimeout(() => {
      markReady();
    }, 10000);

    (async () => {
      try {
        await useThemeStore.getState().loadCustomThemesFromDisk();
      } catch (error) {
        console.error('Failed to load custom themes during startup:', error);
      }

      try {
        await useEditorSchemeStore.getState().loadCustomSchemesFromDisk();
      } catch (error) {
        console.error('Failed to load editor schemes during startup:', error);
      }

      try {
        try {
          const settings = await loadConfig<AppSettings>('settings.json');
          if (settings && !cancelled) {
            useSettingsStore.getState().loadSettings(settings);
            if (settings.ui?.zoomLevel) {
              useUIStore.setState({ zoomLevel: settings.ui.zoomLevel });
            }
            if (settings.ui?.theme) {
              setTheme(settings.ui.theme);
            }
            if (settings.ui?.editorColorScheme) {
              useEditorSchemeStore.getState().setScheme(settings.ui.editorColorScheme);
            }
          }
        } catch {
          // defaults are already loaded
        }

        await restoreSession();
        await useSolveCounterStore.getState().loadFromDisk();
      } catch (error) {
        console.error('Startup initialization failed:', error);
      } finally {
        window.clearTimeout(startupGuard);
        markReady();
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(startupGuard);
    };
  }, [setTheme]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveSession();
    }, 30000);

    const handleBeforeUnload = () => {
      saveSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    let layoutSaveTimer: ReturnType<typeof setTimeout> | null = null;
    let prevLayout = useEditorStore.getState().layout;
    const unsubLayout = useEditorStore.subscribe((state) => {
      if (state.layout !== prevLayout) {
        prevLayout = state.layout;
        if (layoutSaveTimer) clearTimeout(layoutSaveTimer);
        layoutSaveTimer = setTimeout(() => {
          saveSession();
        }, 2000);
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubLayout();
      if (layoutSaveTimer) clearTimeout(layoutSaveTimer);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setWarmFactor(getWarmFactorForTime(new Date()));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const target = tintTheme(currentTheme.colors, warmFactor);
    const previous = previousThemeRef.current;

    if (!previous) {
      applyThemeToRoot(target);
      previousThemeRef.current = target;
      return;
    }

    const duration = 400;
    const startedAt = performance.now();
    let raf = 0;
    root.classList.add('theme-transition-active');

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / duration);
      const frameTheme = interpolateTheme(previous, target, progress);
      applyThemeToRoot(frameTheme);
      if (progress < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        previousThemeRef.current = target;
        window.setTimeout(() => root.classList.remove('theme-transition-active'), 40);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [currentTheme, warmFactor]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${uiFontSize || 13}px`;
  }, [uiFontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-scale', `${zoomLevel / 100}`);
    return () => {
      root.style.setProperty('--app-scale', '1');
    };
  }, [zoomLevel]);

  useEffect(() => {
    if (uiFontFamily) {
      document.body.style.fontFamily = uiFontFamily;
    }
  }, [uiFontFamily]);

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

  useEffect(() => {
    let toggling = false;
    const handleEscapeFullscreen = async (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || toggling) return;
      const win = getCurrentWindow();
      const isFullscreen = await win.isFullscreen();
      if (!isFullscreen && !isCalibratedFullscreenActive()) return;
      toggling = true;
      e.preventDefault();
      e.stopPropagation();
      try {
        if (isCalibratedFullscreenActive()) {
          await exitCalibratedFullscreenMode();
        } else {
          await win.setFullscreen(false);
        }
      } finally {
        toggling = false;
      }
    };
    window.addEventListener('keydown', handleEscapeFullscreen, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleEscapeFullscreen, { capture: true });
    };
  }, []);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleFocus = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshAllOpenFiles();
      }, 300);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  useEffect(() => {
    if (commandPaletteOpen) {
      setPaletteMounted(true);
      setPaletteClosing(false);
      return;
    }
    if (!paletteMounted) return;
    setPaletteClosing(true);
    const timer = window.setTimeout(() => {
      setPaletteMounted(false);
      setPaletteClosing(false);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [commandPaletteOpen, paletteMounted]);

  const sidebarShellStyle = useMemo(
    () => ({ width: `${sidebarVisible ? sidebarWidth : 0}px` }),
    [sidebarVisible, sidebarWidth]
  );

  const bottomShellStyle = useMemo(
    () => ({ height: `${bottomPanelVisible ? bottomPanelHeight + 3 : 0}px` }),
    [bottomPanelHeight, bottomPanelVisible]
  );

  return (
    <div className={`app-shell ${startupVisible ? 'startup-active' : 'startup-complete'}`}>
      <div className="app-container">
        <BuildProgressBar />
        <TitleBar />
        <div className="app-main">
          {activityBarVisible ? <ActivityBar /> : null}
          <div className={`app-sidebar-shell ${sidebarVisible ? 'open' : 'closed'}`} style={sidebarShellStyle}>
            <Sidebar style={{ width: sidebarWidth }} />
          </div>
          <div
            className={`resizer horizontal ${sidebarVisible ? '' : 'hidden'}`}
            onMouseDown={sidebarVisible ? sidebarResizer.onMouseDown : undefined}
          />
          <div className="app-content">
            {settingsOpen ? (
              <SettingsPanel />
            ) : (
              <>
                <div className="app-editor-area">
                  <EditorArea />
                </div>
                <div className={`app-bottom-shell ${bottomPanelVisible ? 'open' : 'closed'}`} style={bottomShellStyle}>
                  <div
                    className={`resizer vertical ${bottomPanelVisible ? '' : 'hidden'}`}
                    onMouseDown={bottomPanelVisible ? panelResizer.onMouseDown : undefined}
                  />
                  <BottomPanel style={{ height: bottomPanelHeight }} />
                </div>
              </>
            )}
          </div>
        </div>
        {statusBarVisible ? <StatusBar /> : null}
        {paletteMounted ? <CommandPalette closing={paletteClosing} /> : null}
        <Notifications />
      </div>
      {startupVisible ? <StartupOverlay ready={startupReady} onFinished={() => setStartupVisible(false)} /> : null}
    </div>
  );
}
