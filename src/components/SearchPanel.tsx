import { useState, useCallback } from 'react';
import { useFileExplorerStore, useEditorStore } from '../stores';
import { searchInFiles } from '../services/searchService';
import { readFileContent } from '../services/fileService';
import { getLanguageFromExtension } from '../utils/fileUtils';
import { VscRegex, VscCaseSensitive, VscWholeWord } from 'react-icons/vsc';

interface SearchResult {
  path: string;
  line: number;
  column: number;
  lineContent: string;
}

interface GroupedResult {
  path: string;
  fileName: string;
  matches: SearchResult[];
}

export default function SearchPanel() {
  const rootPath = useFileExplorerStore((s) => s.rootPath);
  const openTab = useEditorStore((s) => s.openTab);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);

  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<GroupedResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);

  const handleSearch = useCallback(async () => {
    if (!rootPath || !query.trim()) return;
    setSearching(true);
    try {
      const matches = await searchInFiles(rootPath, query, {
        caseSensitive,
        wholeWord,
        useRegex,
        maxResults: 500,
      });
      setTotalMatches(matches.length);
      // Group by file
      const grouped = new Map<string, SearchResult[]>();
      for (const m of matches) {
        if (!grouped.has(m.path)) grouped.set(m.path, []);
        grouped.get(m.path)!.push(m);
      }
      const groupedArr: GroupedResult[] = [];
      for (const [path, matches] of grouped) {
        const parts = path.replace(/\\/g, '/').split('/');
        groupedArr.push({ path, fileName: parts[parts.length - 1], matches });
      }
      setResults(groupedArr);
    } catch (err) {
      console.error('Search failed:', err);
    }
    setSearching(false);
  }, [rootPath, query, caseSensitive, wholeWord, useRegex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  const openResult = useCallback(
    async (result: SearchResult) => {
      try {
        const content = await readFileContent(result.path);
        const parts = result.path.replace(/\\/g, '/').split('/');
        const name = parts[parts.length - 1];
        const ext = name.split('.').pop() ?? '';
        openTab(activeGroupId, {
          id: result.path,
          path: result.path,
          name,
          language: getLanguageFromExtension(ext),
          content,
          isModified: false,
          isPinned: false,
          isPreview: true,
          cursorLine: 1,
          cursorColumn: 1,
          scrollTop: 0,
        });
      } catch (err) {
        console.error('Failed to open search result:', err);
      }
    },
    [openTab, activeGroupId]
  );

  return (
    <div className="search-panel">
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ width: '100%' }}
          />
        </div>
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

      {searching && (
        <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="search-results">
          <div style={{ padding: '4px 8px', fontSize: '0.923rem', color: 'var(--text-faint)' }}>
            {totalMatches} results in {results.length} files
          </div>
          {results.map((group) => (
            <div key={group.path}>
              <div className="search-result-file">{group.fileName}</div>
              {group.matches.map((m, i) => (
                <div
                  key={i}
                  className="search-result-line"
                  onClick={() => openResult(m)}
                >
                  <span style={{ color: 'var(--text-faint)', marginRight: 8 }}>{m.line}</span>
                  {highlightMatch(m.lineContent, query, useRegex)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!searching && query && results.length === 0 && totalMatches === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '1rem' }}>
          No results found
        </div>
      )}
    </div>
  );
}

function highlightMatch(text: string, query: string, isRegex: boolean): JSX.Element {
  if (!query) return <>{text}</>;
  try {
    const pattern = isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="search-match">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}
