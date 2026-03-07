import { useEffect, useRef } from 'react';
import type { editor } from 'monaco-editor';
import { useThemeStore } from '../stores';

export function useMonacoSetup(monacoRef: React.MutableRefObject<typeof import('monaco-editor') | null>) {
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const registered = useRef(new Set<string>());

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Register the current theme
    if (!registered.current.has(currentTheme.id)) {
      monaco.editor.defineTheme(currentTheme.id, currentTheme.monacoTheme as editor.IStandaloneThemeData);
      registered.current.add(currentTheme.id);
    }
    monaco.editor.setTheme(currentTheme.id);
  }, [currentTheme, monacoRef]);

  const registerTheme = (monaco: typeof import('monaco-editor')) => {
    monacoRef.current = monaco;
    if (!registered.current.has(currentTheme.id)) {
      monaco.editor.defineTheme(currentTheme.id, currentTheme.monacoTheme as editor.IStandaloneThemeData);
      registered.current.add(currentTheme.id);
    }
    monaco.editor.setTheme(currentTheme.id);
  };

  return { registerTheme };
}
