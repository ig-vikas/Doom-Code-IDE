import { useBuildStore } from '../stores';

export default function OutputPanel() {
  const compileResult = useBuildStore((s) => s.compileResult);
  const compiling = useBuildStore((s) => s.compiling);

  if (compiling) {
    return (
      <div className="output-panel">
        <span style={{ color: 'var(--accent-blue)' }}>Compiling...</span>
        <div className="spinner" style={{ marginTop: 8 }} />
      </div>
    );
  }

  if (!compileResult) {
    return (
      <div className="output-panel" style={{ color: 'var(--text-faint)' }}>
        No output yet. Press Ctrl+B or click Run to build and run.
      </div>
    );
  }

  return (
    <div className="output-panel">
      {compileResult.success ? (
        <div>
          <span className="output-success">Compilation successful</span>
          {compileResult.warnings && compileResult.warnings.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span className="output-warning">Warnings:</span>
              {compileResult.warnings.map((w, i) => (
                <div key={i} className="output-warning" style={{ paddingLeft: 16 }}>
                  {w}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <span className="output-error">Compilation failed</span>
          {compileResult.errors && compileResult.errors.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {compileResult.errors.map((err, i) => (
                <div key={i} className="output-error" style={{ marginTop: 4 }}>
                  {err.file && (
                    <span style={{ color: 'var(--accent-cyan)' }}>
                      {err.file}:{err.line}:{err.column}:{' '}
                    </span>
                  )}
                  <span style={{ color: 'var(--accent-red)' }}>{err.severity}: </span>
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          )}
          {compileResult.rawOutput && (
            <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
              {compileResult.rawOutput}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
