# AI Inline Completion Testing Guide

## What I Added

### 1. Debug Panel (Bottom Right Corner)
- Click "AI Debug" button in bottom-right to open
- Shows real-time diagnostics of AI state
- Quick checks for common issues
- Test buttons for manual trigger and Monaco models

### 2. Console Logging
Added detailed console logs to trace the entire flow:
- `[AI Inline]` - Hook-level events
- `[Completion Engine]` - Engine-level events  
- `[Context Builder]` - Context building events
- `[Provider]` - Provider-specific events (if any)

## How to Test

### Step 1: Open the App
```bash
npm run dev
```

### Step 2: Open Debug Panel
- Look for "AI Debug" button in bottom-right corner
- Click to open the diagnostic panel

### Step 3: Check Configuration
In the debug panel, verify:
- ✅ `aiEnabled: true`
- ✅ `activeProvider: "deepseek"` (or your chosen provider)
- ✅ `activeModel: "deepseek-coder"` (or your chosen model)
- ✅ `aiStatus: "idle"` (NOT "disabled" or "no-api-key")
- ✅ `hasApiKey: true` (unless using Ollama)
- ✅ `autoTrigger: true`
- ✅ `hasActiveTab: true`
- ✅ `hasActiveEditor: true`
- ✅ `totalMonacoModels: > 0`

### Step 4: Open Console (F12)
- Open DevTools
- Go to Console tab
- Clear console (Ctrl+L)

### Step 5: Test Auto-Trigger
1. Open or create a C++ file
2. Type: `int main() {`
3. Press Enter
4. Wait 350ms (default trigger delay)
5. Watch console for logs

**Expected Console Output:**
```
[AI Inline] triggerCompletion called { position: {...}, triggerKind: "auto", ... }
[Completion Engine] requestCompletion called { position: {...}, ... }
[Completion Engine] Building context...
[Context Builder] Building context for: ...
[Context Builder] Model found: ...
[Completion Engine] Context built: { language: "cpp", ... }
[Completion Engine] Getting provider: deepseek
[Completion Engine] Provider obtained, supports streaming: true
[AI Inline] Completion received: ...
[AI Inline] Updating ghost text
```

### Step 6: Test Manual Trigger
1. Type some code
2. Press **Alt+\\** (manual trigger)
3. Watch console

**Expected:** Same console output as auto-trigger but with `triggerKind: "manual"`

### Step 7: Check for Errors

#### If you see: "No editor model found for file"
**Problem:** Monaco model not initialized properly
**Check:**
- Debug panel: `totalMonacoModels` should be > 0
- Click "Check Monaco Models" button in debug panel
- Look at console for model paths
- Ensure file has a valid path (not just "untitled")

#### If you see: "No active tab found"
**Problem:** Editor store state issue
**Fix:**
- Close and reopen the file
- Click in the editor to focus it
- Check debug panel: `hasActiveTab` should be true

#### If you see: API/Network errors
**Problem:** Provider connection issue
**Fix:**
- Go to AI Settings
- Click "Test Connection" for your provider
- Re-enter API key if needed
- Check Activity Log for error details

#### If nothing happens (no console logs)
**Problem:** Hook not triggering
**Check:**
- Debug panel: `aiEnabled` should be true
- Debug panel: `autoTrigger` should be true
- Debug panel: `hasActiveEditor` should be true
- Try manual trigger (Alt+\\)

## Common Issues & Fixes

### Issue 1: AI Disabled
**Symptom:** `aiStatus: "disabled"` in debug panel
**Fix:** Click AI toggle in top bar OR go to AI Settings and enable

### Issue 2: No API Key
**Symptom:** `aiStatus: "no-api-key"` in debug panel
**Fix:** Go to AI Settings → Enter API key for your provider → Save

### Issue 3: Wrong Provider/Model
**Symptom:** Requests fail with 404 or invalid model errors
**Fix:** 
- Go to AI Settings
- Select correct provider
- Select valid model for that provider
- Test connection

### Issue 4: Monaco Model Not Found
**Symptom:** Console shows "No editor model found for file"
**Fix:**
- Ensure file is saved with a path (not untitled)
- Close and reopen the file
- Check that EditorArea sets path prop correctly

### Issue 5: Streaming Returns Empty
**Symptom:** Console shows "Streaming returned no text"
**Fix:** Already handled - engine falls back to non-streaming automatically

### Issue 6: Context Builder Fails
**Symptom:** Console shows error in context building
**Fix:**
- Check that file has valid language
- Ensure Monaco model exists
- Try with a simpler file (e.g., empty C++ file)

## Debug Panel Features

### Quick Checks Section
Shows at-a-glance status:
- ❌ Red X = Problem that needs fixing
- ⚠️ Yellow Warning = Non-critical issue
- ✅ Green Check = All systems go

### Test Buttons

**"Test Manual Trigger"**
- Tests if manual trigger can be invoked
- Shows alert with cursor position
- Useful for verifying editor state

**"Check Monaco Models"**
- Logs all Monaco models to console
- Shows model URIs, paths, languages
- Useful for debugging "model not found" errors

## What to Share if Still Not Working

If you've tried everything and it still doesn't work, share:

1. **Screenshot of Debug Panel** (with all diagnostics visible)
2. **Console logs** (from opening file to attempting completion)
3. **AI Activity Log** (from AI Settings panel)
4. **Provider being used** (DeepSeek, OpenRouter, Google, Ollama, Custom)
5. **Whether manual trigger works** (Alt+\\)

## Next Steps

Once you identify the issue from the debug panel and console logs, you can:
1. Fix the configuration issue
2. Re-test with the steps above
3. If it works, you can remove the debug panel and console logs
4. Build the production version

## Removing Debug Code Later

Once everything works, you can remove:
- `AIDebugPanel` component and its import from App.tsx
- Console.log statements from:
  - `src/hooks/useInlineCompletion.ts`
  - `src/services/ai/completionEngine.ts`
  - `src/services/ai/contextBuilder.ts`
