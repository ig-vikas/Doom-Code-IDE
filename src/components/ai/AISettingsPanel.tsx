import { useEffect, useState } from 'react';
import { AI_PROVIDERS } from '../../config/aiModels';
import { useAIStore } from '../../stores/aiStore';
import { useNotificationStore } from '../../stores';
import type { AIProvider } from '../../types/ai';
import AIActivityLog from './AIActivityLog';
import APIKeyInput from './APIKeyInput';
import './AISettingsPanel.css';

export default function AISettingsPanel() {
  const config = useAIStore((state) => state.config);
  const stats = useAIStore((state) => state.stats);
  const connectionStatus = useAIStore((state) => state.connectionStatus);
  const setEnabled = useAIStore((state) => state.setEnabled);
  const setProvider = useAIStore((state) => state.setProvider);
  const setModel = useAIStore((state) => state.setModel);
  const updateProviderConfig = useAIStore((state) => state.updateProviderConfig);
  const updateCompletionSettings = useAIStore((state) => state.updateCompletionSettings);
  const updateContextSettings = useAIStore((state) => state.updateContextSettings);
  const updateUISettings = useAIStore((state) => state.updateUISettings);
  const testConnection = useAIStore((state) => state.testConnection);
  const refreshOllamaModels = useAIStore((state) => state.refreshOllamaModels);
  const resetStats = useAIStore((state) => state.resetStats);
  const resetConfig = useAIStore((state) => state.resetConfig);
  const notify = useNotificationStore((state) => state);

  const [activeTab, setActiveTab] = useState<AIProvider>(config.activeProvider);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; message?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [customHeadersText, setCustomHeadersText] = useState(JSON.stringify(config.providers.custom.headers, null, 2));

  const provider = AI_PROVIDERS[activeTab];

  useEffect(() => {
    setActiveTab(config.activeProvider);
  }, [config.activeProvider]);

  useEffect(() => {
    setCustomHeadersText(JSON.stringify(config.providers.custom.headers, null, 2));
  }, [config.providers.custom.headers]);

  useEffect(() => {
    if (activeTab === 'ollama') {
      refreshOllamaModels().catch(() => undefined);
    }
  }, [activeTab, refreshOllamaModels]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testConnection(activeTab);
      setTestResult(result);
      if (result.success) {
        notify.success(result.message ?? 'Connection successful.');
      } else {
        notify.error(result.error ?? 'Connection failed.');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleProviderChange = (providerId: AIProvider) => {
    setActiveTab(providerId);
    setProvider(providerId);
    setTestResult(null);
  };

  const handleCustomHeadersSave = () => {
    try {
      const parsed = JSON.parse(customHeadersText || '{}') as Record<string, string>;
      updateProviderConfig('custom', { headers: parsed });
      notify.success('Custom headers updated.');
    } catch (error) {
      notify.error('Headers must be valid JSON.', String(error));
    }
  };

  const acceptRate = stats.totalRequests > 0
    ? ((stats.acceptedCompletions / stats.totalRequests) * 100).toFixed(1)
    : '0.0';

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all AI settings to defaults? This will not delete your API keys.')) {
      resetConfig();
      notify.success('AI settings reset to defaults');
    }
  };

  return (
    <div className="ai-settings-panel">
      <div className="settings-header">
        <h2>AI Code Completion</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="reset-settings-btn" 
            onClick={handleResetSettings}
            title="Reset all AI settings to defaults"
          >
            Reset Settings
          </button>
          <label className="ai-enable-toggle">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Enable AI Completions</span>
          </label>
        </div>
      </div>

      <div className="provider-tabs-container">
        <div className="provider-tabs">
          {(Object.entries(AI_PROVIDERS) as [AIProvider, (typeof AI_PROVIDERS)[AIProvider]][]).map(([id, currentProvider]) => (
            <button
              key={id}
              type="button"
              className={`provider-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => handleProviderChange(id)}
            >
              <span className="provider-icon">{currentProvider.icon}</span>
              <span className="provider-name">{currentProvider.displayName}</span>
              <span className={`connection-status ${connectionStatus[id]}`}></span>
            </button>
          ))}
        </div>
      </div>

      <div className="ai-settings-content">
        <div className="settings-section">
          <h3>Provider Settings</h3>

          {provider.requiresApiKey ? (
            <>
              <h4 className="section-subtitle">API Key</h4>
              <APIKeyInput provider={activeTab} />

              <div className="connection-test">
                <button
                  type="button"
                  className={`test-btn ${isTesting ? 'testing' : ''}`}
                  onClick={() => void handleTestConnection()}
                  disabled={isTesting}
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>

                {testResult ? (
                  <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                    {testResult.success
                      ? `OK: ${testResult.message ?? 'Connected successfully'}`
                      : `Error: ${testResult.error ?? 'Connection failed'}`}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="provider-note">Ollama runs locally and does not require an API key.</div>
          )}
        </div>

        {activeTab === 'ollama' ? (
          <div className="settings-section">
            <h3>Ollama Server</h3>
            <div className="setting-row">
              <label>Base URL</label>
              <input
                type="text"
                value={config.providers.ollama.baseUrl}
                onChange={(event) => updateProviderConfig('ollama', { baseUrl: event.target.value })}
                placeholder="http://localhost:11434"
              />
            </div>
            <button
              type="button"
              className="refresh-btn"
              onClick={() => void refreshOllamaModels()}
            >
              Refresh Available Models
            </button>
            {config.providers.ollama.availableModels.length > 0 ? (
              <p className="hint">Found {config.providers.ollama.availableModels.length} model(s)</p>
            ) : null}
          </div>
        ) : null}

        <div className="settings-section">
          <h3>Model</h3>

          {activeTab === 'openrouter' ? (
            <div className="openrouter-model-input">
              <input
                type="text"
                value={config.providers.openrouter.modelId}
                onChange={(event) => {
                  updateProviderConfig('openrouter', {
                    modelId: event.target.value,
                    customModelInput: event.target.value,
                  });
                  setModel(event.target.value);
                }}
                placeholder="e.g. anthropic/claude-3.5-sonnet"
              />
              <p className="hint">
                Enter any model ID from{' '}
                <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer">
                  OpenRouter Models
                </a>
              </p>

              <div className="quick-models">
                <span className="quick-label">Quick select:</span>
                {['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'mistralai/codestral-latest'].map((modelId) => (
                  <button
                    key={modelId}
                    type="button"
                    className="quick-model-btn"
                    onClick={() => {
                      updateProviderConfig('openrouter', {
                        modelId,
                        customModelInput: modelId,
                      });
                      setModel(modelId);
                    }}
                  >
                    {modelId.split('/').pop()}
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === 'huggingface' ? (
            <div className="openrouter-model-input">
              <input
                type="text"
                value={config.providers.huggingface.modelId}
                onChange={(event) => {
                  const modelId = event.target.value;
                  updateProviderConfig('huggingface', { modelId });
                  setModel(modelId);
                }}
                list="huggingface-model-options"
                placeholder="e.g. Qwen/Qwen2.5-Coder-32B-Instruct"
              />
              <datalist id="huggingface-model-options">
                {provider.models.map((model) => (
                  <option key={model.id} value={model.id}>{model.displayName}</option>
                ))}
              </datalist>
              <p className="hint">
                Enter any Hugging Face model ID or pick one from suggestions.
              </p>

              <div className="quick-models">
                <span className="quick-label">Quick select:</span>
                {[
                  'Qwen/Qwen2.5-Coder-32B-Instruct',
                  'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct',
                  'mistralai/Mistral-Nemo-Instruct-2407',
                ].map((modelId) => (
                  <button
                    key={modelId}
                    type="button"
                    className="quick-model-btn"
                    onClick={() => {
                      updateProviderConfig('huggingface', { modelId });
                      setModel(modelId);
                    }}
                  >
                    {modelId.split('/').pop()}
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === 'ollama' ? (
            <select
              value={config.providers.ollama.model}
              onChange={(event) => {
                updateProviderConfig('ollama', { model: event.target.value });
                setModel(event.target.value);
              }}
            >
              {config.providers.ollama.availableModels.length === 0 ? (
                <option value="">No models found - click refresh</option>
              ) : (
                config.providers.ollama.availableModels.map((modelId) => (
                  <option key={modelId} value={modelId}>{modelId}</option>
                ))
              )}
            </select>
          ) : activeTab === 'custom' ? (
            <div className="custom-provider-grid">
              <div className="setting-row">
                <label>Name</label>
                <input
                  type="text"
                  value={config.providers.custom.name}
                  onChange={(event) => updateProviderConfig('custom', { name: event.target.value })}
                />
              </div>
              <div className="setting-row">
                <label>Base URL</label>
                <input
                  type="text"
                  value={config.providers.custom.baseUrl}
                  onChange={(event) => updateProviderConfig('custom', { baseUrl: event.target.value })}
                />
              </div>
              <div className="setting-row">
                <label>Model ID</label>
                <input
                  type="text"
                  value={config.providers.custom.modelId}
                  onChange={(event) => {
                    updateProviderConfig('custom', { modelId: event.target.value });
                    setModel(event.target.value);
                  }}
                />
              </div>
              <div className="setting-row">
                <label>Request Template</label>
                <select
                  value={config.providers.custom.requestTemplate}
                  onChange={(event) => updateProviderConfig('custom', {
                    requestTemplate: event.target.value as typeof config.providers.custom.requestTemplate,
                  })}
                >
                  <option value="openai">OpenAI format</option>
                  <option value="anthropic">Anthropic format</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="stacked-row">
                <label>Custom Headers (JSON)</label>
                <textarea
                  rows={6}
                  value={customHeadersText}
                  onChange={(event) => setCustomHeadersText(event.target.value)}
                />
              </div>
              <button type="button" className="refresh-btn" onClick={handleCustomHeadersSave}>
                Save Headers
              </button>
            </div>
          ) : activeTab === 'google' ? (
            <div className="openrouter-model-input">
              <input
                type="text"
                value={config.providers.google.model}
                onChange={(event) => {
                  const modelId = event.target.value;
                  updateProviderConfig('google', { model: modelId });
                  setModel(modelId);
                }}
                list="google-model-options"
                placeholder="e.g. gemini-3-flash-preview"
              />
              <datalist id="google-model-options">
                {provider.models.map((model) => (
                  <option key={model.id} value={model.id}>{model.displayName}</option>
                ))}
              </datalist>
              <p className="hint">Type any Gemini model ID or pick one from the suggestions.</p>

              <div className="quick-models">
                <span className="quick-label">Quick select:</span>
                {['gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro'].map((modelId) => (
                  <button
                    key={modelId}
                    type="button"
                    className="quick-model-btn"
                    onClick={() => {
                      updateProviderConfig('google', { model: modelId });
                      setModel(modelId);
                    }}
                  >
                    {modelId}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <select
              value={config.activeModelId}
              onChange={(event) => {
                const nextModel = event.target.value;
                setModel(nextModel);
                if (activeTab === 'deepseek') {
                  updateProviderConfig('deepseek', { model: nextModel as typeof config.providers.deepseek.model });
                }
              }}
            >
              {provider.models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.displayName} {model.recommended ? '*' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {activeTab === 'deepseek' ? (
          <div className="settings-section">
            <h3>DeepSeek Options</h3>
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={config.providers.deepseek.useFIM}
                onChange={(event) => updateProviderConfig('deepseek', { useFIM: event.target.checked })}
              />
              <span>Use Fill-in-Middle (FIM) for better mid-line completions</span>
            </label>
          </div>
        ) : null}

        {activeTab === 'google' ? (
          <div className="settings-section">
            <h3>Google AI Options</h3>
            <div className="setting-row">
              <label>Safety Settings</label>
              <select
                value={config.providers.google.safetySettings}
                onChange={(event) => updateProviderConfig('google', {
                  safetySettings: event.target.value as typeof config.providers.google.safetySettings,
                })}
              >
                <option value="none">None (Recommended for code)</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        ) : null}

        <div className="settings-section">
          <h3>Completion Behavior</h3>

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.completion.autoTrigger}
              onChange={(event) => updateCompletionSettings({ autoTrigger: event.target.checked })}
            />
            <span>Auto-trigger completions while typing</span>
          </label>

          <div className="setting-row">
            <label>Trigger Delay (ms)</label>
            <input
              type="number"
              min={100}
              max={2000}
              step={50}
              value={config.completion.triggerDelay}
              onChange={(event) => updateCompletionSettings({ triggerDelay: Number(event.target.value) })}
            />
          </div>

          <div className="setting-row">
            <label>Max Tokens</label>
            <input
              type="number"
              min={32}
              max={1024}
              step={32}
              value={config.completion.maxTokens}
              onChange={(event) => updateCompletionSettings({ maxTokens: Number(event.target.value) })}
            />
          </div>

          <div className="setting-row range-row">
            <label>Temperature <span className="value-display">{config.completion.temperature}</span></label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={config.completion.temperature}
              onChange={(event) => updateCompletionSettings({ temperature: Number(event.target.value) })}
            />
          </div>

          <div className="setting-row range-row">
            <label>Top P <span className="value-display">{config.completion.topP}</span></label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.completion.topP}
              onChange={(event) => updateCompletionSettings({ topP: Number(event.target.value) })}
            />
          </div>

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.completion.multiLineEnabled}
              onChange={(event) => updateCompletionSettings({ multiLineEnabled: event.target.checked })}
            />
            <span>Enable multi-line suggestions</span>
          </label>

          <div className="setting-row">
            <label>Accept Key</label>
            <select
              value={config.completion.acceptKey}
              onChange={(event) => updateCompletionSettings({
                acceptKey: event.target.value as typeof config.completion.acceptKey,
              })}
            >
              <option value="tab">Tab</option>
              <option value="enter">Enter</option>
              <option value="ctrl+enter">Ctrl+Enter</option>
            </select>
          </div>

          <div className="setting-row">
            <label>Partial Accept Key</label>
            <select
              value={config.completion.partialAcceptKey}
              onChange={(event) => updateCompletionSettings({
                partialAcceptKey: event.target.value as typeof config.completion.partialAcceptKey,
              })}
            >
              <option value="ctrl+right">Ctrl+Right</option>
              <option value="alt+right">Alt+Right</option>
            </select>
          </div>

          <div className="stacked-row">
            <label>Stop Sequences</label>
            <input
              type="text"
              value={config.completion.stopSequences.join(', ')}
              onChange={(event) => updateCompletionSettings({
                stopSequences: event.target.value.split(',').map((value) => value.trim()).filter(Boolean),
              })}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Context Settings</h3>

          <div className="setting-row">
            <label>Context Lines (before/after cursor)</label>
            <input
              type="number"
              min={10}
              max={500}
              step={10}
              value={config.context.maxContextLines}
              onChange={(event) => updateContextSettings({ maxContextLines: Number(event.target.value) })}
            />
          </div>

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.context.includeOpenFiles}
              onChange={(event) => updateContextSettings({ includeOpenFiles: event.target.checked })}
            />
            <span>Include content from other open files</span>
          </label>

          {config.context.includeOpenFiles ? (
            <div className="setting-row indented">
              <label>Max open files to include</label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.context.maxOpenFilesContext}
                onChange={(event) => updateContextSettings({ maxOpenFilesContext: Number(event.target.value) })}
              />
            </div>
          ) : null}

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.context.includeImports}
              onChange={(event) => updateContextSettings({ includeImports: event.target.checked })}
            />
            <span>Analyze and include imports</span>
          </label>

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.context.prioritizeRelatedFiles}
              onChange={(event) => updateContextSettings({ prioritizeRelatedFiles: event.target.checked })}
            />
            <span>Prioritize related files (same directory, same extension)</span>
          </label>

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.context.includeFileTree}
              onChange={(event) => updateContextSettings({ includeFileTree: event.target.checked })}
            />
            <span>Include project structure in context</span>
          </label>
        </div>

        <div className="settings-section">
          <h3>Display Settings</h3>

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.ui.showStatusInTopBar}
              onChange={(event) => updateUISettings({ showStatusInTopBar: event.target.checked })}
            />
            <span>Show AI status in top bar</span>
          </label>

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.ui.showInlineHints}
              onChange={(event) => updateUISettings({ showInlineHints: event.target.checked })}
            />
            <span>Show inline hints (&quot;Tab to accept&quot;)</span>
          </label>

          <div className="setting-row range-row">
            <label>Ghost Text Opacity <span className="value-display">{config.ui.ghostTextOpacity}</span></label>
            <input
              type="range"
              min={0.2}
              max={0.8}
              step={0.1}
              value={config.ui.ghostTextOpacity}
              onChange={(event) => updateUISettings({ ghostTextOpacity: Number(event.target.value) })}
            />
          </div>

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.ui.showTokenCount}
              onChange={(event) => updateUISettings({ showTokenCount: event.target.checked })}
            />
            <span>Show token count estimates</span>
          </label>

          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={config.ui.showCostEstimate}
              onChange={(event) => updateUISettings({ showCostEstimate: event.target.checked })}
            />
            <span>Show cost estimates</span>
          </label>
        </div>

        <div className="settings-section">
          <h3>Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Requests</span>
              <span className="stat-value">{stats.totalRequests}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Accepted</span>
              <span className="stat-value">{stats.acceptedCompletions}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Rejected</span>
              <span className="stat-value">{stats.rejectedCompletions}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Tokens</span>
              <span className="stat-value">{stats.totalTokens.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Cost</span>
              <span className="stat-value">${stats.totalCost.toFixed(4)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Accept Rate</span>
              <span className="stat-value">{acceptRate}%</span>
            </div>
          </div>
          <button type="button" className="reset-stats-btn" onClick={resetStats}>
            Reset Statistics
          </button>
        </div>

        <div className="settings-section">
          <h3>Activity Log</h3>
          <AIActivityLog />
        </div>
      </div>
    </div>
  );
}
