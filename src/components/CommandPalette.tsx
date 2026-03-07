import { useState, useCallback, useMemo, useRef, useEffect, KeyboardEvent } from 'react';
import { useUIStore } from '../stores';
import { defaultCommands, CommandDefinition } from '../config/defaultCommands';
import { fuzzyMatch } from '../utils/fuzzyMatch';
import { executeCommand as execCmd } from '../services/commandService';
import { VscSymbolEvent } from 'react-icons/vsc';

export default function CommandPalette() {
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return defaultCommands;
    return defaultCommands
      .map((cmd) => ({
        cmd,
        score: fuzzyMatch(query, cmd.label)?.score ?? -1,
      }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.cmd);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const runCommand = useCallback(
    (cmd: CommandDefinition) => {
      closeCommandPalette();
      execCmd(cmd.id);
    },
    [closeCommandPalette]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex]) {
            runCommand(filtered[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          closeCommandPalette();
          break;
      }
    },
    [filtered, selectedIndex, runCommand, closeCommandPalette]
  );

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className="command-palette-overlay" onClick={closeCommandPalette}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="command-palette-input">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="command-palette-results" ref={listRef}>
          {filtered.length > 0 ? (
            filtered.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`command-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => runCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="command-palette-item-icon">
                  <VscSymbolEvent />
                </span>
                <span className="command-palette-item-label">{cmd.label}</span>
                {cmd.keybinding && (
                  <span className="command-palette-item-shortcut">{cmd.keybinding}</span>
                )}
              </div>
            ))
          ) : (
            <div className="command-palette-empty">No commands match "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
