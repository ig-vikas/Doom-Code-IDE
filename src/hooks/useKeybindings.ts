import { useEffect } from 'react';
import { useKeybindingStore } from '../stores/keybindingStore';
import { executeCommand } from '../services/commandService';

function parseKeybinding(binding: string): { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean; key: string } {
  const parts = binding.toLowerCase().split('+').map((p) => p.trim());
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    key: parts[parts.length - 1],
  };
}

function matchesEvent(e: KeyboardEvent, parsed: ReturnType<typeof parseKeybinding>): boolean {
  if (e.ctrlKey !== parsed.ctrl) return false;
  if (e.shiftKey !== parsed.shift) return false;
  if (e.altKey !== parsed.alt) return false;
  if (e.metaKey !== parsed.meta) return false;
  return e.key.toLowerCase() === parsed.key;
}

function parseKeybindingSequence(binding: string) {
  return binding
    .trim()
    .split(/\s+/)
    .map(parseKeybinding);
}

// Commands that should work even when typing in inputs
const GLOBAL_COMMANDS = new Set([
  'file.nextTab', 'file.previousTab', 'file.closeTab', 'file.save',
  'file.saveAs', 'file.saveAll', 'file.reopenClosedTab', 'file.newFile',
  'file.newCPFile', 'file.openFile', 'file.openFolder', 'file.closeWindow',
  'navigation.commandPalette', 'navigation.quickOpen',
  'view.toggleSidebar', 'view.toggleTerminal', 'view.toggleFullscreen',
  'view.zoomIn', 'view.zoomOut', 'view.zoomReset',
  'settings.openSettings',
  'build.compileAndRun', 'build.compileOnly', 'build.runOnly',
  'build.build', 'build.killProcess', 'build.runAllTestCases',
]);

export function useGlobalKeybindings() {
  const overrides = useKeybindingStore((s) => s.overrides);

  useEffect(() => {
    const bindings = useKeybindingStore.getState().getEffectiveBindings();
    const parsedBindings = bindings.map((kb) => ({
      command: kb.command,
      sequence: parseKeybindingSequence(kb.key),
    }));

    let pendingBindings: typeof parsedBindings = [];
    let pendingIndex = 0;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPending = () => {
      pendingBindings = [];
      pendingIndex = 0;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };

    const armPending = (candidates: typeof parsedBindings, nextIndex: number) => {
      pendingBindings = candidates;
      pendingIndex = nextIndex;
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        clearPending();
      }, 1500);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      const isAllowed = (command: string) => !isInput || GLOBAL_COMMANDS.has(command);

      if (pendingBindings.length > 0) {
        const nextMatches = pendingBindings.filter((binding) =>
          matchesEvent(e, binding.sequence[pendingIndex])
        );

        if (nextMatches.length > 0) {
          const allowedMatches = nextMatches.filter((binding) => isAllowed(binding.command));
          if (allowedMatches.length === 0) {
            clearPending();
            return;
          }

          e.preventDefault();
          e.stopPropagation();

          const completed = allowedMatches.find((binding) => binding.sequence.length === pendingIndex + 1);
          if (completed) {
            clearPending();
            executeCommand(completed.command);
            return;
          }

          armPending(allowedMatches, pendingIndex + 1);
          return;
        }

        clearPending();
      }

      const firstMatches = parsedBindings.filter((binding) => matchesEvent(e, binding.sequence[0]));
      if (firstMatches.length === 0) return;

      const allowedMatches = firstMatches.filter((binding) => isAllowed(binding.command));
      if (allowedMatches.length === 0) return;

      e.preventDefault();
      e.stopPropagation();

      const immediate = allowedMatches.find((binding) => binding.sequence.length === 1);
      if (immediate) {
        clearPending();
        executeCommand(immediate.command);
        return;
      }

      armPending(allowedMatches, 1);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      clearPending();
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [overrides]);
}

export function useKeybindings(_handlers: Record<string, () => void>) {
  // No-op — all keybindings now use the command service
}
