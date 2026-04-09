import { AI_PROVIDERS } from '../../../config/aiModels';
import type { AIConfiguration, AIProvider, ModelDefinition } from '../../../types/ai';
import { useAIStore } from '../../../stores/aiStore';
import { BaseAIProvider } from './baseProvider';
import { CustomProvider } from './customProvider';
import { DeepSeekProvider } from './deepSeekProvider';
import { GoogleAIProvider } from './googleAIProvider';
import { HuggingFaceProvider } from './huggingFaceProvider';
import { OllamaProvider } from './ollamaProvider';
import { OpenRouterProvider } from './openRouterProvider';

class ProviderRegistry {
  private providers: Map<AIProvider, BaseAIProvider> = new Map();

  constructor() {
    this.initProviders();
  }

  private initProviders() {
    this.providers.set('openrouter', new OpenRouterProvider());
    this.providers.set('deepseek', new DeepSeekProvider());
    this.providers.set('google', new GoogleAIProvider());
    this.providers.set('huggingface', new HuggingFaceProvider());
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('custom', new CustomProvider());
  }

  async getProvider(providerId: AIProvider): Promise<BaseAIProvider> {
    const provider = this.providers.get(providerId);

    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const providerConfig = AI_PROVIDERS[providerId];
    if (providerConfig.requiresApiKey) {
      const apiKey = await useAIStore.getState().getApiKey(providerId);
      provider.setApiKey(apiKey);
    }

    const aiConfig = useAIStore.getState().config;

    if (providerId === 'deepseek' && provider instanceof DeepSeekProvider) {
      provider.setUseFIM(aiConfig.providers.deepseek.useFIM);
    }

    if (providerId === 'google' && provider instanceof GoogleAIProvider) {
      provider.setSafetySettings(aiConfig.providers.google.safetySettings);
    }

    if (providerId === 'huggingface' && provider instanceof HuggingFaceProvider) {
      provider.setBaseUrl(aiConfig.providers.huggingface.baseUrl);
    }

    if (providerId === 'ollama' && provider instanceof OllamaProvider) {
      provider.setBaseUrl(aiConfig.providers.ollama.baseUrl);
    }

    if (providerId === 'custom' && provider instanceof CustomProvider) {
      provider.setBaseUrl(aiConfig.providers.custom.baseUrl);
      provider.setHeaders(aiConfig.providers.custom.headers);
      provider.setRequestTemplate(aiConfig.providers.custom.requestTemplate);
    }

    return provider;
  }

  getProviderSync(providerId: AIProvider): BaseAIProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllProviders(): Map<AIProvider, BaseAIProvider> {
    return this.providers;
  }
}

export const providerRegistry = new ProviderRegistry();

export function resolveProviderModelOptions(provider: AIProvider, config: AIConfiguration): ModelDefinition[] {
  if (provider === 'ollama') {
    const installed: ModelDefinition[] = config.providers.ollama.availableModels.map((modelId) => ({
      id: modelId,
      name: modelId,
      displayName: modelId,
      contextWindow: 32768,
      maxOutputTokens: config.completion.maxTokens,
      capabilities: ['code-completion', 'chat'],
      recommended: true,
    }));

    const ollamaProvider = providerRegistry.getProviderSync('ollama');
    return installed.length > 0 ? installed : ollamaProvider?.getModels() || AI_PROVIDERS.ollama.models;
  }

  if (provider === 'custom' && config.providers.custom.modelId.trim()) {
    return [
      {
        id: config.providers.custom.modelId,
        name: config.providers.custom.modelId,
        displayName: config.providers.custom.modelId,
        contextWindow: 32768,
        maxOutputTokens: config.completion.maxTokens,
        capabilities: ['code-completion', 'chat'],
      },
    ];
  }

  const providerInstance = providerRegistry.getProviderSync(provider);
  return providerInstance?.getModels() || AI_PROVIDERS[provider].models;
}
