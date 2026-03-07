import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore, useEditorStore } from '../stores';
import { writeFileContent } from '../services/fileService';

export function useAutoSave() {
  const autoSave = useSettingsStore((s) => s.settings.files.autoSave);
  const autoSaveDelay = useSettingsStore((s) => s.settings.files.autoSaveDelay);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const triggerAutoSave = useCallback(
    (filePath: string, content: string) => {
      if (!autoSave || autoSaveDelay <= 0) return;

      const existing = timers.current.get(filePath);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        try {
          await writeFileContent(filePath, content);
          useEditorStore.getState().markSaved(filePath);
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
        timers.current.delete(filePath);
      }, autoSaveDelay);

      timers.current.set(filePath, timer);
    },
    [autoSave, autoSaveDelay]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  return { triggerAutoSave };
}
