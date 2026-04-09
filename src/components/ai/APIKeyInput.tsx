import { useEffect, useMemo, useState } from 'react';
import { useAIStore } from '../../stores/aiStore';
import { useNotificationStore } from '../../stores';
import type { AIProvider } from '../../types/ai';
import './APIKeyInput.css';

interface APIKeyInputProps {
  provider: AIProvider;
}

const MASKED_KEY = '********************';

export default function APIKeyInput({ provider }: APIKeyInputProps) {
  const setApiKey = useAIStore((state) => state.setApiKey);
  const hasApiKey = useAIStore((state) => state.hasApiKey);
  const clearApiKey = useAIStore((state) => state.clearApiKey);
  const notify = useNotificationStore((state) => state);

  const [apiKey, setApiKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkKey = async () => {
      const stored = await hasApiKey(provider);
      if (!mounted) {
        return;
      }

      setHasExistingKey(stored);
      setShowKey(false);
      if (stored) {
        setApiKeyValue(MASKED_KEY);
        setIsEditing(false);
      } else {
        setApiKeyValue('');
        setIsEditing(true);
      }
    };

    void checkKey();

    return () => {
      mounted = false;
    };
  }, [hasApiKey, provider]);

  const providerLinks = useMemo<Record<AIProvider, { name: string; url: string }>>(() => ({
    openrouter: {
      name: 'OpenRouter Keys',
      url: 'https://openrouter.ai/keys',
    },
    deepseek: {
      name: 'DeepSeek Console',
      url: 'https://platform.deepseek.com/api_keys',
    },
    google: {
      name: 'Google AI Studio',
      url: 'https://aistudio.google.com/app/apikey',
    },
    huggingface: {
      name: 'Hugging Face Tokens',
      url: 'https://huggingface.co/settings/tokens',
    },
    ollama: {
      name: 'Ollama',
      url: '',
    },
    custom: {
      name: 'Provider docs',
      url: '',
    },
  }), []);

  const handleSave = async () => {
    const nextValue = apiKey.trim();
    if (!nextValue || nextValue === MASKED_KEY) {
      return;
    }

    setIsSaving(true);
    try {
      await setApiKey(provider, nextValue);
      setHasExistingKey(true);
      setIsEditing(false);
      setApiKeyValue(MASKED_KEY);
      setShowKey(false);
      notify.success('API key saved securely.');
    } catch (error) {
      notify.error('Failed to save API key.', String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setApiKeyValue('');
    setIsEditing(true);
    setShowKey(false);
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to remove this API key?')) {
      return;
    }

    try {
      await clearApiKey(provider);
      setApiKeyValue('');
      setHasExistingKey(false);
      setIsEditing(true);
      setShowKey(false);
      notify.info('API key removed.');
    } catch (error) {
      notify.error('Failed to clear API key.', String(error));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setApiKeyValue(hasExistingKey ? MASKED_KEY : '');
    setShowKey(false);
  };

  const handleToggleVisibility = async () => {
    if (!isEditing) {
      if (hasExistingKey) {
        notify.info('Stored API keys stay masked for privacy. Use Change to enter a new key.');
      }
      return;
    }

    setShowKey((current) => !current);
  };

  const providerLink = providerLinks[provider];
  const inputValue = isEditing ? apiKey : hasExistingKey ? MASKED_KEY : apiKey;

  return (
    <div className="api-key-input">
      <div className="input-wrapper">
        <input
          type={showKey ? 'text' : 'password'}
          value={inputValue}
          onChange={(event) => setApiKeyValue(event.target.value)}
          placeholder={`Enter ${provider} API key`}
          disabled={!isEditing}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && isEditing) {
              void handleSave();
            }
          }}
        />

        <button
          className="toggle-visibility"
          onClick={() => void handleToggleVisibility()}
          title={isEditing ? (showKey ? 'Hide API key' : 'Show API key') : 'Stored keys stay masked'}
          type="button"
          disabled={!isEditing}
        >
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className="api-key-actions">
        {isEditing ? (
          <>
            <button
              type="button"
              className="save-btn"
              onClick={() => void handleSave()}
              disabled={!apiKey || apiKey === MASKED_KEY || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            {hasExistingKey ? (
              <button type="button" className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button type="button" className="edit-btn" onClick={handleEdit}>
              Change
            </button>
            <button type="button" className="clear-btn" onClick={() => void handleClear()}>
              Clear
            </button>
          </>
        )}
      </div>

      {providerLink.url ? (
        <p className="api-key-hint">
          Get your API key from{' '}
          <a href={providerLink.url} target="_blank" rel="noopener noreferrer">
            {providerLink.name}
          </a>
        </p>
      ) : null}
    </div>
  );
}
