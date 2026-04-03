import { create } from 'zustand';
import type { AppSettings } from '../types';
import { defaultSettings } from '../config/defaultSettings';
import {
  DEFAULT_EDITOR_FONT_FAMILY,
  isAllowedAppThemeId,
  isAllowedEditorFontFamily,
  LOCKED_APP_THEME_ID,
  LOCKED_EDITOR_SCHEME_ID,
} from '../config/lockedAppearance';

function clampEditorSettings(editor: AppSettings['editor']): AppSettings['editor'] {
  return {
    ...editor,
    fontFamily: isAllowedEditorFontFamily(editor.fontFamily) ? editor.fontFamily : DEFAULT_EDITOR_FONT_FAMILY,
  };
}

function clampUISettings(ui: AppSettings['ui']): AppSettings['ui'] {
  return {
    ...ui,
    theme: isAllowedAppThemeId(ui.theme) ? ui.theme : LOCKED_APP_THEME_ID,
    editorColorScheme: LOCKED_EDITOR_SCHEME_ID,
  };
}

interface SettingsState {
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
  updateEditor: (editor: Partial<AppSettings['editor']>) => void;
  updateUI: (ui: Partial<AppSettings['ui']>) => void;
  updateBuild: (build: Partial<AppSettings['build']>) => void;
  updateTemplate: (template: Partial<AppSettings['template']>) => void;
  updateTerminal: (terminal: Partial<AppSettings['terminal']>) => void;
  updateFiles: (files: Partial<AppSettings['files']>) => void;
  updateAnimations: (animations: Partial<AppSettings['animations']>) => void;
  resetSettings: () => void;
  loadSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    ...defaultSettings,
    editor: clampEditorSettings(defaultSettings.editor),
    ui: clampUISettings(defaultSettings.ui),
  },

  setSettings: (partial) =>
    set((state) => {
      const merged = { ...state.settings, ...partial };
      return {
        settings: {
          ...merged,
          editor: clampEditorSettings(merged.editor),
          ui: clampUISettings(merged.ui),
        },
      };
    }),

  updateEditor: (editor) =>
    set((state) => ({
      settings: {
        ...state.settings,
        editor: clampEditorSettings({ ...state.settings.editor, ...editor }),
      },
    })),

  updateUI: (ui) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ui: clampUISettings({ ...state.settings.ui, ...ui }),
      },
    })),

  updateBuild: (build) =>
    set((state) => ({
      settings: { ...state.settings, build: { ...state.settings.build, ...build } },
    })),

  updateTemplate: (template) =>
    set((state) => ({
      settings: { ...state.settings, template: { ...state.settings.template, ...template } },
    })),

  updateTerminal: (terminal) =>
    set((state) => ({
      settings: { ...state.settings, terminal: { ...state.settings.terminal, ...terminal } },
    })),

  updateFiles: (files) =>
    set((state) => ({
      settings: { ...state.settings, files: { ...state.settings.files, ...files } },
    })),

  updateAnimations: (animations) =>
    set((state) => ({
      settings: { ...state.settings, animations: { ...state.settings.animations, ...animations } },
    })),

  resetSettings: () =>
    set({
      settings: {
        ...defaultSettings,
        editor: clampEditorSettings(defaultSettings.editor),
        ui: clampUISettings(defaultSettings.ui),
      },
    }),

  loadSettings: (loaded: AppSettings) => {
    const merged: AppSettings = {
      ...defaultSettings,
      ...loaded,
      editor: { ...defaultSettings.editor, ...loaded.editor },
      ui: { ...defaultSettings.ui, ...loaded.ui },
      build: { ...defaultSettings.build, ...loaded.build },
      template: { ...defaultSettings.template, ...loaded.template },
      terminal: { ...defaultSettings.terminal, ...loaded.terminal },
      files: { ...defaultSettings.files, ...loaded.files },
      animations: { ...defaultSettings.animations, ...loaded.animations },
    };

    set({
      settings: {
        ...merged,
        editor: clampEditorSettings(merged.editor),
        ui: clampUISettings(merged.ui),
      },
    });
  },
}));
