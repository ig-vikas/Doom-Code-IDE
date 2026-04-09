import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type {
  AIActivityLogEntry,
  AIConfiguration,
  AIProvider,
  AIState,
  AIStatus,
  Completion,
  CompletionRequest,
  CompletionResponse,
  ConnectionStatus,
  ConnectionTestResponse,
  ContextSettings,
  CompletionSettings,
  AIUISettings,
} from '../types/ai';
import { DEFAULT_AI_CONFIG } from '../config/defaultAIConfig';
import { AI_PROVIDERS } from '../config/aiModels';
import { workspaceSettings } from '../services/ai/workspaceSettings';
import { useFileExplorerStore } from './fileExplorerStore';

interface AIStore extends AIState {
  setEnabled: (enabled: boolean) => void;
  setProvider: (provider: AIProvider) => void;
  setModel: (modelId: string) => void;
  updateProviderConfig: <T extends AIProvider>(provider: T, config: Partial<AIConfiguration['providers'][T]>) => void;
  updateCompletionSettings: (settings: Partial<CompletionSettings>) => void;
  updateContextSettings: (settings: Partial<ContextSettings>) => void;
  updateUISettings: (settings: Partial<AIUISettings>) => void;
  setApiKey: (provider: AIProvider, apiKey: string) => Promise<void>;
  getApiKey: (provider: AIProvider) => Promise<string>;
  hasApiKey: (provider: AIProvider) => Promise<boolean>;
  clearApiKey: (provider: AIProvider) => Promise<void>;
  hydrateSecureState: () => Promise<void>;
  testConnection: (provider: AIProvider) => Promise<ConnectionTestResponse>;
  setStatus: (status: AIStatus) => void;
  setCurrentRequest: (request: CompletionRequest | null) => void;
  setPendingSuggestion: (suggestion: Completion | null) => void;
  setLastCompletion: (response: CompletionResponse | null) => void;
  setConnectionStatus: (provider: AIProvider, status: ConnectionStatus) => void;
  recordAcceptedCompletion: (tokens?: number, cost?: number) => void;
  recordRejectedCompletion: () => void;
  resetStats: () => void;
  addActivityLog: (entry: Omit<AIActivityLogEntry, 'id' | 'timestamp'>) => void;
  clearActivityLog: () => void;
  addRecentModel: (modelId: string) => void;
  setCustomModelInput: (input: string) => void;
  refreshOllamaModels: () => Promise<void>;
  setOllamaBaseUrl: (baseUrl: string) => void;
  saveConfig: () => Promise<void>;
  loadConfig: () => Promise<void>;
  resetConfig: () => void;
}

const initialConnectionStatus: Record<AIProvider, ConnectionStatus> = {
  openrouter: 'unknown',
  deepseek: 'unknown',
  google: 'unknown',
  huggingface: 'unknown',
  ollama: 'unknown',
  custom: 'unknown',
};

const initialKeyState: Record<AIProvider, boolean> = {
  openrouter: false,
  deepseek: false,
  google: false,
  huggingface: false,
  ollama: true,
  custom: false,
};

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      status: 'disabled',
      config: DEFAULT_AI_CONFIG,
      currentRequest: null,
      lastCompletion: null,
      pendingSuggestion: null,
      activityLog: [],
      stats: {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        acceptedCompletions: 0,
        rejectedCompletions: 0,
      },
      connectionStatus: initialConnectionStatus,
      availableApiKeys: initialKeyState,

      setEnabled: (enabled) => {
        set((state) => ({
          config: { ...state.config, enabled },
          status: resolveRuntimeStatus({
            config: { ...state.config, enabled },
            availableApiKeys: state.availableApiKeys,
            previousStatus: state.status,
          }),
        }));
        void get().saveConfig();
      },

      setProvider: (provider) => {
        const state = get();
        const defaultModelId = getDefaultModelForProvider(provider, state.config);
        const nextConfig = {
          ...state.config,
          activeProvider: provider,
          activeModelId: defaultModelId,
        };
        set({
          config: nextConfig,
          status: resolveRuntimeStatus({
            config: nextConfig,
            availableApiKeys: state.availableApiKeys,
            previousStatus: state.status,
          }),
        });
        void get().saveConfig();
      },

      setModel: (modelId) => {
        set((state) => {
          const nextConfig = syncActiveProviderModel({
            ...state.config,
            activeModelId: modelId,
          }, modelId);

          return { config: nextConfig };
        });

        if (get().config.activeProvider === 'openrouter' && modelId.trim()) {
          get().addRecentModel(modelId);
        }

        void get().saveConfig();
      },

      updateProviderConfig: (provider, providerConfig) => {
        set((state) => {
          const nextConfig: AIConfiguration = {
            ...state.config,
            providers: {
              ...state.config.providers,
              [provider]: {
                ...state.config.providers[provider],
                ...providerConfig,
              },
            },
          };

          const syncedConfig =
            nextConfig.activeProvider === provider
              ? {
                  ...nextConfig,
                  activeModelId: getDefaultModelForProvider(provider, nextConfig),
                }
              : nextConfig;

          return {
            config: syncedConfig,
            status: resolveRuntimeStatus({
              config: syncedConfig,
              availableApiKeys: state.availableApiKeys,
              previousStatus: state.status,
            }),
          };
        });
        void get().saveConfig();
      },

      updateCompletionSettings: (settings) => {
        set((state) => ({
          config: {
            ...state.config,
            completion: { ...state.config.completion, ...settings },
          },
        }));
        void get().saveConfig();
      },

      updateContextSettings: (settings) => {
        set((state) => ({
          config: {
            ...state.config,
            context: { ...state.config.context, ...settings },
          },
        }));
        void get().saveConfig();
      },

      updateUISettings: (settings) => {
        set((state) => ({
          config: {
            ...state.config,
            ui: { ...state.config.ui, ...settings },
          },
        }));
        void get().saveConfig();
      },

      setApiKey: async (provider, apiKey) => {
        await invoke('store_api_key', { provider, apiKey });
        set((state) => ({
          availableApiKeys: { ...state.availableApiKeys, [provider]: apiKey.trim().length > 0 },
          connectionStatus: { ...state.connectionStatus, [provider]: 'unknown' },
          status: resolveRuntimeStatus({
            config: state.config,
            availableApiKeys: { ...state.availableApiKeys, [provider]: apiKey.trim().length > 0 },
            previousStatus: state.status,
          }),
        }));
        get().addActivityLog({
          type: 'system',
          message: apiKey.trim().length > 0
            ? `Saved API key for ${provider}.`
            : `Cleared API key for ${provider}.`,
        });
      },

      getApiKey: async (provider) => {
        try {
          return (await invoke<string>('get_api_key', { provider })) ?? '';
        } catch (error) {
          console.error('Failed to get API key:', error);
          return '';
        }
      },

      hasApiKey: async (provider) => {
        if (!AI_PROVIDERS[provider].requiresApiKey) {
          return true;
        }
        try {
          return await invoke<boolean>('has_api_key', { provider });
        } catch (error) {
          console.error('Failed to inspect API key:', error);
          return false;
        }
      },

      clearApiKey: async (provider) => {
        await invoke('clear_api_key', { provider });
        set((state) => {
          const nextKeys = { ...state.availableApiKeys, [provider]: !AI_PROVIDERS[provider].requiresApiKey };
          return {
            availableApiKeys: nextKeys,
            connectionStatus: { ...state.connectionStatus, [provider]: 'unknown' },
            status: resolveRuntimeStatus({
              config: state.config,
              availableApiKeys: nextKeys,
              previousStatus: state.status,
            }),
          };
        });
        get().addActivityLog({
          type: 'system',
          message: `Removed API key for ${provider}.`,
        });
      },

      hydrateSecureState: async () => {
        const providers = Object.keys(AI_PROVIDERS) as AIProvider[];
        const results = await Promise.all(
          providers.map(async (provider) => ({
            provider,
            hasKey: await get().hasApiKey(provider),
          }))
        );

        set((state) => {
          const nextKeys = { ...state.availableApiKeys };
          for (const result of results) {
            nextKeys[result.provider] = result.hasKey;
          }
          return {
            availableApiKeys: nextKeys,
            status: resolveRuntimeStatus({
              config: state.config,
              availableApiKeys: nextKeys,
              previousStatus: state.status,
            }),
          };
        });
      },

      testConnection: async (provider) => {
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, [provider]: 'testing' },
        }));

        try {
          const state = get();
          const apiKey = AI_PROVIDERS[provider].requiresApiKey
            ? await get().getApiKey(provider)
            : '';
          const result = await invoke<ConnectionTestResponse>('test_ai_connection', {
            provider,
            apiKey,
            baseUrl: resolveProviderBaseUrl(provider, state.config),
          });

          set((currentState) => ({
            connectionStatus: {
              ...currentState.connectionStatus,
              [provider]: result.success ? 'connected' : 'error',
            },
          }));

          get().addActivityLog({
            type: result.success ? 'success' : 'error',
            message: result.success
              ? `Connection test succeeded for ${provider}.`
              : `Connection test failed for ${provider}: ${result.error || 'unknown error'}`,
          });

          return result;
        } catch (error) {
          set((state) => ({
            connectionStatus: { ...state.connectionStatus, [provider]: 'error' },
          }));
          get().addActivityLog({
            type: 'error',
            message: `Connection test failed for ${provider}: ${String(error)}`,
          });
          return {
            success: false,
            error: String(error),
          };
        }
      },

      setStatus: (status) => set({ status }),
      setCurrentRequest: (request) => set({ currentRequest: request }),
      setPendingSuggestion: (suggestion) => set({ pendingSuggestion: suggestion }),

      setLastCompletion: (response) => {
        if (!response) {
          set({ lastCompletion: null });
          return;
        }

        set((state) => ({
          lastCompletion: response,
          activityLog: [
            createActivityLogEntry(
              response.error ? 'error' : 'success',
              response.error
                ? `Completion failed: ${response.error.message}`
                : `Completion received from ${response.provider}/${response.modelId}`
            ),
            ...state.activityLog,
          ].slice(0, 200),
          stats: {
            ...state.stats,
            totalRequests: state.stats.totalRequests + 1,
            totalTokens: state.stats.totalTokens + (response.usage?.totalTokens ?? 0),
            totalCost: state.stats.totalCost + (response.usage?.estimatedCost ?? 0),
          },
        }));
      },

      setConnectionStatus: (provider, status) => {
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, [provider]: status },
        }));
      },

      recordAcceptedCompletion: (tokens = 0, cost = 0) => {
        void tokens;
        void cost;
        set((state) => ({
          activityLog: [
            createActivityLogEntry('accepted', 'Accepted inline completion.'),
            ...state.activityLog,
          ].slice(0, 200),
          stats: {
            ...state.stats,
            acceptedCompletions: state.stats.acceptedCompletions + 1,
          },
        }));
      },

      recordRejectedCompletion: () => {
        set((state) => ({
          activityLog: [
            createActivityLogEntry('rejected', 'Rejected inline completion.'),
            ...state.activityLog,
          ].slice(0, 200),
          stats: {
            ...state.stats,
            rejectedCompletions: state.stats.rejectedCompletions + 1,
          },
        }));
      },

      resetStats: () => {
        set({
          stats: {
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            acceptedCompletions: 0,
            rejectedCompletions: 0,
          },
        });
      },

      addActivityLog: (entry) => {
        set((state) => ({
          activityLog: [
            createActivityLogEntry(entry.type, entry.message),
            ...state.activityLog,
          ].slice(0, 200),
        }));
      },

      clearActivityLog: () => {
        set({ activityLog: [] });
      },

      addRecentModel: (modelId) => {
        set((state) => ({
          config: {
            ...state.config,
            providers: {
              ...state.config.providers,
              openrouter: {
                ...state.config.providers.openrouter,
                recentModels: [
                  modelId,
                  ...state.config.providers.openrouter.recentModels.filter((candidate) => candidate !== modelId),
                ].slice(0, 10),
              },
            },
          },
        }));
        void get().saveConfig();
      },

      setCustomModelInput: (input) => {
        set((state) => ({
          config: {
            ...state.config,
            activeModelId:
              state.config.activeProvider === 'openrouter'
                ? input || state.config.providers.openrouter.modelId
                : state.config.activeModelId,
            providers: {
              ...state.config.providers,
              openrouter: {
                ...state.config.providers.openrouter,
                customModelInput: input,
              },
            },
          },
        }));
        void get().saveConfig();
      },

      refreshOllamaModels: async () => {
        const baseUrl = get().config.providers.ollama.baseUrl;
        const models = await invoke<string[]>('list_ollama_models', { baseUrl });
        set((state) => ({
          config: {
            ...state.config,
            providers: {
              ...state.config.providers,
              ollama: {
                ...state.config.providers.ollama,
                availableModels: models,
              },
            },
          },
          connectionStatus: {
            ...state.connectionStatus,
            ollama: 'connected',
          },
        }));
        void get().saveConfig();
      },

      setOllamaBaseUrl: (baseUrl) => {
        set((state) => ({
          config: {
            ...state.config,
            providers: {
              ...state.config.providers,
              ollama: {
                ...state.config.providers.ollama,
                baseUrl,
              },
            },
          },
        }));
        void get().saveConfig();
      },

      saveConfig: async () => {
        try {
          await invoke('save_ai_config', { config: get().config });
        } catch (error) {
          console.error('Failed to save AI config:', error);
        }
      },

      loadConfig: async () => {
        try {
          const globalConfig = await invoke<AIConfiguration | null>('load_ai_config');
          const workspaceRoot = useFileExplorerStore.getState().rootPath;
          workspaceSettings.setWorkspacePath(workspaceRoot);
          const workspaceConfig = await workspaceSettings.loadWorkspaceSettings();

          const mergedInput: DeepPartialAIConfig = {
            ...(globalConfig || {}),
            ...(workspaceConfig || {}),
            providers: {
              ...(globalConfig?.providers || {}),
              ...(workspaceConfig?.providers || {}),
            },
          };
          const merged = normalizeActiveModelForProvider(mergeConfig(mergedInput));

          set((state) => ({
            config: merged,
            status: resolveRuntimeStatus({
              config: merged,
              availableApiKeys: state.availableApiKeys,
              previousStatus: state.status,
            }),
          }));
        } catch (error) {
          console.error('Failed to load AI config:', error);
        }
      },

      resetConfig: () => {
        set({
          config: DEFAULT_AI_CONFIG,
          status: 'disabled',
          pendingSuggestion: null,
          currentRequest: null,
          lastCompletion: null,
          activityLog: [],
        });
        void get().saveConfig();
      },
    }),
    {
      name: 'doom-code-ai-store',
      partialize: (state) => ({
        config: state.config,
        stats: state.stats,
      }),
    }
  )
);

type DeepPartialAIConfig = Omit<Partial<AIConfiguration>, 'providers' | 'completion' | 'context' | 'ui'> & {
  providers?: {
    [K in keyof AIConfiguration['providers']]?: Partial<AIConfiguration['providers'][K]>;
  };
  completion?: Partial<AIConfiguration['completion']>;
  context?: Partial<AIConfiguration['context']>;
  ui?: Partial<AIConfiguration['ui']>;
};

function createActivityLogEntry(
  type: AIActivityLogEntry['type'],
  message: string
): AIActivityLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    type,
    message,
  };
}

function mergeConfig(config: DeepPartialAIConfig | null): AIConfiguration {
  if (!config) {
    return DEFAULT_AI_CONFIG;
  }

  return {
    ...DEFAULT_AI_CONFIG,
    ...config,
    providers: {
      openrouter: { ...DEFAULT_AI_CONFIG.providers.openrouter, ...config.providers?.openrouter },
      deepseek: { ...DEFAULT_AI_CONFIG.providers.deepseek, ...config.providers?.deepseek },
      google: { ...DEFAULT_AI_CONFIG.providers.google, ...config.providers?.google },
      huggingface: { ...DEFAULT_AI_CONFIG.providers.huggingface, ...config.providers?.huggingface },
      ollama: { ...DEFAULT_AI_CONFIG.providers.ollama, ...config.providers?.ollama },
      custom: { ...DEFAULT_AI_CONFIG.providers.custom, ...config.providers?.custom },
    },
    completion: { ...DEFAULT_AI_CONFIG.completion, ...(config.completion || {}) },
    context: { ...DEFAULT_AI_CONFIG.context, ...(config.context || {}) },
    ui: { ...DEFAULT_AI_CONFIG.ui, ...(config.ui || {}) },
  };
}

function getDefaultModelForProvider(provider: AIProvider, config: AIConfiguration): string {
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
      return '';
  }
}

function syncActiveProviderModel(config: AIConfiguration, modelId: string): AIConfiguration {
  switch (config.activeProvider) {
    case 'openrouter':
      return {
        ...config,
        providers: {
          ...config.providers,
          openrouter: {
            ...config.providers.openrouter,
            modelId,
            customModelInput: modelId,
          },
        },
      };
    case 'deepseek':
      return {
        ...config,
        providers: {
          ...config.providers,
          deepseek: {
            ...config.providers.deepseek,
            model: modelId as typeof config.providers.deepseek.model,
          },
        },
      };
    case 'google':
      return {
        ...config,
        providers: {
          ...config.providers,
          google: {
            ...config.providers.google,
            model: modelId,
          },
        },
      };
    case 'huggingface':
      return {
        ...config,
        providers: {
          ...config.providers,
          huggingface: {
            ...config.providers.huggingface,
            modelId,
          },
        },
      };
    case 'ollama':
      return {
        ...config,
        providers: {
          ...config.providers,
          ollama: {
            ...config.providers.ollama,
            model: modelId,
          },
        },
      };
    case 'custom':
      return {
        ...config,
        providers: {
          ...config.providers,
          custom: {
            ...config.providers.custom,
            modelId,
          },
        },
      };
    default:
      return config;
  }
}

function normalizeActiveModelForProvider(config: AIConfiguration): AIConfiguration {
  const resolvedModel = getDefaultModelForProvider(config.activeProvider, config);
  if (resolvedModel === config.activeModelId) {
    return config;
  }

  return {
    ...config,
    activeModelId: resolvedModel,
  };
}

function resolveProviderBaseUrl(provider: AIProvider, config: AIConfiguration): string {
  switch (provider) {
    case 'huggingface':
      return config.providers.huggingface.baseUrl;
    case 'ollama':
      return config.providers.ollama.baseUrl;
    case 'custom':
      return config.providers.custom.baseUrl;
    default:
      return AI_PROVIDERS[provider].baseUrl;
  }
}

function resolveRuntimeStatus(args: {
  config: AIConfiguration;
  availableApiKeys: Record<AIProvider, boolean>;
  previousStatus: AIStatus;
}): AIStatus {
  const { config, availableApiKeys, previousStatus } = args;
  if (!config.enabled) {
    return 'disabled';
  }

  const provider = config.activeProvider;
  if (AI_PROVIDERS[provider].requiresApiKey && !availableApiKeys[provider]) {
    return 'no-api-key';
  }

  if (previousStatus === 'loading' || previousStatus === 'streaming') {
    return previousStatus;
  }

  return 'idle';
}


