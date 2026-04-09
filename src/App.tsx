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
import DocsPanel from './components/DocsPanel';
import StartupOverlay from './components/StartupOverlay';
import BuildProgressBar from './components/BuildProgressBar';
import {
  useUIStore,
  useThemeStore,
  useSettingsStore,
  useEditorSchemeStore,
  useEditorStore,
  useBuildStore,
  useAIStore,
  useFileExplorerStore,
} from './stores';
import { useGlobalKeybindings } from './hooks/useKeybindings';
import { useResizable } from './hooks/useResizable';
import { loadConfig } from './services/configService';
import { aiService } from './services/ai/aiService';
import {
  initializeCommands,
  saveSession,
  restoreSession,
  refreshAllOpenFiles,
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
  const docsOpen = useUIStore((s) => s.docsOpen);
  const zoomLevel = useUIStore((s) => s.zoomLevel);
  const uiFontSize = useSettingsStore((s) => s.settings.ui.fontSize);
  const uiFontFamily = useSettingsStore((s) => s.settings.ui.fontFamily);
  const statusBarVisible = useSettingsStore((s) => s.settings.ui.statusBarVisible);
  const activityBarVisible = useSettingsStore((s) => s.settings.ui.activityBarVisible);
  const workspaceRoot = useFileExplorerStore((s) => s.rootPath);
  const setTheme = useThemeStore((s) => s.setTheme);
  const currentTheme = useThemeStore((s) => s.currentTheme);

  // AI-related state - handle both possible property names for compatibility
  const aiConfig = useAIStore((s) => s.config);
  const ghostOpacity = aiConfig.ui?.ghostTextOpacity ?? aiConfig.ui?.ghostOpacity ?? 0.6;

  const [startupReady, setStartupReady] = useState(false);
  const [startupVisible, setStartupVisible] = useState(true);
  const [aiInitialized, setAiInitialized] = useState(false);
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

  // Main startup initialization
  useEffect(() => {
    let cancelled = false;
    let finished = false;

    const markReady = () => {
      if (cancelled || finished) return;
      finished = true;
      setStartupReady(true);
    };

    const startupGuard = window.setTimeout(() => {
      console.warn('[Startup] Guard timeout reached, forcing ready state');
      markReady();
    }, 10000);

    (async () => {
      // Load custom themes
      try {
        await useThemeStore.getState().loadCustomThemesFromDisk();
      } catch (error) {
        console.error('[Startup] Failed to load custom themes:', error);
      }

      // Load editor color schemes
      try {
        await useEditorSchemeStore.getState().loadCustomSchemesFromDisk();
      } catch (error) {
        console.error('[Startup] Failed to load editor schemes:', error);
      }

      // Initialize AI - critical for inline completion
      try {
        console.debug('[Startup] Initializing AI...');
        await useAIStore.getState().loadConfig();
        await useAIStore.getState().hydrateSecureState();
        await aiService.initialize();
        setAiInitialized(true);
        console.debug('[Startup] AI initialized successfully', {
          enabled: useAIStore.getState().config.enabled,
          provider: useAIStore.getState().config.activeProvider,
        });
      } catch (error) {
        console.error('[Startup] Failed to initialize AI:', error);
        // Don't block startup, but log for debugging
      }

      // Load app settings
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
          if (settings.build?.compilerPath) {
            useBuildStore.getState().setCompilerPath(settings.build.compilerPath);
          }
        }
      } catch {
        // Defaults are already loaded
      }

      // Restore session
      try {
        await restoreSession();
        await useSolveCounterStore.getState().loadFromDisk();
      } catch (error) {
        console.error('[Startup] Session restore failed:', error);
      }

      window.clearTimeout(startupGuard);
      markReady();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(startupGuard);
    };
  }, [setTheme]);

  // Reload AI config when workspace changes
  useEffect(() => {
    if (!workspaceRoot) return;
    void useAIStore.getState().loadConfig();
  }, [workspaceRoot]);

  // Debug: Log AI status after initialization
  useEffect(() => {
    if (!aiInitialized) return;

    const config = useAIStore.getState().config;
    console.debug('[AI] Configuration loaded:', {
      enabled: config.enabled,
      provider: config.activeProvider,
      autoTrigger: config.completion?.autoTrigger,
      triggerDelay: config.completion?.triggerDelay,
      ghostOpacity: config.ui?.ghostTextOpacity ?? config.ui?.ghostOpacity,
    });
  }, [aiInitialized]);

  // Auto-save session periodically
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

  // Update warm factor periodically for time-based theme tinting
  useEffect(() => {
    const timer = setInterval(() => {
      setWarmFactor(getWarmFactorForTime(new Date()));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Apply theme with smooth transitions
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

  // Apply UI font size
  useEffect(() => {
    document.documentElement.style.fontSize = `${uiFontSize || 13}px`;
  }, [uiFontSize]);

  // Apply zoom level
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-scale', `${zoomLevel / 100}`);
    return () => {
      root.style.setProperty('--app-scale', '1');
    };
  }, [zoomLevel]);

  // Apply AI ghost text opacity CSS variable
  useEffect(() => {
    const safeGhostOpacity = Number.isFinite(ghostOpacity)
      ? Math.min(0.95, Math.max(0.2, ghostOpacity))
      : 0.6;
    document.documentElement.style.setProperty('--ai-ghost-opacity', `${safeGhostOpacity}`);
    console.debug('[AI] Ghost opacity set to:', safeGhostOpacity);
  }, [ghostOpacity]);

  // Apply UI font family
  useEffect(() => {
    if (uiFontFamily) {
      document.body.style.fontFamily = uiFontFamily;
    }
  }, [uiFontFamily]);

  // Prevent Ctrl+Wheel zoom (browser default)
  useEffect(() => {
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', preventWheelZoom, { passive: false, capture: true });
    return () => {
      window.removeEventListener('wheel', preventWheelZoom, { capture: true } as EventListenerOptions);
    };
  }, []);

  // Handle Escape to exit fullscreen
  useEffect(() => {
    let toggling = false;
    const handleEscapeFullscreen = async (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || toggling) return;
      const win = getCurrentWindow();
      const isFullscreen = await win.isFullscreen();
      if (!isFullscreen) return;
      toggling = true;
      e.preventDefault();
      e.stopPropagation();
      try {
        await win.setFullscreen(false);
      } finally {
        toggling = false;
      }
    };
    window.addEventListener('keydown', handleEscapeFullscreen, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleEscapeFullscreen, { capture: true });
    };
  }, []);

  // Refresh open files when window gains focus
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

  // Animate command palette mount/unmount
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

  // Expose debug helpers in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).__AI_DEBUG__ = {
        getConfig: () => useAIStore.getState().config,
        getStatus: () => useAIStore.getState().status,
        getPendingSuggestion: () => useAIStore.getState().pendingSuggestion,
        toggleAI: () => {
          const store = useAIStore.getState();
          store.setEnabled(!store.config.enabled);
          console.log('[AI] Toggled to:', !store.config.enabled);
        },
        triggerManual: () => {
          // This will be set by EditorArea when editor mounts
          console.log('[AI] Use editor action ai.triggerSuggestion or Alt+\\');
        },
      };
      console.debug('[AI] Debug helpers available at window.__AI_DEBUG__');
    }

    return () => {
      if ((window as any).__AI_DEBUG__) {
        delete (window as any).__AI_DEBUG__;
      }
    };
  }, []);

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
          <div
            className={`app-sidebar-shell ${sidebarVisible ? 'open' : 'closed'}`}
            style={sidebarShellStyle}
          >
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
                <div
                  className={`app-bottom-shell ${bottomPanelVisible ? 'open' : 'closed'}`}
                  style={bottomShellStyle}
                >
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
        {docsOpen ? <DocsPanel /> : null}
      </div>
      {startupVisible ? (
        <StartupOverlay ready={startupReady} onFinished={() => setStartupVisible(false)} />
      ) : null}
    </div>
  );
}