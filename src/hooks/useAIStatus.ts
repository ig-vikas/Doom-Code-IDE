import { useAIStore } from '../stores/aiStore';

export function useAIStatus() {
  const status = useAIStore((state) => state.status);
  const enabled = useAIStore((state) => state.config.enabled);
  const provider = useAIStore((state) => state.config.activeProvider);
  const model = useAIStore((state) => state.config.activeModelId);
  const stats = useAIStore((state) => state.stats);
  const connectionStatus = useAIStore((state) => state.connectionStatus[state.config.activeProvider]);

  const isReady = enabled && connectionStatus === 'connected' && status === 'idle';
  const isWorking = status === 'loading' || status === 'streaming';
  const hasError = status === 'error' || connectionStatus === 'error';

  return {
    status,
    enabled,
    provider,
    model,
    stats,
    connectionStatus,
    isReady,
    isWorking,
    hasError,
  };
}

