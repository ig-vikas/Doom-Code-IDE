import { useAIStore } from '../../stores/aiStore';
import './TokenCostIndicator.css';

export function TokenCostIndicator() {
  const config = useAIStore((state) => state.config);
  const lastCompletion = useAIStore((state) => state.lastCompletion);
  const status = useAIStore((state) => state.status);

  if (!config.ui.showTokenCount && !config.ui.showCostEstimate) {
    return null;
  }

  if (!lastCompletion || status === 'disabled') {
    return null;
  }

  const { usage, timing } = lastCompletion;

  return (
    <div className="token-cost-indicator">
      {config.ui.showTokenCount && usage ? (
        <div className="indicator-item">
          <span className="indicator-label">Tokens:</span>
          <span className="indicator-value">{usage.totalTokens.toLocaleString()}</span>
        </div>
      ) : null}

      {config.ui.showCostEstimate && usage?.estimatedCost !== undefined ? (
        <div className="indicator-item">
          <span className="indicator-label">Cost:</span>
          <span className="indicator-value">${usage.estimatedCost.toFixed(6)}</span>
        </div>
      ) : null}

      {timing ? (
        <div className="indicator-item">
          <span className="indicator-label">Latency:</span>
          <span className="indicator-value">{timing.latencyMs}ms</span>
        </div>
      ) : null}
    </div>
  );
}

export default TokenCostIndicator;
