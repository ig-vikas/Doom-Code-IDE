import { useAIStore } from '../../stores/aiStore';
import './StatsDisplay.css';

export default function StatsDisplay() {
  const stats = useAIStore((state) => state.stats);
  const resetStats = useAIStore((state) => state.resetStats);
  const acceptanceRate = stats.totalRequests > 0 ? Math.round((stats.acceptedCompletions / stats.totalRequests) * 100) : 0;

  return (
    <div className="ai-stats-display">
      <div className="ai-stats-grid">
        <div className="ai-stat-card">
          <span className="ai-stat-value">{stats.totalRequests}</span>
          <span className="ai-stat-label">Requests</span>
        </div>
        <div className="ai-stat-card">
          <span className="ai-stat-value">{stats.totalTokens}</span>
          <span className="ai-stat-label">Tokens</span>
        </div>
        <div className="ai-stat-card">
          <span className="ai-stat-value">{stats.totalCost.toFixed(4)}</span>
          <span className="ai-stat-label">Cost (USD)</span>
        </div>
        <div className="ai-stat-card">
          <span className="ai-stat-value">{acceptanceRate}%</span>
          <span className="ai-stat-label">Acceptance</span>
        </div>
      </div>
      <button type="button" className="ai-secondary-btn" onClick={resetStats}>Reset Stats</button>
    </div>
  );
}

