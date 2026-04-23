import { useState, useCallback, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { VscChromeMinimize, VscChromeMaximize, VscChromeRestore, VscChromeClose, VscAdd, VscRemove, VscSparkle } from 'react-icons/vsc';
import { useSolveCounterStore } from '../stores/solveCounterStore';
import { useAIStore } from '../stores/aiStore';

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const aiEnabled = useAIStore((s) => s.config.enabled);
  const setAIEnabled = useAIStore((s) => s.setEnabled);
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
    <div className="app-titlebar" data-tauri-drag-region="">
      {/* Spacer for the Radial Doom Icon on the left */}
      <div className="app-titlebar-left" data-tauri-drag-region=""></div>

      {/* Center: Problem Counter */}
      <div className="app-titlebar-center" data-tauri-drag-region="">
        <div className="solve-counter titlebar-solve-counter">
          <button type="button" className="solve-counter-btn" onClick={decrement} title="Undo solve">
            <VscRemove />
          </button>
          <span className="solve-counter-value" title="Questions solved today">{todayCount}</span>
          <button type="button" className="solve-counter-btn plus" onClick={increment} title="Mark solved">
            <VscAdd />
          </button>
        </div>
      </div>

      {/* Right: AI Toggle & Window Controls */}
      <div className="app-titlebar-right">
        <button 
          type="button" 
          className={`titlebar-btn ai-toggle ${aiEnabled ? 'active' : ''}`}
          onClick={() => setAIEnabled(!aiEnabled)}
          title={aiEnabled ? "AI is ON" : "AI is OFF"}
        >
          <VscSparkle style={{ color: aiEnabled ? 'var(--accent-primary)' : 'var(--text-faint)', fontSize: '14px' }} />
          <span style={{ fontSize: '11px', marginLeft: '6px', color: aiEnabled ? 'var(--text-primary)' : 'var(--text-faint)' }}>
            AI
          </span>
        </button>

        <div className="floating-window-controls" style={{ position: 'static', background: 'transparent' }}>
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
    </div>
  );
}
