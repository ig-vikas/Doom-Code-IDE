import { useState, useCallback, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useUIStore } from '../stores';
import { useSolveCounterStore } from '../stores/solveCounterStore';
import MenuBar from './MenuBar';
import { VscChromeMinimize, VscChromeMaximize, VscChromeRestore, VscChromeClose, VscAdd, VscRemove } from 'react-icons/vsc';

// Import the app icon - Vite handles the asset path
import appIcon from '/src-tauri/icons/icon.png';

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

  useEffect(() => {
    const syncWindowState = async () => {
      const win = getCurrentWindow();
      setMaximized(await win.isMaximized());
    };

    syncWindowState();
  }, []);

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-logo">
        <img src={appIcon} alt="Doom Code" className="titlebar-icon" />
        <span>Doom Code</span>
      </div>
      <MenuBar />
      <div className="solve-counter">
        <button type="button" className="solve-counter-btn" onClick={decrement} title="Undo solve">
          <VscRemove />
        </button>
        <span className="solve-counter-value" title="Questions solved today">{todayCount}</span>
        <button type="button" className="solve-counter-btn plus" onClick={increment} title="Mark solved">
          <VscAdd />
        </button>
      </div>
      <div className="titlebar-center">
        {!windowFocused && <span style={{ opacity: 0.5 }}>Doom Code</span>}
      </div>
      <div className="titlebar-controls">
        <button type="button" className="titlebar-btn" onClick={handleMinimize} aria-label="Minimize">
          <VscChromeMinimize />
        </button>
        <button type="button" className="titlebar-btn" onClick={handleToggleMaximize} aria-label="Maximize">
          {maximized ? <VscChromeRestore /> : <VscChromeMaximize />}
        </button>
        <button type="button" className="titlebar-btn close" onClick={handleClose} aria-label="Close">
          <VscChromeClose />
        </button>
      </div>
    </div>
  );
}
