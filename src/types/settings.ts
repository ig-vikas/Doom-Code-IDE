export interface AppSettings {
  editor: EditorSettings;
  ui: UISettings;
  build: BuildSettings;
  template: TemplateSettings;
  terminal: TerminalSettings;
  files: FileSettings;
  animations: AnimationSettings;
}

export interface EditorSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  wordWrapColumn: number;
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  cursorStyle: 'line' | 'block' | 'underline';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorWidth: number;
  smoothScrolling: boolean;
  fontLigatures: boolean;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all';
  bracketPairColorization: boolean;
  autoClosingBrackets: 'always' | 'languageDefined' | 'never';
  autoClosingQuotes: 'always' | 'languageDefined' | 'never';
  formatOnPaste: boolean;
  formatOnType: boolean;
  snippetSuggestions: 'top' | 'bottom' | 'inline' | 'none';
  suggestOnTriggerCharacters: boolean;
  acceptSuggestionOnEnter: 'on' | 'smart' | 'off';
  mouseWheelZoom: boolean;
  stickyScroll: boolean;
  linkedEditing: boolean;
  guides: {
    indentation: boolean;
    bracketPairs: boolean;
  };
}

export interface UISettings {
  theme: string;
  editorColorScheme: string;
  sidebarWidth: number;
  sidebarVisible: boolean;
  bottomPanelHeight: number;
  bottomPanelVisible: boolean;
  statusBarVisible: boolean;
  menuBarVisible: boolean;
  activityBarVisible: boolean;
  zoomLevel: number;
  fontFamily: string;
  fontSize: number;
}

export interface BuildSettings {
  compilerPath: string;
  defaultProfile: string;
  saveBeforeBuild: boolean;
  clearOutputBeforeBuild: boolean;
  showExecutionTime: boolean;
}

export interface TemplateSettings {
  autoInsert: boolean;
  showAnimation: boolean;
}

export interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
}

export interface FileSettings {
  autoSave: 'off' | 'onFocusLost' | 'afterDelay';
  autoSaveDelay: number;
  trimTrailingWhitespace: boolean;
  insertFinalNewline: boolean;
  encoding: string;
  eol: 'auto' | 'lf' | 'crlf';
  hotExit: boolean;
  exclude: string[];
}

export interface AnimationSettings {
  enabled: boolean;
  duration: number;
}
