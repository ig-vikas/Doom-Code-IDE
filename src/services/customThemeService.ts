/**
 * Custom Theme Service
 * Parses user-editable JSON theme files (similar to Sublime Text color schemes)
 * and converts them to the app's ThemeDefinition format.
 *
 * Theme JSON format:
 * {
 *   "name": "My Theme",
 *   "author": "Author Name",
 *   "type": "dark" | "light",
 *   "variables": { "background": "#1e1e1e", ... },
 *   "globals": { "background": "var(background)", ... },
 *   "rules": [
 *     { "name": "...", "scope": "...", "foreground": "var(keyword)", "font_style": "bold italic" }
 *   ]
 * }
 */

import { saveConfig, loadConfig, getAppDataDir } from './configService';
import type { ThemeDefinition, ThemeColors, MonacoTokenRule } from '../types';

// ======================== TYPES ========================

export interface CustomThemeJSON {
  name: string;
  author?: string;
  type?: 'dark' | 'light';
  variables: Record<string, string>;
  globals: Record<string, string>;
  rules: CustomThemeRule[];
}

interface CustomThemeRule {
  name?: string;
  scope: string;
  foreground?: string;
  background?: string;
  font_style?: string;
}

// ======================== COLOR PARSING ========================

/**
 * Convert HSL string "hsl(h, s%, l%)" to hex "#RRGGBB"
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Parse any CSS color format to hex (#RRGGBB).
 * Supports: #hex, #shortHex, hsl(), hsla(), rgb(), rgba()
 */
export function parseColorToHex(color: string): string {
  if (!color) return '#000000';
  const trimmed = color.trim();

  // Already hex
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      // #RGB → #RRGGBB
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed.slice(0, 7); // strip alpha if #RRGGBBAA
  }

  // hsl(h, s%, l%) or hsla(h, s%, l%, a)
  const hslMatch = trimmed.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?/i);
  if (hslMatch) {
    return hslToHex(parseFloat(hslMatch[1]), parseFloat(hslMatch[2]), parseFloat(hslMatch[3]));
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Fallback: return as-is (e.g. named colors or already valid)
  return trimmed;
}

// ======================== VARIABLE RESOLUTION ========================

function resolveVar(value: string, variables: Record<string, string>): string {
  // Resolve var(name) references, support nested/chained vars
  let result = value;
  let iterations = 0;
  while (result.includes('var(') && iterations < 10) {
    result = result.replace(/var\((\w+)\)/g, (match, name) => {
      return variables[name] ?? match;
    });
    iterations++;
  }
  return result;
}

function resolveAllVars(obj: Record<string, string>, variables: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveVar(value, variables);
  }
  return result;
}

// ======================== THEME CONVERSION ========================

function stripHash(color: string): string {
  const hex = parseColorToHex(color);
  return hex.startsWith('#') ? hex.slice(1) : hex;
}

function ensureHash(color: string): string {
  if (!color) return '#000000';
  return parseColorToHex(color);
}

/**
 * Convert a custom theme JSON to our internal ThemeDefinition
 */
export function convertCustomTheme(json: CustomThemeJSON, id: string): ThemeDefinition {
  const variables = json.variables || {};
  const globals = resolveAllVars(json.globals || {}, variables);
  const isDark = (json.type ?? 'dark') === 'dark';

  // Map globals to ThemeColors  — parseColorToHex handles hsl(), rgb(), hex
  const bg = parseColorToHex(globals.background || (isDark ? '#1e1e1e' : '#ffffff'));
  const fg = parseColorToHex(globals.foreground || (isDark ? '#D4D4D4' : '#333333'));
  const accent = parseColorToHex(globals.accent || (isDark ? '#007ACC' : '#0066B8'));
  const selection = parseColorToHex(globals.selection || (isDark ? '#264F78' : '#ADD6FF'));
  const lineHighlight = parseColorToHex(globals.line_highlight || (isDark ? '#2A2A2A' : '#F7F7F7'));
  const gutter = parseColorToHex(globals.gutter || bg);
  const gutterFg = parseColorToHex(globals.gutter_foreground || (isDark ? '#858585' : '#999999'));
  const caret = parseColorToHex(globals.caret || fg);

  // Generate surface variants from base background
  const lighten = (hex: string, amount: number): string => {
    const h = parseColorToHex(hex);
    const num = parseInt(h.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xFF) + amount);
    const g = Math.min(255, ((num >> 8) & 0xFF) + amount);
    const b = Math.min(255, (num & 0xFF) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };
  const darken = (hex: string, amount: number): string => {
    const h = parseColorToHex(hex);
    const num = parseInt(h.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xFF) - amount);
    const g = Math.max(0, ((num >> 8) & 0xFF) - amount);
    const b = Math.max(0, (num & 0xFF) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Resolve accent colors from variables (with HSL support)
  const resolveAccent = (varName: string, fallback: string): string => {
    const v = variables[varName];
    return v ? parseColorToHex(v) : fallback;
  };

  const colors: ThemeColors = {
    bgDeepest: darken(bg, 10),
    bgBase: bg,
    bgSurface: lighten(bg, 8),
    bgElevated: lighten(bg, 16),
    bgOverlay: bg + 'e6',
    bgHighlight: lighten(bg, 24),
    bgActive: lighten(bg, 32),
    bgIntense: lighten(bg, 40),
    accentPrimary: accent,
    accentSecondary: darken(accent, 20),
    accentTertiary: darken(accent, 30),
    accentGlow: lighten(accent, 30),
    accentBlue: resolveAccent('blue', resolveAccent('constants_enums', '#4FC1FF')),
    accentGreen: resolveAccent('green', '#6A9955'),
    accentRed: resolveAccent('red', resolveAccent('regex_charclass', '#d16969')),
    accentYellow: resolveAccent('yellow', resolveAccent('numberLiteral', '#B5CEA8')),
    accentOrange: resolveAccent('orange', resolveAccent('escape', '#d7ba7d')),
    accentPurple: resolveAccent('purple', resolveAccent('control_flow', '#C586C0')),
    accentCyan: resolveAccent('cyan', '#4EC9B0'),
    accentTeal: resolveAccent('cyan', '#4EC9B0'),
    accentPink: resolveAccent('pink', '#C586C0'),
    textPrimary: fg,
    textSecondary: isDark ? lighten(fg, -40) : darken(fg, 40),
    textMuted: gutterFg,
    textFaint: isDark ? darken(fg, 80) : lighten(fg, 80),
    textInverse: isDark ? '#1e1e1e' : '#ffffff',
    borderSubtle: lighten(bg, 12),
    borderDefault: lighten(bg, 20),
    borderStrong: lighten(bg, 35),
    borderAccent: accent,
    scrollbarThumb: lighten(bg, 20),
    scrollbarThumbHover: lighten(bg, 35),
    scrollbarTrack: 'transparent',
  };

  // Convert rules to Monaco token rules
  const monacoRules: MonacoTokenRule[] = [];

  for (const rule of (json.rules || [])) {
    const rawFg = rule.foreground ? resolveVar(rule.foreground, variables) : undefined;
    const rawBg = rule.background ? resolveVar(rule.background, variables) : undefined;

    // Skip rules with empty foreground/background (e.g. placeholder rules)
    if (!rawFg && !rawBg && !rule.font_style) continue;

    const resolvedFg = rawFg ? parseColorToHex(rawFg) : undefined;
    const resolvedBg = rawBg ? parseColorToHex(rawBg) : undefined;

    // Split scope by ", " to handle multiple scopes per rule
    const scopes = rule.scope.split(',').map((s) => s.trim());

    for (const scope of scopes) {
      // Map common TextMate scopes to Monaco token types
      const monacoTokens = mapScopeToMonaco(scope);
      for (const token of monacoTokens) {
        monacoRules.push({
          token,
          foreground: resolvedFg ? stripHash(resolvedFg) : undefined,
          background: resolvedBg ? stripHash(resolvedBg) : undefined,
          fontStyle: rule.font_style,
        });
      }
    }
  }

  // Monaco editor colors
  const monacoColors: Record<string, string> = {
    'editor.background': bg,
    'editor.foreground': fg,
    'editor.lineHighlightBackground': lineHighlight,
    'editor.selectionBackground': selection,
    'editor.selectionHighlightBackground': selection + '60',
    'editorCursor.foreground': caret,
    'editorLineNumber.foreground': gutterFg,
    'editorLineNumber.activeForeground': accent,
    'editorGutter.background': gutter,
    'editorIndentGuide.background': globals.guide || lighten(bg, 15),
    'editorIndentGuide.activeBackground': globals.active_guide || lighten(bg, 25),
    'editorBracketMatch.background': accent + '20',
    'editorBracketMatch.border': accent,
    'editor.findMatchBackground': globals.find_highlight || (accent + '40'),
    'editor.findMatchHighlightBackground': globals.find_highlight ? (globals.find_highlight + '60') : (accent + '20'),
    'editorWidget.background': lighten(bg, 10),
    'editorWidget.border': lighten(bg, 20),
    'editorSuggestWidget.background': lighten(bg, 10),
    'editorSuggestWidget.border': lighten(bg, 20),
    'editorSuggestWidget.selectedBackground': lighten(bg, 20),
    'editorSuggestWidget.highlightForeground': accent,
    'editorHoverWidget.background': lighten(bg, 10),
    'editorHoverWidget.border': lighten(bg, 20),
    'input.background': darken(bg, 5),
    'input.border': lighten(bg, 20),
    'input.foreground': fg,
    'input.placeholderForeground': gutterFg,
    'scrollbar.shadow': globals.shadow || '#00000050',
    'scrollbarSlider.background': lighten(bg, 20) + '80',
    'scrollbarSlider.hoverBackground': lighten(bg, 30),
    'scrollbarSlider.activeBackground': lighten(bg, 30),
    'minimap.background': bg,
    'editorOverviewRuler.border': lighten(bg, 15),
  };

  return {
    id,
    name: json.name || 'Custom Theme',
    type: isDark ? 'dark' : 'light',
    colors,
    monacoTheme: {
      base: isDark ? 'vs-dark' : 'vs',
      inherit: true,
      rules: monacoRules,
      colors: monacoColors,
    },
  };
}

/**
 * Map TextMate/Sublime scopes to Monaco token types
 */
function mapScopeToMonaco(scope: string): string[] {
  const map: Record<string, string[]> = {
    // Comments
    'comment': ['comment'],
    'punctuation.definition.comment': ['comment'],
    // Keywords / Control
    'keyword': ['keyword'],
    'keyword.control': ['keyword'],
    'keyword.operator': ['operator'],
    'keyword.operator.assignment': ['operator'],
    'keyword.operator.arithmetic': ['operator'],
    'keyword.operator.bitwise': ['operator'],
    'keyword.operator.logical': ['operator'],
    'keyword.other': ['keyword'],
    // Storage
    'storage': ['storage'],
    'storage.type': ['type', 'storage.type'],
    'storage.type.c': ['keyword'],
    'storage.modifier': ['storage.modifier'],
    // Types
    'support.class': ['type'],
    'support.type': ['type'],
    'entity.name.type': ['type', 'type.identifier'],
    'entity.name.namespace': ['namespace'],
    'entity.name.class': ['type'],
    'entity.name.scope-resolution': ['type'],
    'entity.other.attribute': ['type'],
    // Functions
    'entity.name.function': ['entity.name.function'],
    'support.function': ['support.function'],
    'entity.name.operator.custom-literal': ['entity.name.function'],
    // Variables
    'variable': ['variable'],
    'variable.parameter': ['variable.parameter'],
    'variable.other.readwrite': ['variable'],
    'variable.other.constant': ['constant'],
    'variable.other.enummember': ['constant'],
    'meta.definition.variable.name': ['variable'],
    'meta.parameter': ['variable.parameter'],
    // Strings
    'string': ['string'],
    'string.quoted': ['string'],
    'string.quoted.double': ['string'],
    'string.quoted.single': ['string'],
    'string.interpolated': ['string'],
    'string.template': ['string'],
    // Constants / Numbers
    'constant': ['constant'],
    'constant.numeric': ['number'],
    'constant.numeric.integer': ['number'],
    'constant.numeric.float': ['number'],
    'constant.language': ['constant.language'],
    'constant.character': ['character'],
    'constant.character.escape': ['string.escape'],
    'constant.character.escape.backslash': ['string.escape'],
    // Entity / labels
    'entity.name.label': ['label'],
    'entity.other.attribute-name': ['attribute.name'],
    'entity.other.inherited-class': ['type'],
    // Meta
    'meta.object-literal.key': ['variable'],
    'meta.type.cast.expr': ['type'],
    'meta.type.new.expr': ['type'],
    'meta.brace': ['delimiter'],
    'meta.delimiter': ['delimiter'],
    // Preprocessor
    'meta.preprocessor': ['meta.preprocessor'],
    'meta.preprocessor.string': ['string'],
    // Punctuation
    'punctuation': ['delimiter'],
    'punctuation.definition': ['delimiter'],
    'punctuation.separator': ['operator'],
    // Regex
    'constant.character.character-class.regexp': ['regexp'],
    'keyword.operator.or.regexp': ['regexp'],
    'keyword.control.anchor.regexp': ['regexp'],
    'keyword.operator.quantifier.regexp': ['regexp'],
    // Support
    'support.constant.math': ['constant'],
    'support.constant.dom': ['constant'],
    'support.constant.json': ['constant'],
    'support.variable': ['variable'],
    // Tags (HTML/XML)
    'entity.name.tag': ['tag'],
    // JSON
    'support.type.property-name': ['variable'],
    'support.type.property-name.json': ['variable'],
    'support.constant.property-name.json': ['variable'],
  };

  // Try exact match first, then partial
  if (map[scope]) return map[scope];

  // Try prefix matching
  for (const [key, tokens] of Object.entries(map)) {
    if (scope.startsWith(key) || key.startsWith(scope)) {
      return tokens;
    }
  }

  // Fallback: use scope as token directly
  return [scope];
}

// ======================== PERSISTENCE ========================

const CUSTOM_THEMES_FILE = 'custom-themes.json';

interface StoredCustomThemes {
  themes: { id: string; json: CustomThemeJSON }[];
}

/**
 * Load all custom themes from config
 */
export async function loadCustomThemes(): Promise<ThemeDefinition[]> {
  try {
    const stored = await loadConfig<StoredCustomThemes>(CUSTOM_THEMES_FILE);
    if (!stored || !stored.themes) return [];
    return stored.themes.map(({ id, json }) => convertCustomTheme(json, id));
  } catch {
    return [];
  }
}

/**
 * Save a custom theme to config
 */
export async function saveCustomTheme(id: string, json: CustomThemeJSON): Promise<void> {
  const stored = await loadConfig<StoredCustomThemes>(CUSTOM_THEMES_FILE) || { themes: [] };
  const idx = stored.themes.findIndex((t) => t.id === id);
  if (idx >= 0) {
    stored.themes[idx] = { id, json };
  } else {
    stored.themes.push({ id, json });
  }
  await saveConfig(CUSTOM_THEMES_FILE, stored);
}

/**
 * Remove a custom theme from config
 */
export async function removeCustomTheme(id: string): Promise<void> {
  const stored = await loadConfig<StoredCustomThemes>(CUSTOM_THEMES_FILE) || { themes: [] };
  stored.themes = stored.themes.filter((t) => t.id !== id);
  await saveConfig(CUSTOM_THEMES_FILE, stored);
}

/**
 * Load raw custom theme JSONs (for editing)
 */
export async function loadCustomThemeJSONs(): Promise<{ id: string; json: CustomThemeJSON }[]> {
  try {
    const stored = await loadConfig<StoredCustomThemes>(CUSTOM_THEMES_FILE);
    if (!stored || !stored.themes) return [];
    return stored.themes;
  } catch {
    return [];
  }
}

/**
 * Generate a default custom theme JSON based on the user's sample format
 */
export function getDefaultCustomThemeJSON(): CustomThemeJSON {
  return {
    name: 'My Custom Theme',
    author: 'User',
    type: 'dark',
    variables: {
      black: 'hsl(0, 0%, 9%)',
      blue: 'hsl(218, 72%, 65%)',
      blue2: 'hsl(207, 61%, 59%)',
      blue3: 'hsl(240, 100%, 25%)',
      blue4: 'hsl(201, 98%, 80%)',
      blue5: 'hsl(238, 20%, 49%)',
      cyan: 'hsl(168, 53%, 55%)',
      green: 'hsl(101, 29%, 47%)',
      green2: 'hsl(99, 28%, 73%)',
      grey: 'hsl(0, 0%, 50%)',
      grey2: 'hsl(0, 0%, 30%)',
      grey3: 'hsl(0, 0%, 83%)',
      orange: 'hsl(39, 61%, 50%)',
      orange2: 'hsl(41, 53%, 67%)',
      pink: 'hsl(305, 35%, 65%)',
      purple: 'hsl(275, 72%, 65%)',
      red: 'hsl(0, 89%, 62%)',
      red2: 'hsl(0, 53%, 62%)',
      red3: 'hsl(17, 47%, 64%)',
      yellow: 'hsl(60, 42%, 76%)',
    },
    globals: {
      foreground: 'var(grey3)',
      background: 'var(black)',
      caret: 'var(grey3)',
      line_highlight: 'var(grey2)',
      selection: 'var(grey2)',
    },
    rules: [
      {
        scope: 'comment',
        foreground: 'var(green)',
      },
      {
        scope: 'constant.language',
        foreground: 'var(blue2)',
      },
      {
        scope: 'constant.numeric',
        foreground: 'var(green2)',
      },
      {
        scope: 'string',
        foreground: 'var(red3)',
      },
      {
        scope: 'keyword',
        foreground: 'var(blue2)',
      },
      {
        scope: 'keyword.control',
        foreground: 'var(pink)',
      },
      {
        scope: 'keyword.operator',
        foreground: 'var(grey3)',
      },
      {
        scope: 'storage',
        foreground: 'var(blue2)',
      },
      {
        scope: 'storage.type',
        foreground: 'var(blue2)',
      },
      {
        name: 'Function declarations',
        scope: 'entity.name.function, support.function',
        foreground: 'var(yellow)',
      },
      {
        name: 'Types',
        scope: 'support.class, support.type, entity.name.type, entity.name.namespace, entity.name.class',
        foreground: 'var(cyan)',
      },
      {
        name: 'Control flow',
        scope: 'keyword.control, keyword.operator.new, keyword.operator.delete',
        foreground: 'var(pink)',
      },
      {
        name: 'Variables',
        scope: 'variable, meta.definition.variable.name, support.variable',
        foreground: 'var(blue4)',
      },
      {
        name: 'Constants',
        scope: 'variable.other.constant, constant, variable.other.enummember',
        foreground: 'var(blue)',
      },
      {
        name: 'Numbers',
        scope: 'constant.numeric',
        foreground: 'var(green2)',
      },
      {
        name: 'Comments',
        scope: 'comment, punctuation.definition.comment',
        foreground: 'var(green)',
        font_style: 'italic',
      },
      {
        name: 'Escape sequences',
        scope: 'constant.character.escape',
        foreground: 'var(orange2)',
      },
      {
        name: 'Preprocessor',
        scope: 'meta.preprocessor',
        foreground: 'var(blue2)',
      },
      {
        name: 'Punctuation',
        scope: 'punctuation, meta.brace, meta.delimiter',
        foreground: 'var(grey3)',
      },
    ],
  };
}
