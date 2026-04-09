import { useState, useEffect } from 'react';
import { useAIStore } from '../../stores/aiStore';
import { useEditorStore } from '../../stores/editorStore';
import { getActiveEditor, getActiveMonaco } from '../../services/commandService';

interface AIDebugPanelProps {
  onClose: () => void;
}

export default function AIDebugPanel({ onClose }: AIDebugPanelProps) {
  const [diagnostics, setDiagnostics] = useState<Record<string, any>>({});

  const aiConfig = useAIStore((state) => state.config);
  const status = useAIStore((state) => state.status);
  const availableApiKeys = useAIStore((state) => state.availableApiKeys);
  const pendingSuggestion = useAIStore((state) => state.pendingSuggestion);
  const currentRequest = useAIStore((state) => state.currentRequest);
  const lastCompletion = useAIStore((state) => state.lastCompletion);

  useEffect(() => {
    const runDiagnostics = () => {
      const editorStore = useEditorStore.getState();
      const activeTab = editorStore.getActiveTab();
      const activeEditor = getActiveEditor();
      const activeMonaco = getActiveMonaco();

      const allModels = activeMonaco?.editor?.getModels?.() || [];
      const modelPaths = allModels.map((m: any) => m?.uri?.path || m?.uri?.toString?.() || 'unknown');

      setDiagnostics({
        // AI Config
        aiEnabled: aiConfig.enabled,
        activeProvider: aiConfig.activeProvider,
        activeModel: aiConfig.activeModelId,
        aiStatus: status,
        hasApiKey: availableApiKeys[aiConfig.activeProvider],
        autoTrigger: aiConfig.completion.autoTrigger,
        triggerDelay: aiConfig.completion.triggerDelay,
        maxTokens: aiConfig.completion.maxTokens,

        // Editor State
        hasActiveTab: !!activeTab,
        activeTabId: activeTab?.id,
        activeTabPath: activeTab?.path,
        activeTabLanguage: activeTab?.language,
        hasActiveEditor: !!activeEditor,
        hasActiveMonaco: !!activeMonaco,
        editorPosition: activeEditor?.getPosition?.(),
        
        // Monaco Models
        totalMonacoModels: allModels.length,
        monacoModelPaths: modelPaths,

        // Completion State
        hasPendingSuggestion: !!pendingSuggestion,
        pendingSuggestionText: pendingSuggestion?.text?.substring(0, 50),
        hasCurrentRequest: !!currentRequest,
        currentRequestId: currentRequest?.id,
        lastCompletionError: lastCompletion?.error?.message,
        lastCompletionProvider: lastCompletion?.provider,
        lastCompletionModel: lastCompletion?.modelId,
      });
    };

    runDiagnostics();
    const interval = setInterval(runDiagnostics, 1000);
    return () => clearInterval(interval);
  }, [aiConfig, status, availableApiKeys, pendingSuggestion, currentRequest, lastCompletion]);

  const testManualTrigger = () => {
    const editor = getActiveEditor();
    const position = editor?.getPosition();
    if (position) {
      console.log('[AI Debug] Manual trigger test at position:', position);
      // This would need to be connected to the completion engine
      alert(`Manual trigger test at line ${position.lineNumber}, column ${position.column}`);
    } else {
      alert('No active editor or cursor position');
    }
  };

  const checkMonacoModels = () => {
    const monaco = getActiveMonaco();
    const models = monaco?.editor?.getModels?.() || [];
    console.log('[AI Debug] Monaco models:', models);
    console.log('[AI Debug] Model details:', models.map((m: any) => ({
      uri: m?.uri?.toString?.(),
      path: m?.uri?.path,
      language: m?.getLanguageId?.(),
      lineCount: m?.getLineCount?.(),
    })));
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: '400px',
        maxHeight: '600px',
        background: '#1e1e1e',
        color: '#d4d4d4',
        border: '1px solid #3c3c3c',
        borderRadius: '4px',
        padding: '12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        overflow: 'auto',
        zIndex: 10000,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <strong>AI Inline Completion Debug</strong>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            color: '#d4d4d4',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={testManualTrigger}
          style={{
            padding: '4px 8px',
            marginRight: '8px',
            background: '#0e639c',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Test Manual Trigger
        </button>
        <button
          onClick={checkMonacoModels}
          style={{
            padding: '4px 8px',
            background: '#0e639c',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Check Monaco Models
        </button>
      </div>

      <div style={{ display: 'grid', gap: '4px' }}>
        {Object.entries(diagnostics).map(([key, value]) => {
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          const isError = key.includes('Error') || (key.includes('has') && value === false) || value === 'error' || value === 'disabled' || value === 'no-api-key';
          const isGood = (key.includes('has') && value === true) || value === 'idle' || value === true;

          return (
            <div key={key} style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#569cd6', minWidth: '180px' }}>{key}:</span>
              <span
                style={{
                  color: isError ? '#f48771' : isGood ? '#4ec9b0' : '#d4d4d4',
                  wordBreak: 'break-all',
                }}
              >
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '12px', padding: '8px', background: '#252526', borderRadius: '3px' }}>
        <div style={{ marginBottom: '4px', color: '#569cd6' }}>Quick Checks:</div>
        <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
          {!aiConfig.enabled && <div style={{ color: '#f48771' }}>❌ AI is disabled</div>}
          {!availableApiKeys[aiConfig.activeProvider] && aiConfig.activeProvider !== 'ollama' && (
            <div style={{ color: '#f48771' }}>❌ No API key for {aiConfig.activeProvider}</div>
          )}
          {!aiConfig.completion.autoTrigger && <div style={{ color: '#ce9178' }}>⚠️ Auto-trigger disabled</div>}
          {!diagnostics.hasActiveTab && <div style={{ color: '#f48771' }}>❌ No active tab</div>}
          {!diagnostics.hasActiveEditor && <div style={{ color: '#f48771' }}>❌ No active editor</div>}
          {diagnostics.totalMonacoModels === 0 && <div style={{ color: '#f48771' }}>❌ No Monaco models</div>}
          {aiConfig.enabled &&
            availableApiKeys[aiConfig.activeProvider] &&
            diagnostics.hasActiveTab &&
            diagnostics.hasActiveEditor &&
            diagnostics.totalMonacoModels > 0 && <div style={{ color: '#4ec9b0' }}>✅ All checks passed</div>}
        </div>
      </div>
    </div>
  );
}
