import { useMemo, useState } from 'react';
import { AI_PROVIDERS } from '../../config/aiModels';
import { useAIStore } from '../../stores/aiStore';
import { useNotificationStore, useUIStore } from '../../stores';
import type { AIProvider, ModelCapability } from '../../types/ai';
import './ModelSelector.css';

interface ModelSelectorProps {
  onClose: () => void;
}

export default function ModelSelector({ onClose }: ModelSelectorProps) {
  const config = useAIStore((state) => state.config);
  const setProvider = useAIStore((state) => state.setProvider);
  const setModel = useAIStore((state) => state.setModel);
  const updateProviderConfig = useAIStore((state) => state.updateProviderConfig);
  const connectionStatus = useAIStore((state) => state.connectionStatus);
  const testConnection = useAIStore((state) => state.testConnection);
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);
  const notify = useNotificationStore((state) => state);

  const [searchQuery, setSearchQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const provider = AI_PROVIDERS[config.activeProvider];

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) {
      return provider.models;
    }

    const query = searchQuery.toLowerCase();
    return provider.models.filter((model) => {
      return (
        model.displayName.toLowerCase().includes(query)
        || model.name.toLowerCase().includes(query)
        || model.id.toLowerCase().includes(query)
      );
    });
  }, [provider.models, searchQuery]);

  const showCustomModelOption = provider.customModelAllowed
    && searchQuery.trim().length > 0
    && !provider.models.some((model) => model.id === searchQuery.trim());

  const handleProviderChange = (providerId: AIProvider) => {
    setProvider(providerId);
    setSearchQuery('');
  };

  const syncProviderModel = (providerId: AIProvider, modelId: string) => {
    switch (providerId) {
      case 'openrouter':
        updateProviderConfig('openrouter', {
          modelId,
          customModelInput: modelId,
        });
        break;
      case 'deepseek':
        updateProviderConfig('deepseek', {
          model: modelId as typeof config.providers.deepseek.model,
        });
        break;
      case 'google':
        updateProviderConfig('google', {
          model: modelId as typeof config.providers.google.model,
        });
        break;
      case 'huggingface':
        updateProviderConfig('huggingface', { modelId });
        break;
      case 'ollama':
        updateProviderConfig('ollama', { model: modelId });
        break;
      case 'custom':
        updateProviderConfig('custom', { modelId });
        break;
      default:
        break;
    }
  };

  const handleModelSelect = (modelId: string) => {
    syncProviderModel(config.activeProvider, modelId);
    setModel(modelId);
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testConnection(config.activeProvider);
      if (result.success) {
        notify.success(result.message ?? 'Connection successful.');
      } else {
        notify.error(result.error ?? 'Connection failed.');
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="model-selector-dropdown">
      <div className="provider-tabs">
        {(Object.entries(AI_PROVIDERS) as [AIProvider, (typeof AI_PROVIDERS)[AIProvider]][]).map(([id, currentProvider]) => (
          <button
            key={id}
            type="button"
            className={`provider-tab ${config.activeProvider === id ? 'active' : ''}`}
            onClick={() => handleProviderChange(id)}
          >
            <span className="provider-icon">{currentProvider.icon}</span>
            <span className="provider-name">{currentProvider.displayName}</span>
            <span className={`connection-dot ${connectionStatus[id]}`} title={connectionStatus[id]} />
          </button>
        ))}
      </div>

      <div className="model-search">
        <input
          type="text"
          placeholder={provider.customModelAllowed ? 'Search or type a model ID...' : 'Search models...'}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          autoFocus
        />
      </div>

      {config.activeProvider === 'openrouter' && config.providers.openrouter.recentModels.length > 0 ? (
        <div className="openrouter-section">
          <div className="recent-models">
            <div className="section-label">Recently Used</div>
            {config.providers.openrouter.recentModels.slice(0, 5).map((modelId) => (
              <button
                key={modelId}
                type="button"
                className={`model-item compact ${config.activeModelId === modelId ? 'selected' : ''}`}
                onClick={() => handleModelSelect(modelId)}
              >
                <span className="model-id">{modelId}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="model-list">
        {showCustomModelOption ? (
          <>
            <div className="section-label">Custom Model</div>
            <button
              type="button"
              className="model-item selected-candidate"
              onClick={() => handleModelSelect(searchQuery.trim())}
            >
              <div className="model-header">
                <span className="model-display-name">Use custom model</span>
              </div>
              <div className="model-meta">
                <span className="model-id">{searchQuery.trim()}</span>
              </div>
            </button>
          </>
        ) : null}

        {filteredModels.length > 0 ? (
          <div className="section-label">
            {config.activeProvider === 'openrouter' ? 'Popular Models' : 'Available Models'}
          </div>
        ) : null}

        {filteredModels.map((model) => (
          <button
            key={model.id}
            type="button"
            className={`model-item ${config.activeModelId === model.id ? 'selected' : ''}`}
            onClick={() => handleModelSelect(model.id)}
          >
            <div className="model-header">
              <span className="model-display-name">
                {model.displayName}
                {model.recommended ? <span className="recommended-badge" title="Recommended">*</span> : null}
              </span>
              {model.costPer1kInput !== undefined && model.costPer1kInput > 0 ? (
                <span className="model-cost" title="Cost per 1K input tokens">
                  ${model.costPer1kInput.toFixed(4)}/1K
                </span>
              ) : null}
              {model.costPer1kInput === 0 ? (
                <span className="model-cost free" title="Free tier available">FREE</span>
              ) : null}
            </div>
            <div className="model-meta">
              <span className="model-context">{formatContextWindow(model.contextWindow)}</span>
              {model.description ? <span className="model-description">{model.description}</span> : null}
            </div>
            <div className="model-capabilities">
              {model.capabilities.map((capability) => (
                <span key={capability} className={`capability-badge ${capability}`} title={capability}>
                  {getCapabilityIcon(capability)}
                </span>
              ))}
            </div>
          </button>
        ))}

        {filteredModels.length === 0 && !showCustomModelOption ? (
          <div className="no-models">
            {searchQuery.trim() ? 'No models found' : 'No models available'}
          </div>
        ) : null}
      </div>

      <div className="selector-footer">
        <button
          type="button"
          className={`test-connection-btn ${isTesting ? 'testing' : ''}`}
          onClick={() => void handleTestConnection()}
          disabled={isTesting}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          type="button"
          className="settings-btn"
          onClick={() => {
            onClose();
            setSettingsOpen(true);
          }}
        >
          Settings
        </button>
      </div>
    </div>
  );
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return `${tokens}`;
}

function getCapabilityIcon(capability: ModelCapability): string {
  const icons: Record<ModelCapability, string> = {
    'code-completion': '</>',
    chat: 'msg',
    fim: 'fim',
    vision: 'vis',
    'function-calling': 'fn',
    reasoning: 'rsn',
  };

  return icons[capability] ?? '.';
}
