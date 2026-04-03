import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUIStore, useBuildStore, useSettingsStore } from '../stores';
import TerminalPanel from './TerminalPanel';
import TestCases from './TestCases';
import BuildConfigPanel from './BuildConfigPanel';
import { executeCommand } from '../services/commandService';
import {
  VscPlay,
  VscDebugStop,
  VscBeaker,
  VscTerminal,
  VscGear,
} from 'react-icons/vsc';

interface BottomPanelProps {
  style?: CSSProperties;
}

type BottomTabId = 'terminal' | 'testcases' | 'buildconfig';

const TAB_IDS: BottomTabId[] = ['terminal', 'testcases', 'buildconfig'];

export default function BottomPanel({ style }: BottomPanelProps) {
  const compiling = useBuildStore((s) => s.compiling);
  const running = useBuildStore((s) => s.running);
  const activeProfile = useBuildStore((s) => s.getActiveProfile());
  const buildVisualState = useBuildStore((s) => s.buildVisualState);
  const buildVisualToken = useBuildStore((s) => s.buildVisualToken);
  const terminalFontSize = useSettingsStore((s) => s.settings.terminal.fontSize);
  const focusedPanel = useUIStore((s) => s.focusedPanel);
  const setFocusedPanel = useUIStore((s) => s.setFocusedPanel);

  const [activeTab, setActiveTab] = useState<BottomTabId>('terminal');
  const [testCasesEnabled, setTestCasesEnabled] = useState(true);
  const [buildFlash, setBuildFlash] = useState<'success' | 'failure' | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ x: 0, width: 0, visible: false });
  const tabRefs = useRef<Record<BottomTabId, HTMLButtonElement | null>>({
    terminal: null,
    testcases: null,
    buildconfig: null,
  });

  useEffect(() => {
    const tabElement = tabRefs.current[activeTab];
    if (!tabElement) {
      setIndicatorStyle((prev) => ({ ...prev, visible: false }));
      return;
    }
    setIndicatorStyle({
      x: tabElement.offsetLeft,
      width: tabElement.offsetWidth,
      visible: true,
    });
  }, [activeTab]);

  useEffect(() => {
    if (buildVisualState !== 'success' && buildVisualState !== 'failure') {
      return;
    }
    setBuildFlash(buildVisualState);
    const timer = window.setTimeout(() => setBuildFlash(null), 240);
    return () => window.clearTimeout(timer);
  }, [buildVisualState, buildVisualToken]);

  const handleBuildAndRun = useCallback(() => {
    executeCommand('build.compileAndRun');
  }, []);

  const handleStop = useCallback(() => {
    executeCommand('build.killProcess');
  }, []);

  const handleRunAllTests = useCallback(() => {
    executeCommand('build.runAllTestCases');
  }, []);

  const contentClasses = useMemo(
    () => ({
      terminal: `bottom-panel-pane ${activeTab === 'terminal' ? 'active' : ''}`,
      testcases: `bottom-panel-pane ${activeTab === 'testcases' ? 'active' : ''}`,
      buildconfig: `bottom-panel-pane ${activeTab === 'buildconfig' ? 'active' : ''}`,
    }),
    [activeTab]
  );

  return (
    <div
      className={`bottom-panel ${focusedPanel === 'bottom' ? 'focused' : ''}`}
      style={{ ...style, fontSize: `${terminalFontSize}px` }}
      onMouseDown={() => setFocusedPanel('bottom')}
    >
      <div className="bottom-panel-header">
        <div className="bottom-panel-tabs">
          <div
            className={`bottom-tab-indicator ${indicatorStyle.visible ? 'visible' : ''}`}
            style={{ transform: `translateX(${indicatorStyle.x}px)`, width: `${indicatorStyle.width}px` }}
          />
          <button
            ref={(el) => {
              tabRefs.current.terminal = el;
            }}
            className={`bottom-panel-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <VscTerminal style={{ marginRight: 4 }} /> Terminal
          </button>
          <button
            ref={(el) => {
              tabRefs.current.testcases = el;
            }}
            className={`bottom-panel-tab ${activeTab === 'testcases' ? 'active' : ''}`}
            onClick={() => setActiveTab('testcases')}
          >
            <VscBeaker style={{ marginRight: 4 }} /> Test Cases
          </button>
          <button
            ref={(el) => {
              tabRefs.current.buildconfig = el;
            }}
            className={`bottom-panel-tab ${activeTab === 'buildconfig' ? 'active' : ''} ${buildFlash ? `build-flash-${buildFlash}` : ''}`}
            onClick={() => setActiveTab('buildconfig')}
            title="Build Configuration"
          >
            <VscGear style={{ marginRight: 4 }} /> Build
          </button>
          <span className="build-profile-badge" title={`Active: ${activeProfile.name}`}>
            {activeProfile.name}
          </span>
        </div>
        <div className="bottom-panel-actions">
          {activeTab === 'testcases' ? (
            <>
              <label className="toggle-label" title="Enable/Disable test cases">
                <input
                  type="checkbox"
                  checked={testCasesEnabled}
                  onChange={(e) => setTestCasesEnabled(e.target.checked)}
                />
                <span className="toggle-text">Enabled</span>
              </label>
              <button className="icon-btn" onClick={handleRunAllTests} title="Run All Test Cases">
                <VscPlay style={{ color: 'var(--accent-green)' }} />
              </button>
            </>
          ) : null}
          {compiling || running ? (
            <button className="icon-btn" onClick={handleStop} title="Stop">
              <VscDebugStop style={{ color: 'var(--accent-red)' }} />
            </button>
          ) : (
            <button className="icon-btn" onClick={handleBuildAndRun} title="Build & Run (F5)">
              <VscPlay style={{ color: 'var(--accent-green)' }} />
            </button>
          )}
        </div>
      </div>
      <div className="bottom-panel-content">
        <div className={contentClasses.terminal}>
          <TerminalPanel />
        </div>
        <div className={contentClasses.testcases}>
          {testCasesEnabled ? (
            <TestCases />
          ) : (
            <div className="bottom-panel-disabled">
              Test cases are disabled. Enable them using the toggle above.
            </div>
          )}
        </div>
        <div className={contentClasses.buildconfig}>
          <BuildConfigPanel onClose={() => setActiveTab('terminal')} />
        </div>
      </div>
    </div>
  );
}
