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
    const singleBindings = bindings
      .filter((kb) => !kb.key.includes(' '))
      .map((kb) => ({ command: kb.command, parsed: parseKeybinding(kb.key) }));

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      for (const b of singleBindings) {
        if (matchesEvent(e, b.parsed)) {
          if (isInput && !GLOBAL_COMMANDS.has(b.command)) continue;
          e.preventDefault();
          e.stopPropagation();
          executeCommand(b.command);
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [overrides]);
}

export function useKeybindings(_handlers: Record<string, () => void>) {
  // No-op — all keybindings now use the command service
}
