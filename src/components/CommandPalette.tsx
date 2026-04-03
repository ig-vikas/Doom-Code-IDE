import { useState, useCallback, useMemo, useRef, useEffect, KeyboardEvent } from 'react';
import { useUIStore } from '../stores';
import { defaultCommands, CommandDefinition } from '../config/defaultCommands';
import { fuzzyMatch } from '../utils/fuzzyMatch';
import { executeCommand as execCmd } from '../services/commandService';
import { VscSymbolEvent } from 'react-icons/vsc';

interface CommandPaletteProps {
  closing?: boolean;
}

export default function CommandPalette({ closing = false }: CommandPaletteProps) {
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectionStyle, setSelectionStyle] = useState({ y: 0, height: 0, visible: false });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

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
    [closeCommandPalette, filtered, runCommand, selectedIndex]
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = rowRefs.current[selectedIndex];
    if (!item) {
      setSelectionStyle((prev) => ({ ...prev, visible: false }));
      return;
    }

    item.scrollIntoView({ block: 'nearest' });
    setSelectionStyle({
      y: item.offsetTop,
      height: item.offsetHeight,
      visible: true,
    });
  }, [filtered, selectedIndex]);

  return (
    <div className={`command-palette-overlay ${closing ? 'closing' : 'opening'}`} onClick={closeCommandPalette}>
      <div className={`command-palette ${closing ? 'closing' : 'opening'}`} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
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
          <div
            className={`command-palette-selection ${selectionStyle.visible ? 'visible' : ''}`}
            style={{
              transform: `translateY(${selectionStyle.y}px)`,
              height: selectionStyle.height ? `${selectionStyle.height}px` : undefined,
            }}
          />
          {filtered.length > 0 ? (
            filtered.map((cmd, idx) => (
              <div
                key={cmd.id}
                ref={(el) => {
                  rowRefs.current[idx] = el;
                }}
                className={`command-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => runCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{ animationDelay: `${Math.min(idx, 10) * 20}ms` }}
              >
                <span className="command-palette-item-icon">
                  <VscSymbolEvent />
                </span>
                <span className="command-palette-item-label">{cmd.label}</span>
                {cmd.keybinding ? (
                  <span className="command-palette-item-shortcut">{cmd.keybinding}</span>
                ) : null}
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
