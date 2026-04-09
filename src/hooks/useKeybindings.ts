import { useEffect } from 'react';
import { useKeybindingStore } from '../stores/keybindingStore';
import { executeCommand, hasCommand } from '../services/commandService';

interface ParsedKeybinding {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

const CTRL_TOKENS = new Set(['ctrl', 'control']);
const SHIFT_TOKENS = new Set(['shift']);
const ALT_TOKENS = new Set(['alt', 'option']);
const META_TOKENS = new Set(['meta', 'cmd', 'command', 'win', 'super']);

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  return: 'enter',
  ' ': 'space',
  spacebar: 'space',
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
};

function normalizeKeyToken(input: string): string {
  const token = input.trim().toLowerCase();
  return KEY_ALIASES[token] ?? token;
}

function isModifierToken(token: string): boolean {
  return CTRL_TOKENS.has(token) || SHIFT_TOKENS.has(token) || ALT_TOKENS.has(token) || META_TOKENS.has(token);
}

function parseKeybinding(binding: string): ParsedKeybinding | null {
  if (typeof binding !== 'string') {
    return null;
  }

  const parts = binding
    .toLowerCase()
    .split('+')
    .map((part) => normalizeKeyToken(part))
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const key = parts[parts.length - 1];
  if (!key || isModifierToken(key)) {
    return null;
  }

  return {
    ctrl: parts.some((part) => CTRL_TOKENS.has(part)),
    shift: parts.some((part) => SHIFT_TOKENS.has(part)),
    alt: parts.some((part) => ALT_TOKENS.has(part)),
    meta: parts.some((part) => META_TOKENS.has(part)),
    key,
  };
}

function matchesEvent(e: KeyboardEvent, parsed: ParsedKeybinding): boolean {
  if (e.ctrlKey !== parsed.ctrl) return false;
  if (e.shiftKey !== parsed.shift) return false;
  if (e.altKey !== parsed.alt) return false;
  if (e.metaKey !== parsed.meta) return false;

  const eventKey = normalizeKeyToken(e.key.toLowerCase());
  if (eventKey === parsed.key) {
    return true;
  }

  // Keep punctuation key matching stable across keyboard layouts.
  if (parsed.key === '\\') return e.code === 'Backslash';
  if (parsed.key === '`') return e.code === 'Backquote';
  if (parsed.key === '/') return e.code === 'Slash';
  if (parsed.key === '[') return e.code === 'BracketLeft';
  if (parsed.key === ']') return e.code === 'BracketRight';
  if (parsed.key === ',') return e.code === 'Comma';
  if (parsed.key === '.') return e.code === 'Period';
  if (parsed.key === '-') return e.code === 'Minus';
  if (parsed.key === '=') return e.code === 'Equal';

  return false;
}

function parseKeybindingSequence(binding: string): ParsedKeybinding[] | null {
  if (typeof binding !== 'string') {
    return null;
  }

  const chunks = binding.trim().split(/\s+/).filter(Boolean);
  if (chunks.length === 0) {
    return null;
  }

  const parsed = chunks.map(parseKeybinding);
  if (parsed.some((entry) => !entry)) {
    return null;
  }

  return parsed as ParsedKeybinding[];
}

// Commands that should work even when typing in inputs.
const GLOBAL_COMMANDS = new Set([
  'file.nextTab', 'file.previousTab', 'file.closeTab', 'file.save',
  'file.saveAs', 'file.saveAll', 'file.reopenClosedTab', 'file.newFile',
  'file.newCPFile', 'file.openFile', 'file.openFolder', 'file.closeWindow',
  'navigation.commandPalette', 'navigation.quickOpen',
  'view.toggleSidebar', 'view.toggleTerminal', 'view.toggleFullscreen',
  'view.zoomIn', 'view.zoomOut', 'view.zoomReset',
  'settings.openSettings',
  'ai.triggerCompletion', 'ai.toggle',
  'build.compileAndRun', 'build.compileOnly', 'build.runOnly',
  'build.build', 'build.killProcess', 'build.runAllTestCases',
]);

export function useGlobalKeybindings() {
  const overrides = useKeybindingStore((s) => s.overrides);

  useEffect(() => {
    const bindings = useKeybindingStore.getState().getEffectiveBindings();
    const parsedBindings = bindings
      .map((kb) => {
        const sequence = parseKeybindingSequence(kb.key);
        if (!sequence) {
          return null;
        }

        return {
          command: kb.command,
          sequence,
        };
      })
      .filter((entry): entry is { command: string; sequence: ParsedKeybinding[] } => !!entry);

    let pendingBindings: typeof parsedBindings = [];
    let pendingIndex = 0;
    let pendingFallbackCommand: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPending = () => {
      pendingBindings = [];
      pendingIndex = 0;
      pendingFallbackCommand = null;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };

    const runCommand = (command: string): boolean => {
      if (!hasCommand(command)) {
        return false;
      }
      executeCommand(command);
      return true;
    };

    const armPending = (
      candidates: typeof parsedBindings,
      nextIndex: number,
      fallbackCommand: string | null
    ) => {
      pendingBindings = candidates;
      pendingIndex = nextIndex;
      pendingFallbackCommand = fallbackCommand;

      if (pendingTimer) {
        clearTimeout(pendingTimer);
      }

      pendingTimer = setTimeout(() => {
        const fallback = pendingFallbackCommand;
        clearPending();
        if (fallback) {
          runCommand(fallback);
        }
      }, 1000);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) {
        return;
      }

      const target = e.target instanceof HTMLElement ? e.target : null;
      const isInput = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      const isAllowed = (command: string) => !isInput || GLOBAL_COMMANDS.has(command);

      if (pendingBindings.length > 0) {
        const nextMatches = pendingBindings.filter((binding) =>
          matchesEvent(e, binding.sequence[pendingIndex])
        );

        if (nextMatches.length > 0) {
          const allowedMatches = nextMatches.filter(
            (binding) => isAllowed(binding.command) && hasCommand(binding.command)
          );

          if (allowedMatches.length === 0) {
            clearPending();
            return;
          }

          e.preventDefault();
          e.stopPropagation();

          const completed = allowedMatches.find((binding) => binding.sequence.length === pendingIndex + 1);
          if (completed) {
            clearPending();
            runCommand(completed.command);
            return;
          }

          armPending(allowedMatches, pendingIndex + 1, pendingFallbackCommand);
          return;
        }

        clearPending();
      }

      const firstMatches = parsedBindings.filter((binding) => matchesEvent(e, binding.sequence[0]));
      if (firstMatches.length === 0) {
        return;
      }

      const allowedMatches = firstMatches.filter(
        (binding) => isAllowed(binding.command) && hasCommand(binding.command)
      );
      if (allowedMatches.length === 0) {
        return;
      }

      const immediate = allowedMatches.find((binding) => binding.sequence.length === 1);
      const chordMatches = allowedMatches.filter((binding) => binding.sequence.length > 1);

      if (chordMatches.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        armPending(chordMatches, 1, immediate?.command ?? null);
        return;
      }

      if (immediate) {
        e.preventDefault();
        e.stopPropagation();
        clearPending();
        runCommand(immediate.command);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      clearPending();
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [overrides]);
}

export function useKeybindings(_handlers: Record<string, () => void>) {
  // No-op: all keybindings now use the command service.
}
