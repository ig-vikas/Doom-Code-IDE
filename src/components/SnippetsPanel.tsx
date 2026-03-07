import { useState, useMemo, useCallback } from 'react';
import { defaultSnippets } from '../config/defaultSnippets';
import { useEditorStore } from '../stores';
import { useSnippetStore } from '../stores/snippetStore';
import type { Snippet } from '../types';
import {
  VscSymbolSnippet,
  VscAdd,
  VscEdit,
  VscTrash,
  VscClose,
  VscCheck,
  VscChevronDown,
  VscChevronRight,
} from 'react-icons/vsc';

type EditorMode = null | 'add' | 'edit';

export default function SnippetsPanel() {
  const [filter, setFilter] = useState('');
  const insertSnippet = useEditorStore((s) => s.insertSnippet);
  const { userSnippets, getAllSnippets, addSnippet, updateSnippet, deleteSnippet, isUserSnippet } =
    useSnippetStore();

  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingPrefix, setEditingPrefix] = useState<string | null>(null);
  const [formPrefix, setFormPrefix] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formError, setFormError] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const allSnippets = getAllSnippets();

  const grouped = useMemo(() => {
    const filtered = filter
      ? allSnippets.filter(
          (s) =>
            (s.name ?? s.prefix).toLowerCase().includes(filter.toLowerCase()) ||
            s.prefix.toLowerCase().includes(filter.toLowerCase()) ||
            (s.category ?? '').toLowerCase().includes(filter.toLowerCase()) ||
            s.description.toLowerCase().includes(filter.toLowerCase())
        )
      : allSnippets;

    const groups = new Map<string, Snippet[]>();
    for (const s of filtered) {
      const cat = s.category ?? 'General';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(s);
    }
    return groups;
  }, [filter, allSnippets]);

  const handleInsert = useCallback(
    (snippet: Snippet) => {
      if (insertSnippet) {
        insertSnippet(snippet.body);
      }
    },
    [insertSnippet]
  );

  const openAddForm = useCallback(() => {
    setEditorMode('add');
    setEditingPrefix(null);
    setFormPrefix('');
    setFormBody('');
    setFormDescription('');
    setFormCategory('User');
    setFormError('');
  }, []);

  const openEditForm = useCallback(
    (snippet: Snippet) => {
      setEditorMode('edit');
      setEditingPrefix(snippet.prefix);
      setFormPrefix(snippet.prefix);
      setFormBody(snippet.body);
      setFormDescription(snippet.description);
      setFormCategory(snippet.category ?? 'User');
      setFormError('');
    },
    []
  );

  const closeForm = useCallback(() => {
    setEditorMode(null);
    setEditingPrefix(null);
    setFormError('');
  }, []);

  const handleSave = useCallback(() => {
    const prefix = formPrefix.trim();
    if (!prefix) {
      setFormError('Prefix is required');
      return;
    }
    if (!formBody.trim()) {
      setFormError('Body is required');
      return;
    }

    const snippet: Snippet = {
      prefix,
      body: formBody,
      description: formDescription.trim() || prefix,
      category: formCategory.trim() || 'User',
    };

    if (editorMode === 'add') {
      if (userSnippets.some((s) => s.prefix === prefix)) {
        setFormError(`Snippet with prefix "${prefix}" already exists`);
        return;
      }
      addSnippet(snippet);
    } else if (editorMode === 'edit' && editingPrefix) {
      if (prefix !== editingPrefix && userSnippets.some((s) => s.prefix === prefix)) {
        setFormError(`Snippet with prefix "${prefix}" already exists`);
        return;
      }
      updateSnippet(editingPrefix, snippet);
    }

    closeForm();
  }, [formPrefix, formBody, formDescription, formCategory, editorMode, editingPrefix, userSnippets, addSnippet, updateSnippet, closeForm]);

  const handleDelete = useCallback(
    (prefix: string) => {
      deleteSnippet(prefix);
    },
    [deleteSnippet]
  );

  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // Snippet editor form
  if (editorMode) {
    return (
      <div className="snippets-panel">
        <div className="snippet-editor-header">
          <span className="snippet-editor-title">
            {editorMode === 'add' ? 'New Snippet' : 'Edit Snippet'}
          </span>
          <button className="icon-btn" onClick={closeForm} title="Cancel">
            <VscClose />
          </button>
        </div>
        <div className="snippet-editor-form">
          <div className="snippet-form-field">
            <label>Prefix (trigger)</label>
            <input
              type="text"
              value={formPrefix}
              onChange={(e) => setFormPrefix(e.target.value)}
              placeholder="e.g. mysnippet"
              autoFocus
            />
          </div>
          <div className="snippet-form-field">
            <label>Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <div className="snippet-form-field">
            <label>Category</label>
            <input
              type="text"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="e.g. User, Data Structures"
            />
          </div>
          <div className="snippet-form-field">
            <label>Body</label>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              placeholder={"Use $1, $2 for tab stops\n${1:placeholder} for defaults\n${1:TIMESTAMP} for auto timestamp"}
              rows={12}
              spellCheck={false}
            />
          </div>
          {formError && <div className="snippet-form-error">{formError}</div>}
          <div className="snippet-form-actions">
            <button className="snippet-btn secondary" onClick={closeForm}>
              Cancel
            </button>
            <button className="snippet-btn primary" onClick={handleSave}>
              <VscCheck /> {editorMode === 'add' ? 'Add Snippet' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="snippets-panel">
      <div className="snippet-toolbar">
        <input
          type="text"
          placeholder="Filter snippets..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="snippet-filter-input"
        />
        <button className="icon-btn" onClick={openAddForm} title="Add new snippet">
          <VscAdd />
        </button>
      </div>
      {Array.from(grouped.entries()).map(([category, snippets]) => {
        const isCollapsed = collapsedCategories.has(category);
        return (
          <div key={category} className="snippet-category">
            <div
              className="snippet-category-header"
              onClick={() => toggleCategory(category)}
            >
              {isCollapsed ? <VscChevronRight /> : <VscChevronDown />}
              <span>{category}</span>
              <span className="snippet-category-count">{snippets.length}</span>
            </div>
            {!isCollapsed &&
              snippets.map((snippet) => {
                const isUser = isUserSnippet(snippet.prefix);
                const isDefault = defaultSnippets.some((s) => s.prefix === snippet.prefix);
                return (
                  <div
                    key={snippet.prefix}
                    className="snippet-item"
                    title={snippet.description}
                  >
                    <div className="snippet-item-main" onClick={() => handleInsert(snippet)}>
                      <VscSymbolSnippet
                        style={{ color: isUser ? 'var(--accent-green)' : 'var(--accent-purple)', flexShrink: 0 }}
                      />
                      <span className="snippet-item-prefix">{snippet.prefix}</span>
                      <span className="snippet-item-name truncate">
                        {snippet.name ?? snippet.description}
                      </span>
                    </div>
                    <div className="snippet-item-actions">
                      <button
                        className="icon-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditForm(snippet);
                        }}
                        title={isDefault && !isUser ? 'Override default snippet' : 'Edit snippet'}
                      >
                        <VscEdit />
                      </button>
                      {isUser && (
                        <button
                          className="icon-btn-sm danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(snippet.prefix);
                          }}
                          title="Delete snippet"
                        >
                          <VscTrash />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        );
      })}
      {grouped.size === 0 && (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-faint)', fontSize: '1rem' }}>
          No snippets match
        </div>
      )}
    </div>
  );
}
