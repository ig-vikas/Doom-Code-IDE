import type { AIProvider } from '../../types/ai';
import './ProviderTabs.css';

interface ProviderTabsProps {
  providers: { id: AIProvider; label: string; status: string }[];
  activeProvider: AIProvider;
  onSelect: (provider: AIProvider) => void;
}

export default function ProviderTabs({ providers, activeProvider, onSelect }: ProviderTabsProps) {
  return (
    <div className="ai-provider-tabs">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          className={`ai-provider-tab ${activeProvider === provider.id ? 'active' : ''}`}
          onClick={() => onSelect(provider.id)}
        >
          <span className={`ai-provider-tab-status ${provider.status}`} />
          {provider.label}
        </button>
      ))}
    </div>
  );
}

