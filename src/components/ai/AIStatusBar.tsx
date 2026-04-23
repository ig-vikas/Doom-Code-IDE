import { useEffect, useRef, useState } from 'react';
import { VscChevronDown, VscSparkle } from 'react-icons/vsc';
import { AI_PROVIDERS } from '../../config/aiModels';
import { useAIStatus } from '../../hooks/useAIStatus';
import { useAIStore } from '../../stores/aiStore';
import ModelSelector from './ModelSelector';
import TokenCostIndicator from './TokenCostIndicator';
import './AIStatusBar.css';

const statusConfig = {
  idle: { color: 'var(--accent-green)', text: 'Ready' },
  loading: { color: 'var(--accent-yellow)', text: 'Loading...' },
  streaming: { color: 'var(--accent-blue)', text: 'Generating...' },
  error: { color: 'var(--accent-red)', text: 'Error' },
  disabled: { color: 'var(--text-muted)', text: 'Disabled' },
  'no-api-key': { color: 'var(--accent-orange)', text: 'No API Key' },
} as const;

export function AIStatusBar() {
  const [showSelector, setShowSelector] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const config = useAIStore((state) => state.config);
  const setEnabled = useAIStore((state) => state.setEnabled);
  const { status, connectionStatus, isWorking } = useAIStatus();

  const provider = AI_PROVIDERS[config.activeProvider];
  const currentModel = provider?.models.find((model) => model.id === config.activeModelId);
  const modelDisplayName = currentModel?.displayName
    || (config.activeProvider === 'openrouter'
      ? config.providers.openrouter.modelId.split('/').pop()
      : config.activeProvider === 'huggingface'
        ? config.providers.huggingface.modelId.split('/').pop()
        : config.activeModelId);

  const currentStatus = statusConfig[status];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setShowSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!config.ui.showStatusInTopBar) {
    return null;
  }

  return (
    <div className="ai-status-bar">
      <button
        type="button"
        className={`ai-toggle ${config.enabled ? 'enabled' : 'disabled'}`}
        onClick={() => setEnabled(!config.enabled)}
        title={config.enabled ? 'Disable AI completions' : 'Enable AI completions'}
      >
        <VscSparkle className="ai-icon" />
        <span className="ai-label">{config.enabled ? 'ON' : 'OFF'}</span>
      </button>

      {config.enabled ? (
        <>
          <div className="ai-model-selector-container" ref={selectorRef}>
            <button
              type="button"
              className="ai-model-button"
              onClick={() => setShowSelector(!showSelector)}
              title={`${provider?.displayName}: ${modelDisplayName}`}
            >
              <span className="provider-icon">{provider?.icon}</span>
              <span className="provider-name">{provider?.displayName}</span>
              <span className="model-separator">:</span>
              <span className="model-name">{modelDisplayName}</span>
              <VscChevronDown className="dropdown-arrow" />
            </button>

            {showSelector ? <ModelSelector onClose={() => setShowSelector(false)} /> : null}
          </div>

          <div
            className={`ai-status-indicator status-${status}`}
            title={`${currentStatus.text}${connectionStatus === 'error' ? ' - Connection Error' : ''}`}
          >
            <span className="status-dot" style={{ backgroundColor: currentStatus.color }} />
            {isWorking ? <span className="status-text">{currentStatus.text}</span> : null}
          </div>

          <TokenCostIndicator />
        </>
      ) : null}
    </div>
  );
}

export default AIStatusBar;
