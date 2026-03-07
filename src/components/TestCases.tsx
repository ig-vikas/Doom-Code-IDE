import { useCallback } from 'react';
import { useBuildStore } from '../stores';
import type { Verdict } from '../types';
import {
  VscAdd,
  VscTrash,
  VscCopy,
  VscCheck,
  VscClose,
  VscWarning,
  VscWatch,
} from 'react-icons/vsc';

export default function TestCases() {
  const testCases = useBuildStore((s) => s.testCases);
  const activeTestCaseId = useBuildStore((s) => s.activeTestCaseId);
  const setActiveTestCase = useBuildStore((s) => s.setActiveTestCase);
  const addTestCase = useBuildStore((s) => s.addTestCase);
  const removeTestCase = useBuildStore((s) => s.removeTestCase);
  const updateTestCase = useBuildStore((s) => s.updateTestCase);
  const duplicateTestCase = useBuildStore((s) => s.duplicateTestCase);

  const activeCase = testCases.find((c) => c.id === activeTestCaseId) ?? testCases[0] ?? null;

  return (
    <div className="testcase-container">
      <div className="testcase-list">
        <div className="testcase-list-header">
          <span style={{ fontSize: '0.846rem', color: 'var(--text-faint)', fontWeight: 600 }}>CASES</span>
          <button className="sidebar-icon-btn" onClick={addTestCase} title="Add Test Case">
            <VscAdd />
          </button>
        </div>
        <div className="testcase-list-items">
          {testCases.map((tc) => (
            <div
              key={tc.id}
              className={`testcase-item ${tc.id === (activeCase?.id) ? 'active' : ''}`}
              onClick={() => setActiveTestCase(tc.id)}
            >
              <span className={`testcase-verdict ${getVerdictClass(tc.verdict)}`} />
              <span className="truncate" style={{ flex: 1 }}>{tc.name}</span>
              {tc.executionTime !== undefined && (
                <span style={{ fontSize: '0.769rem', color: 'var(--text-faint)' }}>
                  {tc.executionTime}ms
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      {activeCase && (
        <div className="testcase-editor">
          <div className="testcase-editor-header">
            <span>{activeCase.name} — {getVerdictLabel(activeCase.verdict)}</span>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                className="sidebar-icon-btn"
                onClick={() => duplicateTestCase(activeCase.id)}
                title="Duplicate"
              >
                <VscCopy />
              </button>
              <button
                className="sidebar-icon-btn"
                onClick={() => removeTestCase(activeCase.id)}
                title="Delete"
              >
                <VscTrash />
              </button>
            </div>
          </div>
          <div className="testcase-fields">
            <div className="testcase-field">
              <div className="testcase-field-label">Input</div>
              <textarea
                value={activeCase.input}
                onChange={(e) => updateTestCase(activeCase.id, { input: e.target.value })}
                placeholder="Enter input..."
                spellCheck={false}
              />
            </div>
            <div className="testcase-field">
              <div className="testcase-field-label">Expected Output</div>
              <textarea
                value={activeCase.expectedOutput}
                onChange={(e) => updateTestCase(activeCase.id, { expectedOutput: e.target.value })}
                placeholder="Expected output..."
                spellCheck={false}
              />
            </div>
            <div className="testcase-field">
              <div className="testcase-field-label">Actual Output</div>
              <textarea
                value={activeCase.actualOutput ?? ''}
                readOnly
                placeholder="Run to see output"
                style={{ opacity: activeCase.actualOutput ? 1 : 0.5 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getVerdictClass(verdict: Verdict): string {
  switch (verdict) {
    case 'accepted':
      return 'accepted';
    case 'wrong-answer':
      return 'wrong-answer';
    case 'time-limit-exceeded':
      return 'tle';
    case 'runtime-error':
    case 'compilation-error':
      return 'runtime-error';
    default:
      return 'pending';
  }
}

function getVerdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case 'accepted':
      return 'Accepted ✓';
    case 'wrong-answer':
      return 'Wrong Answer ✗';
    case 'time-limit-exceeded':
      return 'Time Limit Exceeded';
    case 'runtime-error':
      return 'Runtime Error';
    case 'compilation-error':
      return 'Compilation Error';
    case 'running':
      return 'Running...';
    default:
      return 'Pending';
  }
}
