import { useState, useCallback, useEffect, useMemo } from 'react';
import { useThemeStore } from '../stores';
import { useNotificationStore } from '../stores/notificationStore';
import {
  getDefaultCustomThemeJSON,
  loadCustomThemeJSONs,
  parseColorToHex,
  type CustomThemeJSON,
} from '../services/customThemeService';
import {
  VscAdd,
  VscTrash,
  VscClose,
  VscCheck,
  VscEdit,
  VscCopy,
  VscExport,
  VscCloudDownload,
} from 'react-icons/vsc';

type Mode = 'list' | 'edit';

export default function ThemeEditor({ onClose }: { onClose: () => void }) {
  const themes = useThemeStore((s) => s.themes);
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const customThemes = useThemeStore((s) => s.customThemes);
  const setTheme = useThemeStore((s) => s.setTheme);
  const addCustomTheme = useThemeStore((s) => s.addCustomTheme);
  const updateCustomTheme = useThemeStore((s) => s.updateCustomTheme);
  const removeCustomTheme = useThemeStore((s) => s.removeCustomTheme);
  const success = useNotificationStore((s) => s.success);
  const error = useNotificationStore((s) => s.error);

  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [customJsonMap, setCustomJsonMap] = useState<Record<string, CustomThemeJSON>>({});

  // Load raw JSONs for editing
  useEffect(() => {
    loadCustomThemeJSONs().then((items) => {
      const map: Record<string, CustomThemeJSON> = {};
      for (const { id, json } of items) {
        map[id] = json;
      }
      setCustomJsonMap(map);
    });
  }, [customThemes.length]);

  // Parse the current JSON text for live preview
  const parsedPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText) as CustomThemeJSON;
      if (!parsed.variables || !parsed.globals) return null;
      // Resolve variable colors for preview
      const colors: { name: string; raw: string; hex: string }[] = [];
      for (const [name, value] of Object.entries(parsed.variables)) {
        try {
          colors.push({ name, raw: value, hex: parseColorToHex(value) });
        } catch {
          colors.push({ name, raw: value, hex: '#000000' });
        }
      }
      return { name: parsed.name || 'Untitled', author: parsed.author || '', colors, ruleCount: (parsed.rules || []).length };
    } catch {
      return null;
    }
  }, [jsonText]);

  const openNewTheme = useCallback(() => {
    setMode('edit');
    setEditingId(null);
    const defaultJSON = getDefaultCustomThemeJSON();
    setJsonText(JSON.stringify(defaultJSON, null, 2));
    setJsonError('');
  }, []);

  const openEditTheme = useCallback((id: string) => {
    const json = customJsonMap[id];
    if (json) {
      setMode('edit');
      setEditingId(id);
      setJsonText(JSON.stringify(json, null, 2));
      setJsonError('');
    }
  }, [customJsonMap]);

  const handleSave = useCallback(async () => {
    try {
      const parsed = JSON.parse(jsonText) as CustomThemeJSON;
      if (!parsed.name || !parsed.variables || !parsed.globals || !parsed.rules) {
        setJsonError('JSON must have name, variables, globals, and rules');
        return;
      }

      if (editingId) {
        await updateCustomTheme(editingId, parsed);
        success(`Theme "${parsed.name}" updated`);
      } else {
        const newId = await addCustomTheme(parsed);
        setTheme(newId);
        success(`Theme "${parsed.name}" created and applied`);
      }
      setMode('list');
      setEditingId(null);
    } catch (e) {
      setJsonError(`Invalid JSON: ${String(e)}`);
    }
  }, [jsonText, editingId, addCustomTheme, updateCustomTheme, setTheme, success]);

  const handleDelete = useCallback(async (id: string) => {
    await removeCustomTheme(id);
    success('Custom theme removed');
  }, [removeCustomTheme, success]);

  const handleDuplicate = useCallback(async (themeId: string) => {
    const customJson = customJsonMap[themeId];
    if (customJson) {
      const dup = { ...customJson, name: customJson.name + ' (Copy)' };
      await addCustomTheme(dup);
      success(`Duplicated as "${dup.name}"`);
    } else {
      const defaultJSON = getDefaultCustomThemeJSON();
      const theme = themes.find((t) => t.id === themeId);
      if (theme) {
        defaultJSON.name = theme.name + ' (Custom)';
      }
      await addCustomTheme(defaultJSON);
      success('Created custom theme from template');
    }
  }, [customJsonMap, themes, addCustomTheme, success]);

  const handleExport = useCallback((id: string) => {
    const json = customJsonMap[id];
    if (json) {
      navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      success('Theme JSON copied to clipboard');
    }
  }, [customJsonMap, success]);

  const handleImportFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text) as CustomThemeJSON;
      if (!parsed.name || !parsed.variables || !parsed.globals || !parsed.rules) {
        error('Invalid theme: must have name, variables, globals, and rules');
        return;
      }
      const newId = await addCustomTheme(parsed);
      setTheme(newId);
      success(`Imported and applied "${parsed.name}"`);
    } catch (e) {
      error(`Failed to import: ${String(e)}`);
    }
  }, [addCustomTheme, setTheme, success, error]);

  if (mode === 'edit') {
    return (
      <div className="theme-editor-panel">
        <div className="build-config-header">
          <span className="build-config-title">
            {editingId ? 'Edit Theme' : 'New Custom Theme'}
          </span>
          <button className="icon-btn" onClick={() => setMode('list')} title="Cancel">
            <VscClose />
          </button>
        </div>
        <div className="theme-editor-content">
          <div className="theme-editor-hint">
            Define colors in <code>variables</code> using hex, <code>hsl()</code>, or <code>rgb()</code>. Reference them in <code>globals</code> and <code>rules</code> with <code>var(name)</code>.
          </div>

          {/* Live color palette preview */}
          {parsedPreview && (
            <div className="theme-color-preview">
              <div className="theme-color-preview-header">
                <span className="theme-color-preview-name">{parsedPreview.name}</span>
                {parsedPreview.author && (
                  <span className="theme-color-preview-author">by {parsedPreview.author}</span>
                )}
                <span className="theme-color-preview-stats">
                  {parsedPreview.colors.length} colors &middot; {parsedPreview.ruleCount} rules
                </span>
              </div>
              <div className="theme-color-swatches">
                {parsedPreview.colors.map((c) => (
                  <div
                    key={c.name}
                    className="theme-color-swatch-item"
                    title={`${c.name}: ${c.raw}\n→ ${c.hex}`}
                  >
                    <div
                      className="theme-color-swatch-dot"
                      style={{ background: c.hex }}
                    />
                    <span className="theme-color-swatch-label">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <textarea
            className="theme-editor-textarea"
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setJsonError(''); }}
            spellCheck={false}
          />
          {jsonError && <div className="snippet-form-error">{jsonError}</div>}
          <div className="snippet-form-actions">
            <button className="snippet-btn secondary" onClick={() => setMode('list')}>
              Cancel
            </button>
            <button className="snippet-btn primary" onClick={handleSave}>
              <VscCheck /> {editingId ? 'Save & Apply' : 'Create Theme'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCustom = (id: string) => customThemes.some((t) => t.id === id);

  return (
    <div className="theme-editor-panel">
      <div className="build-config-header">
        <span className="build-config-title">Theme Manager</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn-sm" onClick={handleImportFromClipboard} title="Import theme from clipboard">
            <VscCloudDownload />
          </button>
          <button className="icon-btn-sm" onClick={openNewTheme} title="Create new custom theme">
            <VscAdd />
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
            <VscClose />
          </button>
        </div>
      </div>

      <div className="theme-editor-list">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className={`theme-editor-item ${theme.id === currentTheme.id ? 'active' : ''}`}
            onClick={() => setTheme(theme.id)}
          >
            <div className="theme-editor-preview">
              <div
                className="theme-preview-swatch-big"
                style={{ background: theme.colors.bgBase }}
              >
                <div className="theme-preview-colors-row">
                  <div style={{ background: theme.colors.accentPrimary }} />
                  <div style={{ background: theme.colors.accentBlue }} />
                  <div style={{ background: theme.colors.accentGreen }} />
                  <div style={{ background: theme.colors.accentRed }} />
                  <div style={{ background: theme.colors.accentYellow }} />
                  <div style={{ background: theme.colors.accentPurple }} />
                </div>
              </div>
            </div>
            <div className="build-profile-info">
              <span className="build-profile-name">
                {theme.name}
                {isCustom(theme.id) && <span className="theme-custom-badge">custom</span>}
              </span>
              <span className="build-profile-flags">{theme.type}</span>
            </div>
            <div className="snippet-item-actions" style={{ opacity: 1 }}>
              <button
                className="icon-btn-sm"
                onClick={(e) => { e.stopPropagation(); handleDuplicate(theme.id); }}
                title="Duplicate as custom theme"
              >
                <VscCopy />
              </button>
              {isCustom(theme.id) && (
                <>
                  <button
                    className="icon-btn-sm"
                    onClick={(e) => { e.stopPropagation(); handleExport(theme.id); }}
                    title="Export theme JSON to clipboard"
                  >
                    <VscExport />
                  </button>
                  <button
                    className="icon-btn-sm"
                    onClick={(e) => { e.stopPropagation(); openEditTheme(theme.id); }}
                    title="Edit theme JSON"
                  >
                    <VscEdit />
                  </button>
                  <button
                    className="icon-btn-sm danger"
                    onClick={(e) => { e.stopPropagation(); handleDelete(theme.id); }}
                    title="Delete custom theme"
                  >
                    <VscTrash />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
