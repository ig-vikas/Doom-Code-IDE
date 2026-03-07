import { useState, useCallback, useMemo } from 'react';
import { useEditorSchemeStore } from '../stores';
import { useNotificationStore } from '../stores/notificationStore';
import type { EditorColorScheme } from '../types/editorScheme';
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

const DEFAULT_SCHEME_JSON: EditorColorScheme = {
  id: '',
  name: 'My Custom Scheme',
  type: 'dark',
  monacoTheme: {
    base: 'vs-dark',
    inherit: false,
    rules: [
      { token: '', foreground: 'D4D4D4', background: '1E1E1E' },
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'keyword.control', foreground: 'C586C0' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'entity.name.function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'constant', foreground: '4FC1FF' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editor.lineHighlightBackground': '#2A2D2E',
      'editor.selectionBackground': '#264F78',
      'editorCursor.foreground': '#AEAFAD',
      'editorLineNumber.foreground': '#858585',
    },
  },
};

export default function SchemeEditor({ onClose }: { onClose: () => void }) {
  const schemes = useEditorSchemeStore((s) => s.schemes);
  const currentScheme = useEditorSchemeStore((s) => s.currentScheme);
  const customSchemes = useEditorSchemeStore((s) => s.customSchemes);
  const setScheme = useEditorSchemeStore((s) => s.setScheme);
  const addCustomScheme = useEditorSchemeStore((s) => s.addCustomScheme);
  const updateCustomScheme = useEditorSchemeStore((s) => s.updateCustomScheme);
  const removeCustomScheme = useEditorSchemeStore((s) => s.removeCustomScheme);
  const duplicateScheme = useEditorSchemeStore((s) => s.duplicateScheme);
  const success = useNotificationStore((s) => s.success);
  const error = useNotificationStore((s) => s.error);

  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  const isCustom = (id: string) => customSchemes.some((s) => s.id === id);

  // Parse JSON for live preview
  const parsedPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText);
      const theme = parsed.monacoTheme;
      if (!theme || !theme.rules) return null;
      const rules = theme.rules as { token: string; foreground?: string }[];
      const find = (t: string) => rules.find((r) => r.token === t)?.foreground;
      return {
        name: parsed.name || 'Untitled',
        type: parsed.type || 'dark',
        ruleCount: rules.length,
        colorCount: Object.keys(theme.colors || {}).length,
        bg: theme.colors?.['editor.background'] || '#1E1E1E',
        fg: theme.colors?.['editor.foreground'] || '#D4D4D4',
        keyword: find('keyword'),
        string: find('string'),
        comment: find('comment'),
        fn: find('entity.name.function') || find('support.function'),
        typeColor: find('type') || find('type.identifier'),
        number: find('number'),
      };
    } catch {
      return null;
    }
  }, [jsonText]);

  const openNew = useCallback(() => {
    setMode('edit');
    setEditingId(null);
    const { id: _, ...rest } = DEFAULT_SCHEME_JSON;
    void _;
    setJsonText(JSON.stringify(rest, null, 2));
    setJsonError('');
  }, []);

  const openEdit = useCallback((scheme: EditorColorScheme) => {
    setMode('edit');
    setEditingId(scheme.id);
    const { id: _, ...rest } = scheme;
    void _;
    setJsonText(JSON.stringify(rest, null, 2));
    setJsonError('');
  }, []);

  const handleSave = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.name) { setJsonError('Must have a "name" field'); return; }
      if (!parsed.monacoTheme?.rules) { setJsonError('Must have "monacoTheme.rules"'); return; }
      if (!parsed.monacoTheme?.colors) { setJsonError('Must have "monacoTheme.colors"'); return; }
      if (!parsed.monacoTheme?.base) { setJsonError('Must have "monacoTheme.base" (vs-dark, vs, or hc-black)'); return; }

      if (editingId) {
        const scheme: EditorColorScheme = { ...parsed, id: editingId };
        updateCustomScheme(scheme);
        setScheme(editingId);
        success(`Scheme "${parsed.name}" updated`);
      } else {
        const newId = `custom-scheme-${Date.now()}`;
        const scheme: EditorColorScheme = { ...parsed, id: newId };
        addCustomScheme(scheme);
        setScheme(newId);
        success(`Scheme "${parsed.name}" created and applied`);
      }
      setMode('list');
      setEditingId(null);
    } catch (e) {
      setJsonError(`Invalid JSON: ${String(e)}`);
    }
  }, [jsonText, editingId, addCustomScheme, updateCustomScheme, setScheme, success]);

  const handleDelete = useCallback((id: string) => {
    removeCustomScheme(id);
    success('Custom scheme removed');
  }, [removeCustomScheme, success]);

  const handleDuplicate = useCallback((id: string) => {
    const newId = duplicateScheme(id);
    if (newId) {
      success('Scheme duplicated');
    }
  }, [duplicateScheme, success]);

  const handleExport = useCallback((id: string) => {
    const scheme = schemes.find((s) => s.id === id);
    if (scheme) {
      const { id: _, ...rest } = scheme;
      void _;
      navigator.clipboard.writeText(JSON.stringify(rest, null, 2));
      success('Scheme JSON copied to clipboard');
    }
  }, [schemes, success]);

  const handleImport = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (!parsed.name || !parsed.monacoTheme?.rules) {
        error('Invalid scheme: must have name and monacoTheme.rules');
        return;
      }
      const newId = `custom-scheme-${Date.now()}`;
      const scheme: EditorColorScheme = { ...parsed, id: newId };
      addCustomScheme(scheme);
      setScheme(newId);
      success(`Imported and applied "${parsed.name}"`);
    } catch (e) {
      error(`Failed to import: ${String(e)}`);
    }
  }, [addCustomScheme, setScheme, success, error]);

  const getPreviewColors = (scheme: EditorColorScheme) => {
    const rules = scheme.monacoTheme.rules;
    const find = (t: string) => rules.find((r) => r.token === t)?.foreground;
    return {
      bg: scheme.monacoTheme.colors['editor.background'] || '#1E1E1E',
      fg: scheme.monacoTheme.colors['editor.foreground'] || '#D4D4D4',
      keyword: find('keyword') || 'CCCCCC',
      string: find('string') || 'CCCCCC',
      comment: find('comment') || 'CCCCCC',
      fn: find('entity.name.function') || find('support.function') || 'CCCCCC',
      typeColor: find('type') || find('type.identifier') || 'CCCCCC',
      number: find('number') || 'CCCCCC',
    };
  };

  // ── Edit mode ──
  if (mode === 'edit') {
    return (
      <div className="theme-editor-panel">
        <div className="build-config-header">
          <span className="build-config-title">
            {editingId ? 'Edit Color Scheme' : 'New Color Scheme'}
          </span>
          <button className="icon-btn" onClick={() => setMode('list')} title="Cancel">
            <VscClose />
          </button>
        </div>
        <div className="theme-editor-content">
          <div className="theme-editor-hint">
            Define <code>monacoTheme.rules</code> for syntax tokens and <code>monacoTheme.colors</code> for editor UI colors.
            Token foregrounds use 6-digit hex <em>without</em> the <code>#</code> prefix. Editor colors use <code>#RRGGBB</code> or <code>#RRGGBBAA</code>.
          </div>

          {/* Live preview */}
          {parsedPreview && (
            <div className="scheme-editor-preview-panel" style={{ background: parsedPreview.bg, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 10, marginBottom: 8 }}>
              <div style={{ fontFamily: 'Consolas, monospace', fontSize: '0.846rem', lineHeight: 1.6 }}>
                <div><span style={{ color: `#${parsedPreview.comment || '888'}`, fontStyle: 'italic' }}>{'// '}{parsedPreview.name} — {parsedPreview.ruleCount} rules, {parsedPreview.colorCount} colors</span></div>
                <div>
                  <span style={{ color: `#${parsedPreview.keyword || 'CCC'}` }}>int</span>{' '}
                  <span style={{ color: `#${parsedPreview.fn || 'CCC'}` }}>solve</span>
                  <span style={{ color: parsedPreview.fg }}>(</span>
                  <span style={{ color: `#${parsedPreview.typeColor || 'CCC'}` }}>vector</span>
                  <span style={{ color: parsedPreview.fg }}>&lt;</span>
                  <span style={{ color: `#${parsedPreview.typeColor || 'CCC'}` }}>int</span>
                  <span style={{ color: parsedPreview.fg }}>&gt;&amp; v) {'{'}</span>
                </div>
                <div>
                  {'  '}<span style={{ color: `#${parsedPreview.keyword || 'CCC'}` }}>return</span>{' '}
                  <span style={{ color: `#${parsedPreview.number || 'CCC'}` }}>42</span>
                  <span style={{ color: parsedPreview.fg }}>;</span>{' '}
                  <span style={{ color: `#${parsedPreview.comment || '888'}`, fontStyle: 'italic' }}>{'// answer'}</span>
                </div>
                <div><span style={{ color: parsedPreview.fg }}>{'}'}</span></div>
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
              <VscCheck /> {editingId ? 'Save & Apply' : 'Create Scheme'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List mode ──
  return (
    <div className="theme-editor-panel">
      <div className="build-config-header">
        <span className="build-config-title">Scheme Manager</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="icon-btn-sm" onClick={handleImport} title="Import scheme from clipboard">
            <VscCloudDownload />
          </button>
          <button className="icon-btn-sm" onClick={openNew} title="Create new custom scheme">
            <VscAdd />
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
            <VscClose />
          </button>
        </div>
      </div>

      <div className="theme-editor-list">
        {schemes.map((scheme) => {
          const preview = getPreviewColors(scheme);
          return (
            <div
              key={scheme.id}
              className={`theme-editor-item ${scheme.id === currentScheme.id ? 'active' : ''}`}
              onClick={() => setScheme(scheme.id)}
            >
              <div className="theme-editor-preview">
                <div
                  className="theme-preview-swatch-big"
                  style={{ background: preview.bg }}
                >
                  <div className="theme-preview-colors-row">
                    <div style={{ background: `#${preview.keyword}` }} />
                    <div style={{ background: `#${preview.string}` }} />
                    <div style={{ background: `#${preview.fn}` }} />
                    <div style={{ background: `#${preview.typeColor}` }} />
                    <div style={{ background: `#${preview.number}` }} />
                    <div style={{ background: `#${preview.comment}` }} />
                  </div>
                </div>
              </div>
              <div className="build-profile-info">
                <span className="build-profile-name">
                  {scheme.name}
                  {isCustom(scheme.id) && <span className="theme-custom-badge">custom</span>}
                </span>
                <span className="build-profile-flags">
                  {scheme.monacoTheme.rules.length} rules &middot; {scheme.type}
                </span>
              </div>
              <div className="snippet-item-actions" style={{ opacity: 1 }}>
                <button
                  className="icon-btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(scheme.id); }}
                  title="Duplicate as custom scheme"
                >
                  <VscCopy />
                </button>
                {isCustom(scheme.id) && (
                  <>
                    <button
                      className="icon-btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleExport(scheme.id); }}
                      title="Export scheme JSON to clipboard"
                    >
                      <VscExport />
                    </button>
                    <button
                      className="icon-btn-sm"
                      onClick={(e) => { e.stopPropagation(); openEdit(scheme); }}
                      title="Edit scheme JSON"
                    >
                      <VscEdit />
                    </button>
                    <button
                      className="icon-btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleDelete(scheme.id); }}
                      title="Delete custom scheme"
                    >
                      <VscTrash />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
