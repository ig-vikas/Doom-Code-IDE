export type AIProvider = 'openrouter' | 'deepseek' | 'google' | 'huggingface' | 'ollama' | 'custom';

export type AIStatus =
  | 'idle'
  | 'loading'
  | 'streaming'
  | 'error'
  | 'disabled'
  | 'no-api-key';

export type ConnectionStatus = 'connected' | 'error' | 'unknown' | 'testing';

export type ModelCapability =
  | 'code-completion'
  | 'chat'
  | 'fim'
  | 'function-calling'
  | 'vision'
  | 'reasoning';

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  displayName: string;
  icon: string;
  baseUrl: string;
  authType: 'bearer' | 'api-key' | 'none';
  supportsStreaming: boolean;
  supportsFIM: boolean;
  customModelAllowed: boolean;
  requiresApiKey: boolean;
  models: ModelDefinition[];
}

export interface ModelDefinition {
  id: string;
  name: string;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
  recommended?: boolean;
  capabilities: ModelCapability[];
  description?: string;
}

export interface AIConfiguration {
  enabled: boolean;
  activeProvider: AIProvider;
  activeModelId: string;
  providers: {
    openrouter: OpenRouterConfig;
    deepseek: DeepSeekConfig;
    google: GoogleAIConfig;
    huggingface: HuggingFaceConfig;
    ollama: OllamaConfig;
    custom: CustomProviderConfig;
  };
  completion: CompletionSettings;
  context: ContextSettings;
  ui: AIUISettings;
}

export interface OpenRouterConfig {
  modelId: string;
  customModelInput: string;
  recentModels: string[];
  siteUrl?: string;
  siteName?: string;
}

export interface DeepSeekConfig {
  model: 'deepseek-coder' | 'deepseek-chat' | 'deepseek-reasoner';
  useFIM: boolean;
}

export interface GoogleAIConfig {
  model: string;
  safetySettings: 'none' | 'low' | 'medium' | 'high';
}

export interface HuggingFaceConfig {
  baseUrl: string;
  modelId: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  availableModels: string[];
}

export interface CustomProviderConfig {
  name: string;
  baseUrl: string;
  modelId: string;
  headers: Record<string, string>;
  requestTemplate: 'openai' | 'anthropic' | 'custom';
}

export interface CompletionSettings {
  autoTrigger: boolean;
  triggerDelay: number;
  maxTokens: number;
  temperature: number;
  topP: number;
  stopSequences: string[];
  multiLineEnabled: boolean;
  acceptKey: 'tab' | 'enter' | 'ctrl+enter';
  partialAcceptKey: 'ctrl+right' | 'alt+right';
}

export interface ContextSettings {
  maxContextLines: number;
  includeOpenFiles: boolean;
  maxOpenFilesContext: number;
  includeFileTree: boolean;
  includeImports: boolean;
  prioritizeRelatedFiles: boolean;
}

export interface AIUISettings {
  showStatusInTopBar: boolean;
  showInlineHints: boolean;
  ghostTextOpacity: number;
  showTokenCount: boolean;
  showCostEstimate: boolean;
}

export type CompletionTriggerKind = 'auto' | 'manual' | 'comment';

export interface CompletionRequest {
  id: string;
  provider: AIProvider;
  modelId: string;
  prompt: CompletionPrompt;
  settings: Partial<CompletionSettings>;
  metadata: RequestMetadata;
}

export interface CompletionPrompt {
  type: 'completion' | 'fim' | 'chat';
  prefix?: string;
  suffix?: string;
  messages?: ChatMessage[];
  language: string;
  filePath: string;
  cursorPosition: { line: number; column: number };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface RequestMetadata {
  timestamp: number;
  fileLanguage: string;
  filePath: string;
  triggerKind: CompletionTriggerKind;
  contextTokens: number;
}

export interface CompletionResponse {
  id: string;
  requestId: string;
  provider: AIProvider;
  modelId: string;
  completions: Completion[];
  usage?: TokenUsage;
  timing: {
    requestStart: number;
    firstToken?: number;
    complete: number;
    latencyMs: number;
  };
  error?: AIError;
}

export interface Completion {
  text: string;
  displayText?: string;
  insertText: string;
  range?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  confidence?: number;
}

export interface AIError {
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

export interface AIState {
  status: AIStatus;
  config: AIConfiguration;
  currentRequest: CompletionRequest | null;
  lastCompletion: CompletionResponse | null;
  pendingSuggestion: Completion | null;
  activityLog: AIActivityLogEntry[];
  stats: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    acceptedCompletions: number;
    rejectedCompletions: number;
  };
  connectionStatus: Record<AIProvider, ConnectionStatus>;
  availableApiKeys: Record<AIProvider, boolean>;
}

export interface AIActivityLogEntry {
  id: string;
  timestamp: number;
  type: 'request' | 'success' | 'error' | 'accepted' | 'rejected' | 'system';
  message: string;
}

export interface ApiKeyStoreRequest {
  provider: AIProvider;
  apiKey: string;
}

export interface ApiKeyGetRequest {
  provider: AIProvider;
}

export interface ConnectionTestRequest {
  provider: AIProvider;
  baseUrl?: string;
  modelId?: string;
  requestTemplate?: CustomProviderConfig['requestTemplate'];
  headers?: Record<string, string>;
}

export interface ConnectionTestResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export interface RelatedContextFile {
  path: string;
  language: string;
  score: number;
  excerpt: string;
  reason: string;
}

export interface BuiltCompletionContext {
  language: string;
  filePath: string;
  beforeCursor: string;
  afterCursor: string;
  imports: string[];
  relatedFiles: RelatedContextFile[];
  fileTree?: string[];
  cursorPosition: { line: number; column: number };
  estimatedTokens: number;
  triggerKind: CompletionTriggerKind;
}

export type BackendResponseFormat =
  | 'openai-chat'
  | 'deepseek-fim'
  | 'google-generate-content'
  | 'ollama-generate'
  | 'anthropic-messages'
  | 'custom-generic';

export interface ProviderRequestPayload {
  requestId: string;
  provider: AIProvider;
  modelId: string;
  baseUrl: string;
  endpoint: string;
  method: 'GET' | 'POST';
  stream: boolean;
  responseFormat: BackendResponseFormat;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  metadata: RequestMetadata;
}

export interface AIStreamEvent {
  requestId: string;
  provider: AIProvider;
  modelId: string;
  delta?: string;
  text?: string;
  done: boolean;
  usage?: TokenUsage;
  error?: AIError;
}

