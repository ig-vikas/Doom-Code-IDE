import type { editor, IPosition } from 'monaco-editor';
import { useAIStore } from '../../stores/aiStore';
import type { AIConfiguration, AIProvider, CompletionTriggerKind } from '../../types/ai';
import { completionEngine } from './completionEngine';

class AIService {
  private nextTriggerKind: CompletionTriggerKind | null = null;

  async initialize() {
    return;
  }

  dispose() {
    return;
  }

  async requestInlineCompletion(args: {
    model: editor.ITextModel;
    position: IPosition;
    triggerKind: CompletionTriggerKind;
  }) {
    await this.initialize();
    return completionEngine.requestCompletion(
      {
        lineNumber: args.position.lineNumber,
        column: args.position.column,
      },
      args.triggerKind === 'manual' ? 'manual' : 'auto'
    );
  }

  acceptPendingSuggestion() {
    completionEngine.acceptSuggestion();
  }

  rejectPendingSuggestion() {
    completionEngine.rejectSuggestion();
  }

  clearPendingSuggestion() {
    completionEngine.cancelCurrentRequest();
  }

  markNextTriggerKind(triggerKind: CompletionTriggerKind) {
    this.nextTriggerKind = triggerKind;
  }

  consumeTriggerKind(fallback: CompletionTriggerKind): CompletionTriggerKind {
    const next = this.nextTriggerKind ?? fallback;
    this.nextTriggerKind = null;
    return next;
  }

  getAcceptHint(config: AIConfiguration): string {
    switch (config.completion.acceptKey) {
      case 'enter':
        return 'Enter to accept';
      case 'ctrl+enter':
        return 'Ctrl+Enter to accept';
      case 'tab':
      default:
        return 'Tab to accept';
    }
  }

  getActiveProviderModel(provider: AIProvider, config: AIConfiguration): string {
    switch (provider) {
      case 'openrouter':
        return config.providers.openrouter.customModelInput || config.providers.openrouter.modelId;
      case 'deepseek':
        return config.providers.deepseek.model;
      case 'google':
        return config.providers.google.model;
      case 'huggingface':
        return config.providers.huggingface.modelId;
      case 'ollama':
        return config.providers.ollama.model;
      case 'custom':
        return config.providers.custom.modelId;
      default:
        return config.activeModelId;
    }
  }

  getStatusLabel() {
    const { status } = useAIStore.getState();
    switch (status) {
      case 'loading':
        return 'Loading';
      case 'streaming':
        return 'Streaming';
      case 'error':
        return 'Error';
      case 'disabled':
        return 'Disabled';
      case 'no-api-key':
        return 'No API Key';
      case 'idle':
      default:
        return 'Ready';
    }
  }
}

export const aiService = new AIService();


