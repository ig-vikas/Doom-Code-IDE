import { CSSProperties, useCallback, useState } from 'react';
import { useUIStore, useBuildStore } from '../stores';
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

export default function BottomPanel({ style }: BottomPanelProps) {
  const compiling = useBuildStore((s) => s.compiling);
  const running = useBuildStore((s) => s.running);
  const activeProfile = useBuildStore((s) => s.getActiveProfile());
  const [activeTab, setActiveTab] = useState<'terminal' | 'testcases' | 'buildconfig'>('terminal');
  const [testCasesEnabled, setTestCasesEnabled] = useState(true);

  const handleBuildAndRun = useCallback(() => {
    executeCommand('build.compileAndRun');
  }, []);

  const handleStop = useCallback(() => {
    executeCommand('build.killProcess');
  }, []);

  const handleRunAllTests = useCallback(() => {
    executeCommand('build.runAllTestCases');
  }, []);

  return (
    <div className="bottom-panel" style={style}>
      <div className="bottom-panel-header">
        <div className="bottom-panel-tabs">
          <button
            className={`bottom-panel-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <VscTerminal style={{ marginRight: 4 }} /> Terminal
          </button>
          <button
            className={`bottom-panel-tab ${activeTab === 'testcases' ? 'active' : ''}`}
            onClick={() => setActiveTab('testcases')}
          >
            <VscBeaker style={{ marginRight: 4 }} /> Test Cases
          </button>
          <button
            className={`bottom-panel-tab ${activeTab === 'buildconfig' ? 'active' : ''}`}
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
          {activeTab === 'testcases' && (
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
          )}
          {(compiling || running) ? (
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
        {activeTab === 'terminal' && <TerminalPanel />}
        {activeTab === 'testcases' && (
          testCasesEnabled ? (
            <TestCases />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '1rem' }}>
              Test cases are disabled. Enable them using the toggle above.
            </div>
          )
        )}
        {activeTab === 'buildconfig' && (
          <BuildConfigPanel onClose={() => setActiveTab('terminal')} />
        )}
      </div>
    </div>
  );
}
