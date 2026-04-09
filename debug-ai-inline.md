# AI Inline Completion Debugging Guide

## Common Issues & Solutions

### 1. Check AI Configuration Status

Open the AI Settings Panel and verify:
- ✅ AI is **enabled** (toggle in top bar or settings)
- ✅ Provider is **selected** (DeepSeek, OpenRouter, Google, etc.)
- ✅ Model is **selected** for that provider
- ✅ API key is **present** (except for Ollama)
- ✅ Status shows **"idle"** not **"no-api-key"** or **"disabled"**

### 2. Check Auto-Trigger Settings

In AI Settings → Completion Settings:
- ✅ Auto-trigger is **enabled**
- ✅ Trigger delay is reasonable (default: 350ms)
- ✅ Max tokens > 0 (default: 256)

### 3. Test Manual Trigger

Instead of waiting for auto-trigger:
1. Type some code in the editor
2. Press **Alt+\\** (manual trigger hotkey)
3. Check if suggestion appears

### 4. Check Console for Errors

Open DevTools (F12 or Ctrl+Shift+I) and look for:
- Red errors in Console tab
- Network errors (401, 403, 429, 500)
- "Completion error:" messages
- "No editor model found" errors

### 5. Check AI Activity Log

In AI Settings Panel → Activity Log tab:
- Look for "Requesting completion from..." messages
- Check for error messages
- Verify requests are being sent

### 6. Common Error Patterns

#### "No editor model found for file"
**Cause:** Monaco editor model not properly initialized
**Fix:** 
- Close and reopen the file
- Check that file has a valid path (not just "untitled")
- Verify EditorArea.tsx line 442: `path={activeTab.path || ...}` is set

#### "No active tab found"
**Cause:** Editor store state issue
**Fix:**
- Ensure a file is open and active
- Click in the editor to focus it
- Check `useEditorStore.getState().getActiveTab()` returns a tab

#### API Key Issues
**Cause:** API key not stored or invalid
**Fix:**
- Re-enter API key in settings
- Test connection using "Test Connection" button
- Check Rust backend logs for keyring errors

#### Streaming Returns Empty
**Cause:** Provider streaming fails, fallback not working
**Fix:** Already implemented in completionEngine.ts (lines 82-93)

### 7. Provider-Specific Checks

#### OpenRouter
- Verify API key starts with `sk-or-`
- Check model ID is valid (e.g., `anthropic/claude-3.5-sonnet`)
- Ensure custom model input is empty OR valid

#### DeepSeek
- Verify API key format
- Check if FIM toggle matches model capability
- Model should be `deepseek-coder` or `deepseek-chat`

#### Google AI
- API key should be from Google AI Studio
- Model ID should be exact (e.g., `gemini-2.0-flash`)
- Check if custom model input is being used

#### Ollama
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check base URL is correct (default: `http://localhost:11434`)
- Refresh models list in settings
- Ensure model is pulled: `ollama pull deepseek-coder-v2`

### 8. Debug Code Paths

Add console.log statements to trace execution:

**In useInlineCompletion.ts (line 88):**
```typescript
const triggerCompletion = useCallback(
  async (position: { lineNumber: number; column: number }, triggerKind: 'auto' | 'manual') => {
    console.log('[DEBUG] triggerCompletion called', { position, triggerKind, enabled: aiConfig.enabled });
    if (!editor || !aiConfig.enabled || !enabled) {
      console.log('[DEBUG] Early return:', { hasEditor: !!editor, aiEnabled: aiConfig.enabled, enabled });
      return;
    }
    // ... rest of function
```

**In completionEngine.ts (line 28):**
```typescript
async requestCompletion(
  position: { lineNumber: number; column: number },
  triggerKind: 'auto' | 'manual'
): Promise<Completion | null> {
  console.log('[DEBUG] requestCompletion called', { position, triggerKind });
  const aiStore = useAIStore.getState();
  const editorStore = useEditorStore.getState();
  
  console.log('[DEBUG] AI config:', { 
    enabled: aiStore.config.enabled, 
    provider: aiStore.config.activeProvider,
    model: aiStore.config.activeModelId,
    status: aiStore.status
  });
  // ... rest of function
```

### 9. Quick Test Procedure

1. **Open a C++ file** (or create new file, set language to C++)
2. **Type:** `int main() {`
3. **Press Enter** and wait 350ms
4. **Expected:** Ghost text suggestion appears
5. **If not, press Alt+\\** to manually trigger
6. **Check console** for debug messages
7. **Check AI Activity Log** for request/error messages

### 10. Nuclear Option - Reset Everything

If nothing works:
1. Close all files
2. Open AI Settings
3. Click "Reset to Defaults" (if available)
4. Re-enter API key
5. Test connection
6. Reopen file and try again

### 11. Verify Monaco Path Setting

Check EditorArea.tsx line 442 - the path prop MUST be set:
```typescript
<Editor
  key={activeTab.id}
  height="100%"
  path={activeTab.path || `untitled://${activeTab.id}/${activeTab.name || 'untitled'}`}
  // ... other props
/>
```

This is CRITICAL for context builder to find the model.

### 12. Check Store Hydration

The AI store needs to hydrate secure state on startup. Check App.tsx or main.tsx for:
```typescript
useEffect(() => {
  aiStore.hydrateSecureState();
  aiStore.loadConfig();
}, []);
```

## Most Likely Issues (in order)

1. **AI not enabled** - Check toggle in top bar
2. **No API key** - Status shows "no-api-key"
3. **Wrong model selected** - Model doesn't exist or is invalid
4. **Auto-trigger disabled** - Check completion settings
5. **Monaco model not found** - File path not set correctly
6. **Provider connection failed** - Network/API issues
7. **Streaming fallback not working** - Should be fixed already

## Next Steps

If you've checked all of the above and it still doesn't work:
1. Share the console errors
2. Share the AI Activity Log
3. Share the AI config (from localStorage or settings)
4. Specify which provider you're using
5. Specify if manual trigger (Alt+\\) works
