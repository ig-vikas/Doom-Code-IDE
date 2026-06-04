import { useState, useCallback, useEffect, useRef, useMemo, type CSSProperties } from 'react';
import { useSettingsStore, useThemeStore, useUIStore, useBuildStore, useKeybindingStore, useEditorSchemeStore } from '../stores';
import { useSolveCounterStore } from '../stores/solveCounterStore';
import { saveConfigIfChanged } from '../services/configService';
import { normalizeGitHubTokenIndex, parseGitHubTokenPool } from '../services/githubTokenPool';
import type { AppSettings } from '../types';
import type { IconType } from 'react-icons';
import {
  VscClose,
  VscCode,
  VscEdit,
  VscFiles,
  VscGraph,
  VscGithub,
  VscKeyboardTab,
  VscPaintcan,
  VscTerminal,
  VscTools,
} from 'react-icons/vsc';
import { defaultKeybindings } from '../config/defaultKeybindings';
import { EDITOR_FONT_OPTIONS, isAllowedEditorFontFamily } from '../config/lockedAppearance';

type SettingsCategory = 'editor' | 'appearance' | 'build' | 'github' | 'terminal' | 'files' | 'keybindings' | 'statistics';

interface SettingsCategoryDefinition {
  id: SettingsCategory;
  label: string;
  caption: string;
  accent: string;
  icon: IconType;
}

const categories: SettingsCategoryDefinition[] = [
  { id: 'editor', label: 'Editor', caption: 'Cursor + code flow', accent: 'var(--accent-blue)', icon: VscCode },
  { id: 'appearance', label: 'Appearance', caption: 'Theme + interface', accent: 'var(--accent-pink)', icon: VscPaintcan },
  { id: 'build', label: 'Build', caption: 'Compiler + runner', accent: 'var(--accent-orange)', icon: VscTools },
  { id: 'github', label: 'GitHub', caption: 'Token pool', accent: 'var(--accent-purple)', icon: VscGithub },
  { id: 'terminal', label: 'Terminal', caption: 'Shell + output', accent: 'var(--accent-green)', icon: VscTerminal },
  { id: 'files', label: 'Files', caption: 'Save + formatting', accent: 'var(--accent-yellow)', icon: VscFiles },
  { id: 'keybindings', label: 'Keybindings', caption: 'Shortcuts + remaps', accent: 'var(--accent-cyan)', icon: VscKeyboardTab },
  { id: 'statistics', label: 'Statistics', caption: 'Progress + streaks', accent: 'var(--accent-teal)', icon: VscGraph },
];

const editorFontPresets = EDITOR_FONT_OPTIONS;

export default function SettingsPanel() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('editor');
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const settings = useSettingsStore((s) => s.settings);

  const handleClose = useCallback(() => {
    setSettingsOpen(false);
    // Auto-save settings
    saveConfigIfChanged('settings.json', settings).catch(() => {});
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
        <SettingsSidebar activeCategory={activeCategory} onChangeCategory={setActiveCategory} />
        <div className="settings-content">
          {activeCategory === 'editor' && <EditorSettings />}
          {activeCategory === 'appearance' && <AppearanceSettings />}
          {activeCategory === 'build' && <BuildSettings />}
          {activeCategory === 'github' && <GitHubSettings />}
          {activeCategory === 'terminal' && <TerminalSettings />}
          {activeCategory === 'files' && <FilesSettings />}
          {activeCategory === 'keybindings' && <KeybindingsInfo />}
          {activeCategory === 'statistics' && <SolveStats />}
        </div>
      </div>
    </div>
  );
}

/* ── Arc geometry helpers (shared with RadialDoomMenu) ── */
function sToRad(deg: number) { return (deg * Math.PI) / 180; }
function sPolarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = sToRad(deg);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function sArcPath(cx: number, cy: number, innerR: number, outerR: number, startDeg: number, endDeg: number) {
  const s1 = sPolarXY(cx, cy, outerR, startDeg);
  const s2 = sPolarXY(cx, cy, outerR, endDeg);
  const s3 = sPolarXY(cx, cy, innerR, endDeg);
  const s4 = sPolarXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M${s1.x},${s1.y}`,
    `A${outerR},${outerR} 0 ${large} 1 ${s2.x},${s2.y}`,
    `L${s3.x},${s3.y}`,
    `A${innerR},${innerR} 0 ${large} 0 ${s4.x},${s4.y}`,
    'Z',
  ].join(' ');
}

// Settings arc constants — half-disc opening to the RIGHT (from -80° to +80°)
const S_CX = 0;
const S_CY = 220;
const S_INNER_R = 40;
const S_OUTER_R = 175;
const S_START_DEG = -86;
const S_END_DEG = 86;
const S_GAP = 1.8;
const S_COLLAPSED_R = 26;

function SettingsSidebar({ activeCategory, onChangeCategory }: { activeCategory: SettingsCategory, onChangeCategory: (cat: SettingsCategory) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelCollapse = useCallback(() => {
    if (collapseTimerRef.current) { clearTimeout(collapseTimerRef.current); collapseTimerRef.current = null; }
  }, []);

  const handleMouseEnter = useCallback(() => { cancelCollapse(); setIsExpanded(true); }, [cancelCollapse]);
  const handleMouseLeave = useCallback(() => {
    cancelCollapse();
    collapseTimerRef.current = setTimeout(() => { setIsExpanded(false); setHoveredItem(null); }, 350);
  }, [cancelCollapse]);

  useEffect(() => () => { if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current); }, []);

  // Build segments
  const segments = useMemo(() => {
    const n = categories.length;
    const span = S_END_DEG - S_START_DEG;
    const totalGaps = S_GAP * (n - 1);
    const segAngle = (span - totalGaps) / n;

    return categories.map((cat, i) => {
      const start = S_START_DEG + i * (segAngle + S_GAP);
      const end = start + segAngle;
      const mid = (start + end) / 2;
      const iconR = S_INNER_R + (S_OUTER_R - S_INNER_R) * 0.32;
      const labelR = S_INNER_R + (S_OUTER_R - S_INNER_R) * 0.74;
      return {
        ...cat,
        startDeg: start,
        endDeg: end,
        midDeg: mid,
        d: sArcPath(S_CX, S_CY, S_INNER_R, S_OUTER_R, start, end),
        iconPt: sPolarXY(S_CX, S_CY, iconR, mid),
        labelPt: sPolarXY(S_CX, S_CY, labelR, mid),
      };
    });
  }, []);

  // Collapsed half-circle path
  const collapsedPath = useMemo(() => {
    const r = S_COLLAPSED_R;
    return `M ${S_CX} ${S_CY - r} A ${r} ${r} 0 0 1 ${S_CX} ${S_CY + r} Z`;
  }, []);

  const svgW = S_OUTER_R + 30;
  const svgH = S_CY + S_OUTER_R + 30;

  // Collapsed pill dimensions (tiny hover area)
  const pillW = S_COLLAPSED_R + 10;
  const pillH = S_COLLAPSED_R * 2 + 20;
  const pillViewY = S_CY - S_COLLAPSED_R - 10;

  return (
    <aside
      className={`settings-sidebar ${isExpanded ? 'expanded' : ''}`}
    >
      {/* COLLAPSED: Tiny SVG — only the pill is hoverable */}
      {!isExpanded && (
        <svg
          className="settings-radial-svg"
          width={pillW}
          height={pillH}
          viewBox={`${-5} ${pillViewY} ${pillW + 5} ${pillH}`}
          style={{ overflow: 'visible', cursor: 'pointer' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <g style={{ pointerEvents: 'auto' }}>
            <path
              d={collapsedPath}
              fill="var(--bg-surface)"
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
            <circle cx={S_CX + 8} cy={S_CY - 8} r="2" fill="var(--text-muted)" />
            <circle cx={S_CX + 8} cy={S_CY} r="2" fill="var(--text-muted)" />
            <circle cx={S_CX + 8} cy={S_CY + 8} r="2" fill="var(--text-muted)" />
          </g>
        </svg>
      )}

      {/* EXPANDED: Full-size radial SVG */}
      {isExpanded && (
        <svg
          className="settings-radial-svg"
          width={svgW}
          height={svgH}
          viewBox={`${-10} 0 ${svgW + 10} ${svgH}`}
          style={{ overflow: 'visible' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <filter id="settingsArcShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="rgba(0,0,0,0.65)" />
            </filter>
            <filter id="settingsArcGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feComposite in="SourceGraphic" in2="b" operator="over" />
            </filter>
          </defs>

          <g>
            {/* Invisible hover bridge from edge to inner arc */}
            <path
              d={sArcPath(S_CX, S_CY, 0, S_INNER_R, S_START_DEG - 5, S_END_DEG + 5)}
              fill="transparent"
              stroke="none"
              style={{ pointerEvents: 'auto' }}
            />

            {/* Main ring background */}
            <path
              d={sArcPath(S_CX, S_CY, S_INNER_R - 3, S_OUTER_R + 3, S_START_DEG - 0.5, S_END_DEG + 0.5)}
              fill="var(--bg-surface)"
              stroke="var(--border-subtle)"
              strokeWidth="1.5"
              style={{ filter: 'url(#settingsArcShadow)', pointerEvents: 'auto' }}
            />

            {/* Divider lines */}
            {segments.map((seg, i) => {
              if (i === 0) return null;
              const angle = seg.startDeg - S_GAP / 2;
              const p1 = sPolarXY(S_CX, S_CY, S_INNER_R - 2, angle);
              const p2 = sPolarXY(S_CX, S_CY, S_OUTER_R + 2, angle);
              return (
                <line
                  key={`sdiv-${i}`}
                  x1={p1.x} y1={p1.y}
                  x2={p2.x} y2={p2.y}
                  stroke="var(--border-subtle)"
                  strokeWidth="0.8"
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}

            {/* Segments */}
            {segments.map((seg, i) => {
              const isActive = activeCategory === seg.id;
              const isHovered = hoveredItem === seg.id;
              const iconSize = 18;

              return (
                <g
                  key={seg.id}
                  style={{
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    opacity: 0,
                    animation: `arcFadeIn 280ms ${i * 35}ms cubic-bezier(0.22,1,0.36,1) forwards`,
                  }}
                  onMouseEnter={() => { cancelCollapse(); setHoveredItem(seg.id); }}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => onChangeCategory(seg.id)}
                >
                  {/* Hit area + highlight */}
                  <path
                    d={seg.d}
                    fill={
                      isActive
                        ? 'var(--accent-glow)'
                        : isHovered
                          ? 'var(--border-accent)'
                          : 'transparent'
                    }
                    stroke={
                      isActive
                        ? 'var(--border-accent)'
                        : isHovered
                          ? 'var(--border-subtle)'
                          : 'transparent'
                    }
                    strokeWidth="1.5"
                    style={{
                      transition: 'fill 180ms ease, stroke 180ms ease',
                      filter: isActive ? 'url(#settingsArcGlow)' : 'none',
                    }}
                  />

                  {/* Icon */}
                  <foreignObject
                    x={seg.iconPt.x - iconSize / 2}
                    y={seg.iconPt.y - iconSize / 2}
                    width={iconSize}
                    height={iconSize}
                    style={{ overflow: 'visible', pointerEvents: 'none' }}
                  >
                    <div style={{
                      width: iconSize,
                      height: iconSize,
                      color: isActive ? '#ffffff' : isHovered ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'color 180ms ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <seg.icon />
                    </div>
                  </foreignObject>

                  {/* Label — rotated along radial line */}
                  <text
                    x={seg.labelPt.x}
                    y={seg.labelPt.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isActive ? '#ffffff' : isHovered ? 'var(--text-primary)' : 'var(--text-secondary)'}
                    fontSize="10.5"
                    fontWeight={isActive ? 700 : 500}
                    fontFamily="Inter, system-ui, sans-serif"
                    letterSpacing="0"
                    transform={`rotate(${seg.midDeg}, ${seg.labelPt.x}, ${seg.labelPt.y})`}
                    style={{ transition: 'fill 180ms ease', pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {seg.label}
                  </text>
                </g>
              );
            })}

            {/* Center circle */}
            <circle cx={S_CX} cy={S_CY} r={S_INNER_R - 5} fill="var(--bg-elevated)" stroke="var(--border-subtle)" strokeWidth="1" />
            <text
              x={S_CX + 6}
              y={S_CY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--text-muted)"
              fontSize="16"
              style={{ pointerEvents: 'none' }}
            >
              ⚙
            </text>
          </g>
        </svg>
      )}
    </aside>
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
  const fallbackFont = editorFontPresets[0].value;
  const selectedFont = isAllowedEditorFontFamily(settings.fontFamily) ? settings.fontFamily : fallbackFont;

  useEffect(() => {
    if (!isAllowedEditorFontFamily(settings.fontFamily)) {
      updateEditor({ fontFamily: fallbackFont });
    }
  }, [fallbackFont, settings.fontFamily, updateEditor]);

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">Font</div>
        <SettingRow label="Editor Font" description="Select the editor font family">
          <select
            className="settings-select"
            value={selectedFont}
            onChange={(e) => updateEditor({ fontFamily: e.target.value })}
          >
            {editorFontPresets.map((preset) => (
              <option key={preset.label} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
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
        <SettingRow label="Font Weight" description="Controls the font weight">
          <select
            className="settings-select"
            value={settings.fontWeight}
            onChange={(e) => updateEditor({ fontWeight: e.target.value as any })}
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi-Bold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extra-Bold (800)</option>
            <option value="900">Black (900)</option>
          </select>
        </SettingRow>
        <SettingRow label="Font Style" description="Controls the font style (normal or italic)">
          <select
            className="settings-select"
            value={settings.fontStyle}
            onChange={(e) => updateEditor({ fontStyle: e.target.value as any })}
          >
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
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
            <option value="solid">Solid (No Blinking)</option>
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
        <SettingRow label="Sticky Scroll" description="Show sticky scroll at the top">
          <ToggleSwitch value={settings.stickyScroll} onChange={(v) => updateEditor({ stickyScroll: v })} />
        </SettingRow>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const themes = useThemeStore((s) => s.themes);
  const setTheme = useThemeStore((s) => s.setTheme);
  const schemes = useEditorSchemeStore((s) => s.schemes);
  const currentScheme = useEditorSchemeStore((s) => s.currentScheme);
  const setScheme = useEditorSchemeStore((s) => s.setScheme);
  const settings = useSettingsStore((s) => s.settings.ui);
  const updateUI = useSettingsStore((s) => s.updateUI);
  const zoomLevel = useUIStore((s) => s.zoomLevel);

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

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId);
    updateUI({ theme: themeId });
  };

  const handleSchemeSelect = (schemeId: string) => {
    setScheme(schemeId);
    updateUI({ editorColorScheme: schemeId });
  };

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">App Theme</div>
        <div style={{ fontSize: '0.846rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          Choose one of the two black-mode app themes.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
          {themes.map((theme) => {
            const isActive = currentTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeSelect(theme.id)}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
                  background: theme.colors.bgBase,
                  cursor: 'pointer',
                  textAlign: 'left',
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
                  {isActive ? 'Active' : 'Click to apply'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Editor Color Scheme</div>
        <div style={{ fontSize: '0.846rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          Choose an editor color scheme.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
          {schemes.map((scheme) => {
            const schemePreview = getSchemePreviewColors(scheme);
            const isActive = currentScheme.id === scheme.id;
            return (
              <button
                key={scheme.id}
                type="button"
                className="editor-scheme-card"
                onClick={() => handleSchemeSelect(scheme.id)}
                style={{
                  border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
                  background: schemePreview.bg,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div className="editor-scheme-preview">
                  <span style={{ color: `#${schemePreview.comment}`, fontStyle: 'italic' }}>{'// code'}</span>
                  <span><span style={{ color: `#${schemePreview.keyword}` }}>int</span> <span style={{ color: `#${schemePreview.fn}` }}>main</span><span style={{ color: schemePreview.fg }}>() {'{'}</span></span>
                  <span>{'  '}<span style={{ color: `#${schemePreview.keyword}` }}>return</span> <span style={{ color: `#${schemePreview.number}` }}>0</span><span style={{ color: schemePreview.fg }}>;</span></span>
                  <span style={{ color: schemePreview.fg }}>{'}'}</span>
                </div>
                <div className="editor-scheme-info">
                  <div className="editor-scheme-name">{scheme.name}</div>
                  <div className="editor-scheme-tokens">
                    <span style={{ background: `#${schemePreview.keyword}` }} />
                    <span style={{ background: `#${schemePreview.string}` }} />
                    <span style={{ background: `#${schemePreview.fn}` }} />
                    <span style={{ background: `#${schemePreview.type}` }} />
                    <span style={{ background: `#${schemePreview.number}` }} />
                    <span style={{ background: `#${schemePreview.comment}` }} />
                  </div>
                </div>
              </button>
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
              const v = Number(e.target.value);
              useUIStore.setState({ zoomLevel: v });
              updateUI({ zoomLevel: v });
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
  const setCompilerPath = useBuildStore((s) => s.setCompilerPath);

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">Compiler</div>
        <SettingRow label="Compiler Path" description="Path to the C++ compiler">
          <input
            type="text"
            className="settings-select"
            value={settings.compilerPath}
            onChange={(e) => {
              updateBuild({ compilerPath: e.target.value });
              setCompilerPath(e.target.value);
            }}
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

function GitHubSettings() {
  const settings = useSettingsStore((s) => s.settings.github);
  const updateGitHub = useSettingsStore((s) => s.updateGitHub);
  const setGitHubTokenPool = useSettingsStore((s) => s.setGitHubTokenPool);
  const selectNextToken = useSettingsStore((s) => s.selectNextGitHubToken);
  const tokenPool = parseGitHubTokenPool(settings.tokenPool);
  const activeTokenIndex = normalizeGitHubTokenIndex(settings.activeTokenIndex, tokenPool.length);

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-title">GitHub Tokens</div>
        <SettingRow label="Token Pool" description="One GitHub token per line, stored locally in settings">
          <textarea
            className="settings-textarea github-token-pool"
            value={tokenPool.join('\n')}
            placeholder="ghp_..."
            spellCheck={false}
            onChange={(e) => setGitHubTokenPool(parseGitHubTokenPool(e.target.value))}
          />
        </SettingRow>
        <SettingRow label="Active Token" description="Token used for the next GitHub request">
          <select
            className="settings-select"
            value={String(activeTokenIndex)}
            disabled={tokenPool.length === 0}
            onChange={(e) => updateGitHub({ activeTokenIndex: Number(e.target.value) })}
          >
            {tokenPool.length === 0 ? (
              <option value="0">No tokens</option>
            ) : (
              tokenPool.map((token, index) => (
                <option key={`${token}-${index}`} value={String(index)}>
                  {formatGitHubTokenLabel(token, index)}
                </option>
              ))
            )}
          </select>
        </SettingRow>
        <SettingRow label="Rotate on Rate Limit" description="Automatically advance when a GitHub token is exhausted">
          <ToggleSwitch
            value={settings.rotateOnRateLimit}
            onChange={(rotateOnRateLimit) => updateGitHub({ rotateOnRateLimit })}
          />
        </SettingRow>
        <div className="github-token-actions">
          <button className="settings-inline-button" disabled={tokenPool.length <= 1} onClick={() => selectNextToken()}>
            Next Token
          </button>
          <span className="github-token-count">
            {tokenPool.length} token{tokenPool.length === 1 ? '' : 's'} configured
          </span>
        </div>
      </div>
    </div>
  );
}

function formatGitHubTokenLabel(token: string, index: number): string {
  return `Token ${index + 1} (${maskGitHubToken(token)})`;
}

function maskGitHubToken(token: string): string {
  if (token.length <= 10) return 'saved';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
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

type ActivityYearSelection = 'rolling' | string;

interface ActivityDay {
  date: Date;
  key: string;
  count: number;
  inRange: boolean;
  isToday: boolean;
}

interface ActivityColumn {
  startKey: string;
  days: ActivityDay[];
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseLocalDateKey(key: string): Date | null {
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonthsClamped(date: Date, amount: number): Date {
  const next = startOfLocalDay(date);
  const originalDay = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));
  return next;
}

function addYearsClamped(date: Date, amount: number): Date {
  const next = startOfLocalDay(date);
  const originalMonth = next.getMonth();
  next.setFullYear(next.getFullYear() + amount);
  if (next.getMonth() !== originalMonth) next.setDate(0);
  return next;
}

function startOfActivityWeek(date: Date): Date {
  const start = startOfLocalDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function formatActivityDate(date: Date): string {
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatHeatmapTooltipDate(date: Date): string {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('/');
}

function pluralProblems(count: number): string {
  return `${count} problem${count === 1 ? '' : 's'}`;
}

function pluralDays(count: number): string {
  return `${count} day${count === 1 ? '' : 's'}`;
}

function getSolveCount(records: Record<string, { count: number }>, date: Date): number {
  return records[localDateKey(date)]?.count ?? 0;
}

function getFirstSolveDate(records: Record<string, { count: number }>, fallback: Date): Date {
  const dates = Object.entries(records)
    .filter(([, record]) => record.count > 0)
    .map(([date]) => parseLocalDateKey(date))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  return dates[0] ? startOfLocalDay(dates[0]) : fallback;
}

function getActivityYears(records: Record<string, { count: number }>, today: Date): number[] {
  const currentYear = today.getFullYear();
  const years = new Set<number>();

  for (let year = currentYear; year >= 2026; year--) {
    years.add(year);
  }

  Object.entries(records).forEach(([key, record]) => {
    if (record.count <= 0) return;
    const date = parseLocalDateKey(key);
    if (date) years.add(date.getFullYear());
  });

  return Array.from(years).sort((a, b) => b - a);
}

function getRangeTotal(records: Record<string, { count: number }>, start: Date, end: Date): number {
  return Object.entries(records).reduce((total, [key, record]) => {
    const date = parseLocalDateKey(key);
    if (!date) return total;
    return date >= start && date <= end ? total + record.count : total;
  }, 0);
}

function getMaxStreak(records: Record<string, { count: number }>, start: Date, end: Date): number {
  let current = 0;
  let best = 0;

  for (let day = startOfLocalDay(start); day <= end; day = addDays(day, 1)) {
    if (getSolveCount(records, day) > 0) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

function getActivityLevel(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function SolveStats() {
  const records = useSolveCounterStore((s) => s.records);
  const todayCount = useSolveCounterStore((s) => s.todayCount);
  const [activityYear, setActivityYear] = useState<ActivityYearSelection>('rolling');
  const [heatmapTooltip, setHeatmapTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const todayKey = localDateKey(today);
  const todaySolves = records[todayKey]?.count ?? todayCount;

  const stats = useMemo(() => {
    const firstSolveDate = getFirstSolveDate(records, today);
    const lastYearStart = addYearsClamped(today, -1);
    const lastMonthStart = addMonthsClamped(today, -1);
    const selectedYear = activityYear === 'rolling' ? null : Number(activityYear);
    const heatmapStart = selectedYear ? new Date(selectedYear, 0, 1) : lastYearStart;
    const heatmapEnd = selectedYear ? new Date(selectedYear, 11, 31) : today;
    const heatmapGridStart = startOfActivityWeek(heatmapStart);

    const columns: ActivityColumn[] = [];
    for (let columnStart = heatmapGridStart; columnStart <= heatmapEnd; columnStart = addDays(columnStart, 7)) {
      const days: ActivityDay[] = [];
      for (let row = 0; row < 7; row++) {
        const date = addDays(columnStart, row);
        const key = localDateKey(date);
        days.push({
          date,
          key,
          count: records[key]?.count ?? 0,
          inRange: date >= heatmapStart && date <= heatmapEnd,
          isToday: key === todayKey,
        });
      }
      columns.push({ startKey: localDateKey(columnStart), days });
    }

    let previousMonth = -1;
    const monthLabels = columns.map((column, index) => {
      const monthStartDay = column.days.find((day) => day.inRange && day.date.getDate() <= 7);
      if (!monthStartDay) return null;
      const month = monthStartDay.date.getMonth();
      if (month === previousMonth) return null;
      previousMonth = month;
      return {
        column: index,
        label: monthStartDay.date.toLocaleDateString('en', { month: 'short' }),
      };
    }).filter((label): label is { column: number; label: string } => Boolean(label));

    return {
      columns,
      activityYears: getActivityYears(records, today),
      firstSolveDate,
      heatmapEnd,
      heatmapStart,
      lastYearStart,
      lastMonthStart,
      monthLabels,
      totalAll: Object.values(records).reduce((sum, record) => sum + record.count, 0),
      totalLastYear: getRangeTotal(records, lastYearStart, today),
      totalLastMonth: getRangeTotal(records, lastMonthStart, today),
      maxStreakAll: getMaxStreak(records, firstSolveDate, today),
      maxStreakLastYear: getMaxStreak(records, lastYearStart, today),
      maxStreakLastMonth: getMaxStreak(records, lastMonthStart, today),
    };
  }, [activityYear, records, today, todayKey]);

  const trend = useMemo(() => {
    const data = Array.from({ length: 10 }, (_, index) => {
      const date = addDays(today, index - 9);
      return {
        key: localDateKey(date),
        label: index === 9 ? 'Today' : date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        shortLabel: index === 9 ? 'Today' : date.toLocaleDateString('en', { day: 'numeric' }),
        count: getSolveCount(records, date),
      };
    });

    const lastWeekCounts = Array.from({ length: 7 }, (_, index) => getSolveCount(records, addDays(today, -7 + index)));
    const lastWeekAverage = lastWeekCounts.reduce((sum, count) => sum + count, 0) / lastWeekCounts.length;
    const baseline = Math.ceil(lastWeekAverage);
    const delta = todaySolves - baseline;
    const width = 640;
    const height = 230;
    const pad = { top: 22, right: 28, bottom: 42, left: 38 };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const maxValue = Math.max(1, baseline, ...data.map((item) => item.count));
    const points = data.map((item, index) => {
      const x = pad.left + (innerWidth / Math.max(1, data.length - 1)) * index;
      const y = pad.top + innerHeight - (item.count / maxValue) * innerHeight;
      return { ...item, x, y };
    });
    const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
    const areaPoints = [
      `${points[0]?.x ?? pad.left},${pad.top + innerHeight}`,
      linePoints,
      `${points[points.length - 1]?.x ?? pad.left + innerWidth},${pad.top + innerHeight}`,
    ].join(' ');
    const baselineY = pad.top + innerHeight - (baseline / maxValue) * innerHeight;

    return {
      data,
      points,
      linePoints,
      areaPoints,
      baseline,
      delta,
      deltaTone: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      baselineY,
      width,
      height,
      pad,
      innerHeight,
      maxValue,
    };
  }, [records, today, todaySolves]);

  const moveHeatmapTooltip = useCallback((event: React.MouseEvent, text: string) => {
    setHeatmapTooltip({
      text,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  return (
    <div className="settings-section solve-stats">
      <div className="stats-page-heading">
        <div>
          <div className="settings-section-title">Solve Statistics</div>
          <div className="stats-page-subtitle">Daily solve activity and short-term frequency.</div>
        </div>
        <div className="stats-today-pill">
          <span>{todaySolves}</span>
          <small>today</small>
        </div>
      </div>

      <div className="cf-activity-card">
        <div className="cf-activity-toolbar">
          <select
            className="cf-activity-select"
            aria-label="Activity year"
            value={activityYear}
            onChange={(event) => setActivityYear(event.target.value)}
          >
            <option value="rolling">Choose year</option>
            {stats.activityYears.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="cf-heatmap-shell">
          <div className="cf-month-labels" style={{ gridTemplateColumns: `repeat(${stats.columns.length}, 12px)` }}>
            {stats.monthLabels.map((label) => (
              <span
                key={`${label.label}-${label.column}`}
                className="cf-month-label"
                style={{ gridColumnStart: label.column + 1 }}
              >
                {label.label}
              </span>
            ))}
          </div>

          <div className="cf-heatmap-body">
            <div className="cf-weekday-labels" aria-hidden="true">
              <span />
              <span>Mon</span>
              <span />
              <span>Wed</span>
              <span />
              <span>Fri</span>
              <span />
            </div>

            <div className="cf-heatmap-grid" style={{ gridTemplateColumns: `repeat(${stats.columns.length}, 12px)` }}>
              {stats.columns.map((column) => (
                <div className="cf-heatmap-week" key={column.startKey}>
                  {column.days.map((day) => {
                    const level = day.inRange ? getActivityLevel(day.count) : 0;
                    const tooltipText = `${formatHeatmapTooltipDate(day.date)} : ${day.count} solved`;
                    const canShowTooltip = day.inRange && day.count > 0;
                    return (
                      <span
                        key={day.key}
                        className={`cf-heatmap-cell ${day.inRange ? '' : 'outside'} ${day.isToday ? 'today' : ''}`}
                        data-level={level}
                        aria-label={tooltipText}
                        onMouseEnter={(event) => {
                          if (canShowTooltip) moveHeatmapTooltip(event, tooltipText);
                        }}
                        onMouseMove={(event) => {
                          if (canShowTooltip) moveHeatmapTooltip(event, tooltipText);
                        }}
                        onMouseLeave={() => setHeatmapTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="cf-stats-grid">
          <div className="cf-stat-block">
            <strong>{pluralProblems(stats.totalAll)}</strong>
            <span>solved for all time</span>
          </div>
          <div className="cf-stat-block">
            <strong>{pluralProblems(stats.totalLastYear)}</strong>
            <span>solved for the last year</span>
          </div>
          <div className="cf-stat-block">
            <strong>{pluralProblems(stats.totalLastMonth)}</strong>
            <span>solved for the last month</span>
          </div>
          <div className="cf-stat-block">
            <strong>{pluralDays(stats.maxStreakAll)}</strong>
            <span>in a row max.</span>
          </div>
          <div className="cf-stat-block">
            <strong>{pluralDays(stats.maxStreakLastYear)}</strong>
            <span>in a row for the last year</span>
          </div>
          <div className="cf-stat-block">
            <strong>{pluralDays(stats.maxStreakLastMonth)}</strong>
            <span>in a row for the last month</span>
          </div>
        </div>
      </div>

      <div className="frequency-card">
        <div className="frequency-header">
          <div>
            <div className="frequency-title">Last 10 Days Frequency</div>
            <div className="frequency-subtitle">Today's solve count vs ceil(last week's average)</div>
          </div>
          <div className={`frequency-delta ${trend.deltaTone}`}>
            <span>{trend.delta > 0 ? '▲' : trend.delta < 0 ? '▼' : '•'}</span>
            <strong>{trend.delta > 0 ? `+${trend.delta}` : trend.delta}</strong>
            <small>vs {trend.baseline}</small>
          </div>
        </div>

        <div className="frequency-chart-wrap">
          <svg className="frequency-chart" viewBox={`0 0 ${trend.width} ${trend.height}`} role="img" aria-label="Last 10 days solve frequency line chart">
            {[0, 0.5, 1].map((ratio) => {
              const y = trend.pad.top + trend.innerHeight * ratio;
              return <line key={ratio} x1={trend.pad.left} y1={y} x2={trend.width - trend.pad.right} y2={y} className="frequency-grid-line" />;
            })}
            <line
              x1={trend.pad.left}
              y1={trend.baselineY}
              x2={trend.width - trend.pad.right}
              y2={trend.baselineY}
              className="frequency-baseline"
            />
            <text x={trend.width - trend.pad.right} y={Math.max(14, trend.baselineY - 6)} className="frequency-baseline-label" textAnchor="end">
              ceil avg {trend.baseline}
            </text>
            <polygon points={trend.areaPoints} className="frequency-area" />
            <polyline points={trend.linePoints} className="frequency-line" />
            {trend.points.map((point) => (
              <g key={point.key}>
                <circle className={`frequency-point ${point.key === todayKey ? 'today' : ''}`} cx={point.x} cy={point.y} r={point.key === todayKey ? 5 : 3.5} />
                <text x={point.x} y={trend.height - 16} className="frequency-x-label" textAnchor="middle">
                  {point.shortLabel}
                </text>
                <text x={point.x} y={Math.max(12, point.y - 9)} className="frequency-value-label" textAnchor="middle">
                  {point.count}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {heatmapTooltip && (
        <div
          className="cf-heatmap-tooltip"
          style={{
            left: heatmapTooltip.x,
            top: heatmapTooltip.y,
          }}
        >
          {heatmapTooltip.text}
        </div>
      )}
    </div>
  );
}

