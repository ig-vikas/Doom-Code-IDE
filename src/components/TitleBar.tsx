import { useState, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useUIStore } from '../stores';
import { useSolveCounterStore } from '../stores/solveCounterStore';
import MenuBar from './MenuBar';
import { VscChromeMinimize, VscChromeMaximize, VscChromeRestore, VscChromeClose, VscAdd, VscRemove } from 'react-icons/vsc';
import { TbBolt } from 'react-icons/tb';

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const windowFocused = useUIStore((s) => s.windowFocused);
  const todayCount = useSolveCounterStore((s) => s.todayCount);
  const increment = useSolveCounterStore((s) => s.increment);
  const decrement = useSolveCounterStore((s) => s.decrement);

  const handleMinimize = useCallback(async () => {
    await getCurrentWindow().minimize();
  }, []);

  const handleToggleMaximize = useCallback(async () => {
    const win = getCurrentWindow();
    const isMax = await win.isMaximized();
    if (isMax) {
      await win.unmaximize();
      setMaximized(false);
    } else {
      await win.maximize();
      setMaximized(true);
    }
  }, []);

  const handleClose = useCallback(async () => {
    await getCurrentWindow().close();
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar-logo">
        <TbBolt />
        <span>Doom Code</span>
      </div>
      <MenuBar />
      <div className="solve-counter" data-tauri-drag-region="false">
        <button className="solve-counter-btn" onClick={decrement} title="Undo solve">
          <VscRemove />
        </button>
        <span className="solve-counter-value" title="Questions solved today">{todayCount}</span>
        <button className="solve-counter-btn plus" onClick={increment} title="Mark solved">
          <VscAdd />
        </button>
      </div>
      <div className="titlebar-center">
        {!windowFocused && <span style={{ opacity: 0.5 }}>Doom Code</span>}
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={handleMinimize} aria-label="Minimize">
          <VscChromeMinimize />
        </button>
        <button className="titlebar-btn" onClick={handleToggleMaximize} aria-label="Maximize">
          {maximized ? <VscChromeRestore /> : <VscChromeMaximize />}
        </button>
        <button className="titlebar-btn close" onClick={handleClose} aria-label="Close">
          <VscChromeClose />
        </button>
      </div>
    </div>
  );
}
