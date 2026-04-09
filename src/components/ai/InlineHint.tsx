import { useAIStore } from '../../stores/aiStore';
import './InlineHint.css';

export function InlineHint() {
  const config = useAIStore((state) => state.config);
  const pendingSuggestion = useAIStore((state) => state.pendingSuggestion);

  if (!config.ui.showInlineHints || !pendingSuggestion) {
    return null;
  }

  const acceptKey = config.completion.acceptKey === 'tab'
    ? 'Tab'
    : config.completion.acceptKey === 'enter'
      ? 'Enter'
      : 'Ctrl+Enter';

  const partialKey = config.completion.partialAcceptKey === 'ctrl+right' ? 'Ctrl+Right' : 'Alt+Right';

  return (
    <div className="ai-inline-hint">
      <span className="hint-item">
        <kbd>{acceptKey}</kbd> to accept
      </span>
      <span className="hint-separator">|</span>
      <span className="hint-item">
        <kbd>{partialKey}</kbd> next word
      </span>
      <span className="hint-separator">|</span>
      <span className="hint-item">
        <kbd>Esc</kbd> to dismiss
      </span>
    </div>
  );
}

export default InlineHint;
