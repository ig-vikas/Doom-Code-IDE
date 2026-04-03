import { useMemo, useRef, useState, useCallback, useEffect, type MutableRefObject } from 'react';
import { useEditorStore } from '../stores';
import { VscRegex, VscCaseSensitive, VscWholeWord } from 'react-icons/vsc';

interface SearchResult {
  tabId: string;
  groupId: string;
  path: string;
  fileName: string;
  line: number;
  column: number;
  lineContent: string;
  start: number;
  end: number;
}

interface GroupedResult {
  path: string;
  fileName: string;
  matches: SearchResult[];
}

interface FlatResult {
  key: string;
  groupPath: string;
  result: SearchResult;
}

interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  maxResults?: number;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchRegex(query: string, options: SearchOptions): RegExp | null {
  if (!query) return null;
  try {
    const base = options.useRegex ? query : escapeRegex(query);
    const source = options.wholeWord ? `\\b(?:${base})\\b` : base;
    const flags = options.caseSensitive ? 'g' : 'gi';
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}

function findLineIndex(lineStarts: number[], index: number): number {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lineStarts[mid] <= index) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return Math.max(0, high);
}

function searchInContent(content: string, query: string, options: SearchOptions): Omit<SearchResult, 'tabId' | 'groupId' | 'path' | 'fileName'>[] {
  const regex = buildSearchRegex(query, options);
  if (!regex) return [];

  const lineStarts = [0];
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === '\n') {
      lineStarts.push(i + 1);
    }
  }

  const maxResults = options.maxResults ?? 500;
  const results: Omit<SearchResult, 'tabId' | 'groupId' | 'path' | 'fileName'>[] = [];

  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const matchText = match[0] ?? '';
    if (matchText.length === 0) {
      regex.lastIndex += 1;
      continue;
    }

    const start = match.index;
    const end = start + matchText.length;
    const lineIdx = findLineIndex(lineStarts, start);
    const lineStart = lineStarts[lineIdx];
    let lineEnd = content.indexOf('\n', lineStart);
    if (lineEnd === -1) lineEnd = content.length;

    results.push({
      line: lineIdx + 1,
      column: start - lineStart + 1,
      lineContent: content.slice(lineStart, lineEnd).replace(/\r$/, ''),
      start,
      end,
    });

    if (results.length >= maxResults) break;
  }

  return results;
}

export default function SearchPanel() {
  const activeTab = useEditorStore((s) => s.getActiveTab());

  const [query, setQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<GroupedResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectionStyle, setSelectionStyle] = useState({ y: 0, h: 0, visible: false });
  const [shakeInput, setShakeInput] = useState(false);

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  const flatResults = useMemo<FlatResult[]>(() => {
    const flattened: FlatResult[] = [];
    for (const group of results) {
      for (const match of group.matches) {
        flattened.push({
          key: `${group.path}:${match.start}:${match.end}`,
          groupPath: group.path,
          result: match,
        });
      }
    }
    return flattened;
  }, [results]);

  const toScopedResults = useCallback(
    (tab: { id: string; path?: string; name: string }, groupId: string, contentMatches: Omit<SearchResult, 'tabId' | 'groupId' | 'path' | 'fileName'>[]): SearchResult[] => {
      return contentMatches.map((match) => ({
        ...match,
        tabId: tab.id,
        groupId,
        path: tab.path ?? '',
        fileName: tab.name,
      }));
    },
    []
  );

  const runScopedSearch = useCallback(
    (tab: { id: string; path?: string; name: string; content: string }, groupId: string, needle: string): SearchResult[] => {
      const contentMatches = searchInContent(tab.content, needle, {
        caseSensitive,
        wholeWord,
        useRegex,
        maxResults: 500,
      });
      return toScopedResults(tab, groupId, contentMatches);
    },
    [caseSensitive, wholeWord, useRegex, toScopedResults]
  );

  const applyResults = useCallback((tab: { id: string; path?: string; name: string }, matches: SearchResult[], shakeWhenEmpty = false) => {
    setTotalMatches(matches.length);
    setResults(
      matches.length > 0
        ? [{ path: tab.path || `untitled:${tab.id}`, fileName: tab.name, matches }]
        : []
    );
    if (matches.length === 0 && shakeWhenEmpty) {
      setShakeInput(true);
    }
  }, []);

  const openResult = useCallback(
    (result: SearchResult) => {
      const editorState = useEditorStore.getState();
      const tabs = editorState.getGroupTabs(result.groupId);
      const targetTab = tabs.find((tab) => tab.id === result.tabId);
      if (!targetTab) return;

      editorState.setActiveGroup(result.groupId);
      editorState.setActiveTab(result.groupId, result.tabId);
      editorState.updateCursorPosition(result.groupId, result.tabId, result.line, result.column);
    },
    []
  );

  const handleSearch = useCallback(() => {
    const needle = query.trim();
    if (!needle) return;

    const editorState = useEditorStore.getState();
    const tab = editorState.getActiveTab();
    const groupId = editorState.activeGroupId;
    if (!tab) {
      setResults([]);
      setTotalMatches(0);
      setSelectedIndex(0);
      setSelectionStyle({ y: 0, h: 0, visible: false });
      setShakeInput(true);
      return;
    }

    setSearching(true);
    try {
      const matches = runScopedSearch(tab, groupId, needle);
      applyResults(tab, matches, true);
      setSelectedIndex(0);
    } finally {
      setSearching(false);
    }
  }, [applyResults, query, runScopedSearch]);

  const refreshForTabContent = useCallback(
    (tab: { id: string; path?: string; name: string; content: string }, groupId: string, keepIndex = 0) => {
      const needle = query.trim();
      if (!needle) {
        setResults([]);
        setTotalMatches(0);
        setSelectedIndex(0);
        return [];
      }
      const matches = runScopedSearch(tab, groupId, needle);
      applyResults(tab, matches, false);
      if (matches.length === 0) {
        setSelectedIndex(0);
      } else {
        setSelectedIndex(Math.max(0, Math.min(keepIndex, matches.length - 1)));
      }
      return matches;
    },
    [applyResults, query, runScopedSearch]
  );

  const handleReplaceOne = useCallback(() => {
    const needle = query.trim();
    if (!needle) return;

    const selected = flatResults[selectedIndex] ?? flatResults[0];
    if (!selected) {
      setShakeInput(true);
      return;
    }

    const { result } = selected;
    const editorState = useEditorStore.getState();
    const tabs = editorState.getGroupTabs(result.groupId);
    const targetTab = tabs.find((tab) => tab.id === result.tabId);
    if (!targetTab) {
      setShakeInput(true);
      return;
    }

    const nextContent =
      targetTab.content.slice(0, result.start) +
      replaceValue +
      targetTab.content.slice(result.end);

    editorState.setActiveGroup(result.groupId);
    editorState.setActiveTab(result.groupId, result.tabId);
    editorState.updateTabContent(result.tabId, nextContent);
    editorState.updateCursorPosition(
      result.groupId,
      result.tabId,
      result.line,
      result.column + replaceValue.length
    );

    const updatedTab = { ...targetTab, content: nextContent };
    const nextMatches = refreshForTabContent(updatedTab, result.groupId, selectedIndex);
    if (nextMatches.length > 0) {
      const nextTarget = nextMatches.findIndex((match) => match.start >= result.start + replaceValue.length);
      if (nextTarget >= 0) {
        setSelectedIndex(nextTarget);
      }
    }
  }, [flatResults, query, refreshForTabContent, replaceValue, selectedIndex]);

  const handleReplaceAll = useCallback(() => {
    const needle = query.trim();
    if (!needle) return;

    const editorState = useEditorStore.getState();
    const tab = editorState.getActiveTab();
    const groupId = editorState.activeGroupId;
    if (!tab) {
      setShakeInput(true);
      return;
    }

    const regex = buildSearchRegex(needle, {
      caseSensitive,
      wholeWord,
      useRegex,
      maxResults: 500,
    });
    if (!regex) {
      setShakeInput(true);
      return;
    }

    const existingMatches = runScopedSearch(tab, groupId, needle);
    if (existingMatches.length === 0) {
      setShakeInput(true);
      return;
    }

    const nextContent = tab.content.replace(regex, replaceValue);
    editorState.setActiveGroup(groupId);
    editorState.setActiveTab(groupId, tab.id);
    editorState.updateTabContent(tab.id, nextContent);

    const updatedTab = { ...tab, content: nextContent };
    refreshForTabContent(updatedTab, groupId, 0);
  }, [caseSensitive, wholeWord, useRegex, query, replaceValue, refreshForTabContent, runScopedSearch]);

  useEffect(() => {
    if (!shakeInput) return;
    const timer = setTimeout(() => setShakeInput(false), 320);
    return () => clearTimeout(timer);
  }, [shakeInput]);

  useEffect(() => {
    const container = resultsRef.current;
    const activeRow = rowRefs.current[selectedIndex];
    if (!container || !activeRow) {
      setSelectionStyle((prev) => ({ ...prev, visible: false }));
      return;
    }

    activeRow.scrollIntoView({ block: 'nearest' });
    setSelectionStyle({
      y: activeRow.offsetTop,
      h: activeRow.offsetHeight,
      visible: true,
    });
  }, [selectedIndex, flatResults]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(flatResults.length - 1, 0)));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatResults[selectedIndex];
        if (selected) {
          openResult(selected.result);
        } else {
          handleSearch();
        }
      }
    },
    [flatResults, handleSearch, openResult, selectedIndex]
  );

  return (
    <div className="search-panel">
      <div className={`search-input-container ${shakeInput ? 'shake' : ''}`}>
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Find in current file..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <div style={{ padding: '0 8px 6px', fontSize: '0.846rem', color: 'var(--text-faint)' }}>
        Scope: current file {activeTab ? `(${activeTab.name})` : '(no active file)'}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '0 8px 8px' }}>
        <input
          type="text"
          placeholder="Replace..."
          value={replaceValue}
          onChange={(e) => setReplaceValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (e.shiftKey) {
              handleReplaceAll();
            } else {
              handleReplaceOne();
            }
          }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="button" className="snippet-btn secondary" onClick={handleReplaceOne} title="Replace selected match">
          Replace
        </button>
        <button type="button" className="snippet-btn secondary" onClick={handleReplaceAll} title="Replace all matches in current file">
          All
        </button>
      </div>
      <div className="search-options">
        <button
          className={`search-option-btn ${caseSensitive ? 'active' : ''}`}
          onClick={() => setCaseSensitive(!caseSensitive)}
          title="Match Case"
        >
          <VscCaseSensitive />
        </button>
        <button
          className={`search-option-btn ${wholeWord ? 'active' : ''}`}
          onClick={() => setWholeWord(!wholeWord)}
          title="Whole Word"
        >
          <VscWholeWord />
        </button>
        <button
          className={`search-option-btn ${useRegex ? 'active' : ''}`}
          onClick={() => setUseRegex(!useRegex)}
          title="Use Regex"
        >
          <VscRegex />
        </button>
      </div>

      {searching ? (
        <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      ) : null}

      {!searching && results.length > 0 ? (
        <div className="search-results" ref={resultsRef}>
          <div
            className={`search-selection-indicator ${selectionStyle.visible ? 'visible' : ''}`}
            style={{
              transform: `translateY(${selectionStyle.y}px)`,
              height: `${selectionStyle.h}px`,
            }}
          />
          <div style={{ padding: '4px 8px', fontSize: '0.923rem', color: 'var(--text-faint)' }}>
            {totalMatches} results in {results.length} file{results.length === 1 ? '' : 's'}
          </div>
          {results.map((group) => (
            <SearchGroup
              key={group.path}
              group={group}
              query={query}
              caseSensitive={caseSensitive}
              wholeWord={wholeWord}
              useRegex={useRegex}
              flatResults={flatResults}
              selectedIndex={selectedIndex}
              rowRefs={rowRefs}
              onOpen={openResult}
            />
          ))}
        </div>
      ) : null}

      {!searching && query && results.length === 0 && totalMatches === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '1rem' }}>
          No results found
        </div>
      ) : null}
    </div>
  );
}

function SearchGroup({
  group,
  query,
  caseSensitive,
  wholeWord,
  useRegex,
  flatResults,
  selectedIndex,
  rowRefs,
  onOpen,
}: {
  group: GroupedResult;
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  flatResults: FlatResult[];
  selectedIndex: number;
  rowRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  onOpen: (result: SearchResult) => void;
}) {
  return (
    <div>
      <div className="search-result-file">{group.fileName}</div>
      {group.matches.map((match, idx) => {
        const flatIndex = flatResults.findIndex((flat) => flat.key === `${group.path}:${match.start}:${match.end}`);
        const isSelected = flatIndex === selectedIndex;
        return (
          <div
            key={`${group.path}:${match.start}:${match.end}:${idx}`}
            ref={(el) => {
              if (flatIndex >= 0) {
                rowRefs.current[flatIndex] = el;
              }
            }}
            className={`search-result-line ${isSelected ? 'selected' : ''}`}
            onClick={() => onOpen(match)}
            style={{ animationDelay: `${Math.max(0, Math.min(flatIndex, 15)) * 25}ms` }}
          >
            <span style={{ color: 'var(--text-faint)', marginRight: 8 }}>{match.line}</span>
            {highlightMatch(match.lineContent, query, { caseSensitive, wholeWord, useRegex, maxResults: 0 })}
          </div>
        );
      })}
    </div>
  );
}

function highlightMatch(text: string, query: string, options: SearchOptions): JSX.Element {
  if (!query) return <>{text}</>;

  const regex = buildSearchRegex(query, options);
  if (!regex) return <>{text}</>;

  const nodes: JSX.Element[] = [];
  let cursor = 0;
  let chunkIndex = 0;

  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const value = match[0] ?? '';
    if (value.length === 0) {
      regex.lastIndex += 1;
      continue;
    }

    if (match.index > cursor) {
      nodes.push(<span key={`plain-${chunkIndex}`}>{text.slice(cursor, match.index)}</span>);
      chunkIndex += 1;
    }

    nodes.push(
      <span key={`hit-${chunkIndex}`} className="search-match">
        {value}
      </span>
    );
    chunkIndex += 1;
    cursor = match.index + value.length;
  }

  if (cursor < text.length) {
    nodes.push(<span key={`plain-${chunkIndex}`}>{text.slice(cursor)}</span>);
  }

  return nodes.length > 0 ? <>{nodes}</> : <>{text}</>;
}
