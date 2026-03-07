import { useCallback, useRef } from 'react';

export function useResizable(
  direction: 'horizontal' | 'vertical',
  onResize: (delta: number) => void,
  onResizeEnd?: () => void
) {
  const startPos = useRef(0);
  const dragging = useRef(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
      dragging.current = true;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const current = direction === 'horizontal' ? ev.clientX : ev.clientY;
        const delta = current - startPos.current;
        startPos.current = current;
        onResize(delta);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        onResizeEnd?.();
      };

      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [direction, onResize, onResizeEnd]
  );

  return { onMouseDown };
}
