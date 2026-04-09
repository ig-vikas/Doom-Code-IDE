import type { AIConfiguration } from '../types/ai';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from './aiModels';

export const DEFAULT_AI_CONFIG: AIConfiguration = {
  enabled: false,
  activeProvider: DEFAULT_PROVIDER,
  activeModelId: DEFAULT_MODEL,
  providers: {
    openrouter: {
      modelId: 'anthropic/claude-3.5-sonnet',
      customModelInput: '',
      recentModels: [],
      siteUrl: 'https://doomcode.dev',
      siteName: 'Doom Code IDE',
    },
    deepseek: {
      model: 'deepseek-coder',
      useFIM: true,
    },
    google: {
      model: 'gemini-2.0-flash',
      safetySettings: 'none',
    },
    huggingface: {
      baseUrl: 'https://router.huggingface.co/v1',
      modelId: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    },
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'deepseek-coder-v2:latest',
      availableModels: [],
    },
    custom: {
      name: 'My Custom Provider',
      baseUrl: '',
      modelId: '',
      headers: {},
      requestTemplate: 'openai',
    },
  },
  completion: {
    autoTrigger: true,
    triggerDelay: 350,
    maxTokens: 256,
    temperature: 0.1,
    topP: 0.95,
    stopSequences: ['\n\n', '```', '// ---', '# ---'],
    multiLineEnabled: true,
    acceptKey: 'ctrl+enter',
    partialAcceptKey: 'ctrl+right',
  },
  context: {
    maxContextLines: 100,
    includeOpenFiles: true,
    maxOpenFilesContext: 3,
    includeFileTree: false,
    includeImports: true,
    prioritizeRelatedFiles: true,
  },
  ui: {
    showStatusInTopBar: true,
    showInlineHints: true,
    ghostTextOpacity: 0.5,
    showTokenCount: false,
    showCostEstimate: false,
  },
};

