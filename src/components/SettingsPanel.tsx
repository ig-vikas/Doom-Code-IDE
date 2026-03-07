import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSettingsStore, useThemeStore, useUIStore, useBuildStore, useKeybindingStore, useEditorSchemeStore } from '../stores';
import { useSolveCounterStore } from '../stores/solveCounterStore';
import { saveConfig } from '../services/configService';
import type { AppSettings } from '../types';
import { VscClose, VscEdit } from 'react-icons/vsc';
import { defaultKeybindings } from '../config/defaultKeybindings';
import ThemeEditor from './ThemeEditor';
import SchemeEditor from './SchemeEditor';

type SettingsCategory = 'editor' | 'appearance' | 'build' | 'terminal' | 'files' | 'keybindings' | 'statistics';

const categories: { id: SettingsCategory; label: string }[] = [
  { id: 'editor', label: 'Editor' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'build', label: 'Build' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'files', label: 'Files' },
  { id: 'keybindings', label: 'Keybindings' },
  { id: 'statistics', label: 'Statistics' },
];

export default function SettingsPanel() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('editor');
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const settings = useSettingsStore((s) => s.settings);

  const handleClose = useCallback(() => {
    setSettingsOpen(false);
    // Auto-save settings
    saveConfig('settings.json', settings).catch(() => {});
  }, [setSettingsOpen, settings]);

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-title">Settings</div>
        <button className="icon-btn" onClick={handleClose} title="Close">
          <VscClose />
        </button>
      </div>
      <div className="settings-body">
        <div className="settings-sidebar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`settings-sidebar-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="settings-content">
          {activeCategory === 'editor' && <EditorSettings />}
          {activeCategory === 'appearance' && <AppearanceSettings />}
          {activeCategory === 'build' && <BuildSettings />}
          {activeCategory === 'terminal' && <TerminalSettings />}
          {activeCategory === 'files' && <FilesSettings />}
          {activeCategory === 'keybindings' && <KeybindingsInfo />}
          {activeCategory === 'statistics' && <SolveStats />}
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`toggle-switch ${value ? 'active' : ''}`} onClick={() => onChange(!value)}>
      <div className="toggle-switch-knob" />
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row-info">
        <div className="settings-row-label">{label}</div>
        {description && <div className="settings-row-desc">{description}</div>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

function EditorSettings() {
  const settings = useSettingsStore((s) => s.settings.editor);
  const updateEditor = useSettingsStore((s) => s.updateEditor);

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">Font</div>
        <SettingRow label="Font Family" description="Controls the editor font family">
          <input
            type="text"
            className="settings-select"
            value={settings.fontFamily}
            onChange={(e) => updateEditor({ fontFamily: e.target.value })}
            style={{ minWidth: 200 }}
          />
        </SettingRow>
        <SettingRow label="Font Size" description="Controls the editor font size in pixels">
          <input
            type="number"
            className="settings-number"
            value={settings.fontSize}
            min={8}
            max={40}
            onChange={(e) => updateEditor({ fontSize: Number(e.target.value) })}
          />
        </SettingRow>
        <SettingRow label="Line Height" description="Controls the line height">
          <input
            type="number"
            className="settings-number"
            value={settings.lineHeight}
            min={1}
            max={3}
            step={0.1}
            onChange={(e) => updateEditor({ lineHeight: Number(e.target.value) })}
          />
        </SettingRow>
        <SettingRow label="Tab Size" description="Number of spaces a tab equals">
          <input
            type="number"
            className="settings-number"
            value={settings.tabSize}
            min={1}
            max={8}
            onChange={(e) => updateEditor({ tabSize: Number(e.target.value) })}
          />
        </SettingRow>
        <SettingRow label="Font Ligatures" description="Enable font ligatures">
          <ToggleSwitch value={settings.fontLigatures} onChange={(v) => updateEditor({ fontLigatures: v })} />
        </SettingRow>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Editor</div>
        <SettingRow label="Word Wrap" description="Controls how lines should wrap">
          <select
            className="settings-select"
            value={settings.wordWrap}
            onChange={(e) => updateEditor({ wordWrap: e.target.value as any })}
          >
            <option value="off">Off</option>
            <option value="on">On</option>
            <option value="wordWrapColumn">Word Wrap Column</option>
          </select>
        </SettingRow>
        <SettingRow label="Minimap" description="Show minimap">
          <ToggleSwitch value={settings.minimap} onChange={(v) => updateEditor({ minimap: v })} />
        </SettingRow>
        <SettingRow label="Line Numbers" description="Controls line numbers display">
          <select
            className="settings-select"
            value={settings.lineNumbers}
            onChange={(e) => updateEditor({ lineNumbers: e.target.value as any })}
          >
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="relative">Relative</option>
          </select>
        </SettingRow>
        <SettingRow label="Cursor Style" description="Controls cursor style">
          <select
            className="settings-select"
            value={settings.cursorStyle}
            onChange={(e) => updateEditor({ cursorStyle: e.target.value as any })}
          >
            <option value="line">Line</option>
            <option value="block">Block</option>
            <option value="underline">Underline</option>
          </select>
        </SettingRow>
        <SettingRow label="Cursor Blinking" description="Controls cursor animation style">
          <select
            className="settings-select"
            value={settings.cursorBlinking}
            onChange={(e) => updateEditor({ cursorBlinking: e.target.value as any })}
          >
            <option value="blink">Blink</option>
            <option value="smooth">Smooth</option>
            <option value="phase">Phase</option>
            <option value="expand">Expand</option>
            <option value="solid">Solid</option>
          </select>
        </SettingRow>
        <SettingRow label="Smooth Scrolling" description="Enable smooth scrolling">
          <ToggleSwitch value={settings.smoothScrolling} onChange={(v) => updateEditor({ smoothScrolling: v })} />
        </SettingRow>
        <SettingRow label="Bracket Pair Colorization" description="Color matching brackets">
          <ToggleSwitch value={settings.bracketPairColorization} onChange={(v) => updateEditor({ bracketPairColorization: v })} />
        </SettingRow>
        <SettingRow label="Render Whitespace" description="Controls how whitespace is rendered">
          <select
            className="settings-select"
            value={settings.renderWhitespace}
            onChange={(e) => updateEditor({ renderWhitespace: e.target.value as any })}
          >
            <option value="none">None</option>
            <option value="boundary">Boundary</option>
            <option value="selection">Selection</option>
            <option value="all">All</option>
          </select>
        </SettingRow>
        <SettingRow label="Snippet Suggestions" description="Controls snippet suggestion position">
          <select
            className="settings-select"
            value={settings.snippetSuggestions}
            onChange={(e) => updateEditor({ snippetSuggestions: e.target.value as any })}
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="inline">Inline</option>
            <option value="none">None</option>
          </select>
        </SettingRow>
        <SettingRow label="Mouse Wheel Zoom" description="Zoom editor with Ctrl+Scroll">
          <ToggleSwitch value={settings.mouseWheelZoom} onChange={(v) => updateEditor({ mouseWheelZoom: v })} />
        </SettingRow>
        <SettingRow label="Sticky Scroll" description="Show sticky scroll at the top">
          <ToggleSwitch value={settings.stickyScroll} onChange={(v) => updateEditor({ stickyScroll: v })} />
        </SettingRow>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const themes = useThemeStore((s) => s.themes);
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const customThemes = useThemeStore((s) => s.customThemes);
  const schemes = useEditorSchemeStore((s) => s.schemes);
  const currentScheme = useEditorSchemeStore((s) => s.currentScheme);
  const setScheme = useEditorSchemeStore((s) => s.setScheme);
  const settings = useSettingsStore((s) => s.settings.ui);
  const updateUI = useSettingsStore((s) => s.updateUI);
  const zoomLevel = useUIStore((s) => s.zoomLevel);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [showSchemeEditor, setShowSchemeEditor] = useState(false);

  if (showThemeEditor) {
    return <ThemeEditor onClose={() => setShowThemeEditor(false)} />;
  }
  if (showSchemeEditor) {
    return <SchemeEditor onClose={() => setShowSchemeEditor(false)} />;
  }

  // Extract preview colors from a scheme's monacoTheme rules
  const getSchemePreviewColors = (scheme: typeof currentScheme) => {
    const rules = scheme.monacoTheme.rules;
    const find = (token: string) => rules.find((r) => r.token === token)?.foreground;
    return {
      bg: scheme.monacoTheme.colors['editor.background'] || '#1E1E1E',
      fg: scheme.monacoTheme.colors['editor.foreground'] || '#D4D4D4',
      keyword: find('keyword') || 'CCCCCC',
      string: find('string') || 'CCCCCC',
      comment: find('comment') || 'CCCCCC',
      fn: find('entity.name.function') || find('support.function') || 'CCCCCC',
      type: find('type') || find('type.identifier') || 'CCCCCC',
      number: find('number') || 'CCCCCC',
    };
  };

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>App Theme</span>
          <button
            className="snippet-btn secondary"
            onClick={() => setShowThemeEditor(true)}
            style={{ fontSize: '0.846rem', padding: '2px 8px' }}
          >
            <VscEdit style={{ marginRight: 4 }} /> Customize
          </button>
        </div>
        <div style={{ fontSize: '0.846rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          Controls the UI appearance — titlebar, sidebar, panels, and borders.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
          {themes.map((theme) => (
            <div
              key={theme.id}
              onClick={() => {
                setTheme(theme.id);
                updateUI({ theme: theme.id });
              }}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${currentTheme.id === theme.id ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                background: theme.colors.bgBase,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: theme.colors.accentPrimary }} />
                <div style={{ width: 12, height: 12, borderRadius: 3, background: theme.colors.accentBlue }} />
                <div style={{ width: 12, height: 12, borderRadius: 3, background: theme.colors.accentGreen }} />
                <div style={{ width: 12, height: 12, borderRadius: 3, background: theme.colors.accentRed }} />
              </div>
              <div style={{ fontSize: '0.923rem', color: theme.colors.textPrimary, fontWeight: 500 }}>
                {theme.name}
              </div>
              <div style={{ fontSize: '0.769rem', color: theme.colors.textMuted }}>
                {theme.type}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Editor Color Scheme</span>
          <button
            className="snippet-btn secondary"
            onClick={() => setShowSchemeEditor(true)}
            style={{ fontSize: '0.846rem', padding: '2px 8px' }}
          >
            <VscEdit style={{ marginRight: 4 }} /> Customize
          </button>
        </div>
        <div style={{ fontSize: '0.846rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          Controls syntax highlighting and editor colors — independent from the app theme.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
          {schemes.map((scheme) => {
            const preview = getSchemePreviewColors(scheme);
            const isActive = currentScheme.id === scheme.id;
            return (
              <div
                key={scheme.id}
                onClick={() => {
                  setScheme(scheme.id);
                  updateUI({ editorColorScheme: scheme.id });
                }}
                className="editor-scheme-card"
                style={{
                  border: `2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  background: preview.bg,
                }}
              >
                <div className="editor-scheme-preview">
                  <span style={{ color: `#${preview.comment}`, fontStyle: 'italic' }}>{'// code'}</span>
                  <span><span style={{ color: `#${preview.keyword}` }}>int</span> <span style={{ color: `#${preview.fn}` }}>main</span><span style={{ color: preview.fg }}>() {'{'}</span></span>
                  <span>{'  '}<span style={{ color: `#${preview.keyword}` }}>return</span> <span style={{ color: `#${preview.number}` }}>0</span><span style={{ color: preview.fg }}>;</span></span>
                  <span style={{ color: preview.fg }}>{'}'}</span>
                </div>
                <div className="editor-scheme-info">
                  <div className="editor-scheme-name">{scheme.name}</div>
                  <div className="editor-scheme-tokens">
                    <span style={{ background: `#${preview.keyword}` }} />
                    <span style={{ background: `#${preview.string}` }} />
                    <span style={{ background: `#${preview.fn}` }} />
                    <span style={{ background: `#${preview.type}` }} />
                    <span style={{ background: `#${preview.number}` }} />
                    <span style={{ background: `#${preview.comment}` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Interface</div>
        <SettingRow label="UI Font Family" description="Font used for the interface">
          <input
            type="text"
            className="settings-select"
            value={settings.fontFamily}
            onChange={(e) => updateUI({ fontFamily: e.target.value })}
            style={{ minWidth: 200 }}
          />
        </SettingRow>
        <SettingRow label="UI Font Size" description="Font size for the interface">
          <input
            type="number"
            className="settings-number"
            value={settings.fontSize}
            min={10}
            max={20}
            onChange={(e) => updateUI({ fontSize: Number(e.target.value) })}
          />
        </SettingRow>
        <SettingRow label="Zoom Level" description={`Current zoom: ${zoomLevel}%`}>
          <input
            type="range"
            min={50}
            max={200}
            value={zoomLevel}
            onChange={(e) => {
              const ui = useUIStore.getState();
              const v = Number(e.target.value);
              // Directly set zoom
              (ui as any).zoomLevel = v;
              useUIStore.setState({ zoomLevel: v });
            }}
            style={{ width: 120 }}
          />
        </SettingRow>
        <SettingRow label="Status Bar" description="Show/hide the status bar">
          <ToggleSwitch value={settings.statusBarVisible} onChange={(v) => updateUI({ statusBarVisible: v })} />
        </SettingRow>
        <SettingRow label="Menu Bar" description="Show/hide the menu bar">
          <ToggleSwitch value={settings.menuBarVisible} onChange={(v) => updateUI({ menuBarVisible: v })} />
        </SettingRow>
        <SettingRow label="Activity Bar" description="Show/hide the activity bar">
          <ToggleSwitch value={settings.activityBarVisible} onChange={(v) => updateUI({ activityBarVisible: v })} />
        </SettingRow>
      </div>
    </div>
  );
}

function BuildSettings() {
  const settings = useSettingsStore((s) => s.settings.build);
  const updateBuild = useSettingsStore((s) => s.updateBuild);
  const profiles = useBuildStore((s) => s.profiles);
  const activeProfileId = useBuildStore((s) => s.activeProfileId);
  const setActiveProfile = useBuildStore((s) => s.setActiveProfile);

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">Compiler</div>
        <SettingRow label="Compiler Path" description="Path to the C++ compiler">
          <input
            type="text"
            className="settings-select"
            value={settings.compilerPath}
            onChange={(e) => updateBuild({ compilerPath: e.target.value })}
            style={{ minWidth: 160 }}
          />
        </SettingRow>
        <SettingRow label="Build Profile" description="Active compilation profile">
          <select
            className="settings-select"
            value={activeProfileId}
            onChange={(e) => setActiveProfile(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.flags.join(' ')})
              </option>
            ))}
          </select>
        </SettingRow>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Build Options</div>
        <SettingRow label="Save Before Build" description="Automatically save files before building">
          <ToggleSwitch value={settings.saveBeforeBuild} onChange={(v) => updateBuild({ saveBeforeBuild: v })} />
        </SettingRow>
        <SettingRow label="Clear Output Before Build" description="Clear the output panel before each build">
          <ToggleSwitch value={settings.clearOutputBeforeBuild} onChange={(v) => updateBuild({ clearOutputBeforeBuild: v })} />
        </SettingRow>
        <SettingRow label="Show Execution Time" description="Display execution time after running">
          <ToggleSwitch value={settings.showExecutionTime} onChange={(v) => updateBuild({ showExecutionTime: v })} />
        </SettingRow>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Build Profiles</div>
        {profiles.map((p) => (
          <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: '0.923rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {p.flags.join(' ')}
            </div>
            <div style={{ fontSize: '0.846rem', color: 'var(--text-faint)', marginTop: 2 }}>
              Time Limit: {p.timeLimit}ms | Standard: {p.standard}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TerminalSettings() {
  const settings = useSettingsStore((s) => s.settings.terminal);
  const updateTerminal = useSettingsStore((s) => s.updateTerminal);

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">Terminal</div>
        <SettingRow label="Font Family" description="Terminal font family">
          <input
            type="text"
            className="settings-select"
            value={settings.fontFamily}
            onChange={(e) => updateTerminal({ fontFamily: e.target.value })}
            style={{ minWidth: 200 }}
          />
        </SettingRow>
        <SettingRow label="Font Size" description="Terminal font size">
          <input
            type="number"
            className="settings-number"
            value={settings.fontSize}
            min={8}
            max={28}
            onChange={(e) => updateTerminal({ fontSize: Number(e.target.value) })}
          />
        </SettingRow>
        <SettingRow label="Cursor Style" description="Terminal cursor style">
          <select
            className="settings-select"
            value={settings.cursorStyle}
            onChange={(e) => updateTerminal({ cursorStyle: e.target.value as any })}
          >
            <option value="block">Block</option>
            <option value="bar">Bar</option>
            <option value="underline">Underline</option>
          </select>
        </SettingRow>
        <SettingRow label="Cursor Blink" description="Enable cursor blinking">
          <ToggleSwitch value={settings.cursorBlink} onChange={(v) => updateTerminal({ cursorBlink: v })} />
        </SettingRow>
        <SettingRow label="Scrollback" description="Number of lines kept in terminal buffer">
          <input
            type="number"
            className="settings-number"
            value={settings.scrollback}
            min={100}
            max={100000}
            step={1000}
            onChange={(e) => updateTerminal({ scrollback: Number(e.target.value) })}
          />
        </SettingRow>
      </div>
    </div>
  );
}

function FilesSettings() {
  const settings = useSettingsStore((s) => s.settings.files);
  const updateFiles = useSettingsStore((s) => s.updateFiles);

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">Saving</div>
        <SettingRow label="Auto Save" description="Controls auto save of files">
          <select
            className="settings-select"
            value={settings.autoSave}
            onChange={(e) => updateFiles({ autoSave: e.target.value as any })}
          >
            <option value="off">Off</option>
            <option value="afterDelay">After Delay</option>
            <option value="onFocusLost">On Focus Lost</option>
          </select>
        </SettingRow>
        {settings.autoSave === 'afterDelay' && (
          <SettingRow label="Auto Save Delay" description="Delay in ms before auto saving">
            <input
              type="number"
              className="settings-number"
              value={settings.autoSaveDelay}
              min={100}
              max={30000}
              step={100}
              onChange={(e) => updateFiles({ autoSaveDelay: Number(e.target.value) })}
            />
          </SettingRow>
        )}
        <SettingRow label="Hot Exit" description="Remember unsaved files when closing">
          <ToggleSwitch value={settings.hotExit} onChange={(v) => updateFiles({ hotExit: v })} />
        </SettingRow>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Formatting</div>
        <SettingRow label="Trim Trailing Whitespace" description="Remove trailing whitespace on save">
          <ToggleSwitch value={settings.trimTrailingWhitespace} onChange={(v) => updateFiles({ trimTrailingWhitespace: v })} />
        </SettingRow>
        <SettingRow label="Insert Final Newline" description="Ensure file ends with a newline">
          <ToggleSwitch value={settings.insertFinalNewline} onChange={(v) => updateFiles({ insertFinalNewline: v })} />
        </SettingRow>
        <SettingRow label="End of Line" description="Default end of line character">
          <select
            className="settings-select"
            value={settings.eol}
            onChange={(e) => updateFiles({ eol: e.target.value as any })}
          >
            <option value="auto">Auto</option>
            <option value="lf">LF (\\n)</option>
            <option value="crlf">CRLF (\\r\\n)</option>
          </select>
        </SettingRow>
        <SettingRow label="Encoding" description="Default file encoding">
          <select className="settings-select" value={settings.encoding} onChange={(e) => updateFiles({ encoding: e.target.value })}>
            <option value="utf-8">UTF-8</option>
            <option value="utf-16">UTF-16</option>
            <option value="ascii">ASCII</option>
          </select>
        </SettingRow>
      </div>
    </div>
  );
}

function KeybindingsInfo() {
  const overrides = useKeybindingStore((s) => s.overrides);
  const setKeybinding = useKeybindingStore((s) => s.setKeybinding);
  const resetKeybinding = useKeybindingStore((s) => s.resetKeybinding);
  const resetAll = useKeybindingStore((s) => s.resetAll);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  const bindings = defaultKeybindings
    .filter((kb) => !kb.key.includes(' ')) // only single-key bindings
    .filter((kb) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      const currentKey = overrides[kb.id] ?? kb.key;
      return (
        (kb.label ?? '').toLowerCase().includes(q) ||
        kb.command.toLowerCase().includes(q) ||
        currentKey.toLowerCase().includes(q)
      );
    });

  function handleKeyCapture(e: React.KeyboardEvent, kbId: string) {
    e.preventDefault();
    e.stopPropagation();
    const ignore = ['Control', 'Shift', 'Alt', 'Meta'];
    if (ignore.includes(e.key)) return;

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    if (e.metaKey) parts.push('meta');

    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';
    else if (key === 'escape') { setEditingId(null); return; }
    parts.push(key);

    setKeybinding(kbId, parts.join('+'));
    setEditingId(null);
  }

  const isModified = (id: string) => id in overrides;

  return (
    <div>
      <div className="settings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="settings-section-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
            Keyboard Shortcuts
          </div>
          {Object.keys(overrides).length > 0 && (
            <button className="kb-reset-all-btn" onClick={resetAll}>
              Reset All
            </button>
          )}
        </div>
        <input
          className="kb-search-input"
          type="text"
          placeholder="Search keybindings..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="kb-table">
          <div className="kb-table-header">
            <span className="kb-col-command">Command</span>
            <span className="kb-col-key">Keybinding</span>
            <span className="kb-col-actions"></span>
          </div>
          {bindings.map((kb) => {
            const currentKey = overrides[kb.id] ?? kb.key;
            const modified = isModified(kb.id);
            const editing = editingId === kb.id;
            return (
              <div key={kb.id} className={`kb-row ${modified ? 'kb-modified' : ''}`}>
                <span className="kb-col-command">
                  <span className="kb-label">{kb.label ?? kb.command}</span>
                  <span className="kb-command-id">{kb.command}</span>
                </span>
                <span className="kb-col-key">
                  {editing ? (
                    <input
                      ref={inputRef}
                      className="kb-capture-input"
                      placeholder="Press keys..."
                      readOnly
                      onKeyDown={(e) => handleKeyCapture(e, kb.id)}
                      onBlur={() => setEditingId(null)}
                    />
                  ) : (
                    <span className="kb-key-badge" onClick={() => setEditingId(kb.id)} title="Click to edit">
                      {formatKey(currentKey)}
                    </span>
                  )}
                </span>
                <span className="kb-col-actions">
                  <button className="kb-edit-btn" onClick={() => setEditingId(kb.id)} title="Edit keybinding">
                    <VscEdit size={13} />
                  </button>
                  {modified && (
                    <button className="kb-reset-btn" onClick={() => resetKeybinding(kb.id)} title="Reset to default">
                      ↩
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .split('+')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' + ');
}

function SolveStats() {
  const records = useSolveCounterStore((s) => s.records);
  const todayCount = useSolveCounterStore((s) => s.todayCount);
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const todayKey = new Date().toISOString().slice(0, 10);

  const dailyData = useMemo(() => {
    const entries = Object.entries(records)
      .map(([date, r]) => ({ date, count: r.count }))
      .sort((a, b) => b.date.localeCompare(a.date));
    // Show last 30 days (fill gaps with 0)
    const days: { date: string; count: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = entries.find((e) => e.date === key);
      days.push({ date: key, count: found ? found.count : 0 });
    }
    return days;
  }, [records]);

  const weeklyData = useMemo(() => {
    // Group by ISO week, last 12 weeks
    const weeks: { label: string; count: number }[] = [];
    for (let w = 0; w < 12; w++) {
      let total = 0;
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        const key = day.toISOString().slice(0, 10);
        if (records[key]) total += records[key].count;
      }
      const endOfWeek = new Date(weekStart);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      const label = `${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
      weeks.push({ label, count: total });
    }
    return weeks;
  }, [records]);

  const monthlyData = useMemo(() => {
    const months: { label: string; count: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      const year = d.getFullYear();
      const month = d.getMonth();
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      let total = 0;
      Object.entries(records).forEach(([date, r]) => {
        if (date.startsWith(prefix)) total += r.count;
      });
      months.push({ label: d.toLocaleDateString('en', { month: 'long', year: 'numeric' }), count: total });
    }
    return months;
  }, [records]);

  const currentData = view === 'daily' ? dailyData : view === 'weekly' ? weeklyData : monthlyData;
  const maxCount = Math.max(1, ...currentData.map((d) => d.count));
  const totalAll = Object.values(records).reduce((s, r) => s + r.count, 0);
  const labelKey = view === 'daily' ? 'date' : 'label';

  return (
    <div className="settings-section">
      <h3>Solve Statistics</h3>
      <div className="stats-summary">
        <div className="stats-card">
          <div className="stats-card-value">{todayCount}</div>
          <div className="stats-card-label">Today</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{dailyData.slice(0, 7).reduce((s, d) => s + d.count, 0)}</div>
          <div className="stats-card-label">This Week</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-value">{totalAll}</div>
          <div className="stats-card-label">All Time</div>
        </div>
      </div>

      <div className="stats-tabs">
        <button className={`stats-tab ${view === 'daily' ? 'active' : ''}`} onClick={() => setView('daily')}>Daily</button>
        <button className={`stats-tab ${view === 'weekly' ? 'active' : ''}`} onClick={() => setView('weekly')}>Weekly</button>
        <button className={`stats-tab ${view === 'monthly' ? 'active' : ''}`} onClick={() => setView('monthly')}>Monthly</button>
      </div>

      <div className="stats-chart">
        {currentData.map((item, i) => {
          const label = 'date' in item ? item.date : (item as { label: string }).label;
          const isToday = 'date' in item && item.date === todayKey;
          return (
            <div key={i} className={`stats-bar-row ${isToday ? 'today' : ''}`}>
              <span className="stats-bar-label">{label}</span>
              <div className="stats-bar-track">
                <div
                  className="stats-bar-fill"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="stats-bar-count">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
