import { useState, useCallback, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { VscChromeMinimize, VscChromeMaximize, VscChromeRestore, VscChromeClose } from 'react-icons/vsc';

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

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
    <>
      {/* Thin drag region across the top of the window */}
      <div className="app-drag-region" data-tauri-drag-region="" />

      {/* Floating window controls at top-right */}
      <div className="floating-window-controls">
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
    </>
  );
}
