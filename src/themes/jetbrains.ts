import type { ThemeDefinition } from '../types';

export const jetbrainsTheme: ThemeDefinition = {
  id: 'jetbrains', name: 'JetBrains Dark', type: 'dark',
  colors: {
    bgDeepest: '#1e1f22', bgBase: '#2b2d30', bgSurface: '#313335', bgElevated: '#3c3f41',
    bgOverlay: '#2b2d30e6', bgHighlight: '#4e5254', bgActive: '#2d5f8a', bgIntense: '#57595b',
    accentPrimary: '#3574f0', accentSecondary: '#2b5bc2', accentTertiary: '#1e3f7a',
    accentGlow: '#5a9df5', accentBlue: '#6897bb', accentGreen: '#6a8759', accentRed: '#ff6b68',
    accentYellow: '#bbb529', accentOrange: '#cc7832', accentPurple: '#9876aa', accentCyan: '#299999',
    accentTeal: '#299999', accentPink: '#c77dbb',
    textPrimary: '#bcbec4', textSecondary: '#a9b7c6', textMuted: '#7a7e85', textFaint: '#5a5d63',
    textInverse: '#1e1f22',
    borderSubtle: '#393b40', borderDefault: '#43454a', borderStrong: '#57595b', borderAccent: '#3574f0',
    scrollbarThumb: '#4e5254', scrollbarThumbHover: '#595b5d', scrollbarTrack: 'transparent',
  },
  monacoTheme: {
    base: 'vs-dark', inherit: true,
    rules: [
      // Comments — grey
      { token: 'comment', foreground: '7a7e85', fontStyle: 'italic' },
      // Keywords — orange (JetBrains signature)
      { token: 'keyword', foreground: 'cc7832', fontStyle: 'bold' },
      { token: 'keyword.control', foreground: 'cc7832', fontStyle: 'bold' },
      { token: 'storage', foreground: 'cc7832', fontStyle: 'bold' },
      { token: 'storage.type', foreground: 'cc7832', fontStyle: 'bold' },
      { token: 'storage.modifier', foreground: 'cc7832', fontStyle: 'bold' },
      // Types & classes — light purple
      { token: 'type', foreground: 'b5b6e3' },
      { token: 'type.identifier', foreground: 'b5b6e3' },
      { token: 'entity.name.type', foreground: 'b5b6e3' },
      { token: 'entity.name.class', foreground: 'b5b6e3' },
      { token: 'support.type', foreground: 'b5b6e3' },
      { token: 'support.class', foreground: 'b5b6e3' },
      // Functions — white/light
      { token: 'entity.name.function', foreground: 'ffc66d' },
      { token: 'support.function', foreground: 'ffc66d' },
      // Variables — light grey
      { token: 'variable', foreground: 'a9b7c6' },
      { token: 'variable.parameter', foreground: 'a9b7c6' },
      // Constants — purple
      { token: 'constant', foreground: '9876aa' },
      { token: 'constant.language', foreground: 'cc7832', fontStyle: 'bold' },
      // Numbers — blue
      { token: 'number', foreground: '6897bb' },
      // Strings — green
      { token: 'string', foreground: '6a8759' },
      { token: 'string.escape', foreground: 'cc7832' },
      // Operators — white
      { token: 'operator', foreground: 'a9b7c6' },
      // Preprocessor — olive/yellow
      { token: 'meta.preprocessor', foreground: 'bbb529' },
      // Delimiters & brackets
      { token: 'delimiter', foreground: 'a9b7c6' },
      { token: 'delimiter.bracket', foreground: 'a9b7c6' },
      // Tags (for HTML/XML)
      { token: 'tag', foreground: 'e8bf6a' },
      { token: 'attribute.name', foreground: 'bababa' },
      { token: 'attribute.value', foreground: 'a5c261' },
      // Namespace
      { token: 'namespace', foreground: 'b5b6e3' },
      // Regular text
      { token: '', foreground: 'a9b7c6' },
      { token: 'identifier', foreground: 'a9b7c6' },
    ],
    colors: {
      'editor.background': '#2b2d30',
      'editor.foreground': '#a9b7c6',
      'editor.lineHighlightBackground': '#2c2c2c',
      'editor.selectionBackground': '#214283',
      'editor.selectionHighlightBackground': '#32593d',
      'editorCursor.foreground': '#bcbec4',
      'editorLineNumber.foreground': '#7a7e85',
      'editorLineNumber.activeForeground': '#a9b7c6',
      'editorGutter.background': '#2b2d30',
      'editorIndentGuide.background': '#393b40',
      'editorIndentGuide.activeBackground': '#57595b',
      'editorBracketMatch.background': '#3b514d',
      'editorBracketMatch.border': '#3b514d',
      'editor.findMatchBackground': '#32593d',
      'editor.findMatchHighlightBackground': '#214283',
      'editorWidget.background': '#313335',
      'editorWidget.border': '#43454a',
      'editorSuggestWidget.background': '#313335',
      'editorSuggestWidget.border': '#43454a',
      'editorSuggestWidget.selectedBackground': '#2d5f8a',
      'editorSuggestWidget.highlightForeground': '#3574f0',
      'editorHoverWidget.background': '#313335',
      'editorHoverWidget.border': '#43454a',
      'input.background': '#1e1f22',
      'input.border': '#43454a',
      'input.foreground': '#a9b7c6',
      'input.placeholderForeground': '#7a7e85',
      'scrollbar.shadow': '#00000050',
      'scrollbarSlider.background': '#4e525480',
      'scrollbarSlider.hoverBackground': '#595b5d',
      'scrollbarSlider.activeBackground': '#595b5d',
      'minimap.background': '#2b2d30',
      'editorOverviewRuler.border': '#393b40',
    },
  },
};
