import { useState } from 'react';
import { useAIStore } from '../../stores/aiStore';
import './AIActivityLog.css';

export function AIActivityLog() {
  const logs = useAIStore((state) => state.activityLog);
  const clearActivityLog = useAIStore((state) => state.clearActivityLog);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`ai-activity-log ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="log-header-wrapper">
        <button
          type="button"
          className="log-header"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="log-title">AI Activity</span>
          <span className="log-count">{logs.length}</span>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </button>
        {logs.length > 0 && (
          <button 
            type="button" 
            className="clear-log-btn-header" 
            onClick={clearActivityLog}
            title="Clear Activity Log"
          >
            Clear Log
          </button>
        )}
      </div>

      {isExpanded ? (
        <div className="log-content">
          {logs.length === 0 ? (
            <div className="log-empty">No activity yet</div>
          ) : (
            <>
              {logs.map((log) => (
                <div key={log.id} className={`log-entry log-${log.type}`}>
                  <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default AIActivityLog;
