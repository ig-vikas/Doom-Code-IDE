# Quick Fix Checklist for AI Inline Suggestions

## ⚡ 30-Second Check

Run the app and check these in order:

### 1. Is AI Enabled?
- [ ] Look at top bar - AI toggle should be ON (not grayed out)
- [ ] Status should NOT say "Disabled"

### 2. Do You Have an API Key?
- [ ] Open AI Settings (gear icon in top bar)
- [ ] Check your provider (DeepSeek, OpenRouter, Google, etc.)
- [ ] Verify API key is entered
- [ ] Click "Test Connection" - should succeed

### 3. Is Auto-Trigger On?
- [ ] AI Settings → Completion tab
- [ ] "Auto-trigger" checkbox should be checked
- [ ] Trigger delay should be 350ms (default)

### 4. Try Manual Trigger
- [ ] Open any code file
- [ ] Type some code
- [ ] Press **Alt+\\** (Alt + Backslash)
- [ ] Does ghost text appear?

### 5. Check Debug Panel
- [ ] Click "AI Debug" button (bottom-right)
- [ ] Look at "Quick Checks" section
- [ ] Should see ✅ "All checks passed"

## 🔍 If Still Not Working

### Open Console (F12) and Type Code
Watch for these logs:
```
[AI Inline] triggerCompletion called
[Completion Engine] requestCompletion called
[Context Builder] Building context for: ...
[AI Inline] Completion received: ...
```

**If you see these logs but no ghost text:**
- Check CSS is loaded (ghost text opacity)
- Check Monaco decorations are being applied
- Try different file/language

**If logs stop at "Building context":**
- Monaco model not found
- Click "Check Monaco Models" in debug panel
- Ensure file has a valid path

**If logs stop at "Getting provider":**
- Provider initialization failed
- Check API key is valid
- Test connection in AI Settings

**If no logs at all:**
- AI is disabled
- Auto-trigger is off
- Editor not focused
- Try manual trigger (Alt+\\)

## 🎯 Most Likely Issues (90% of cases)

1. **AI toggle is OFF** → Turn it on in top bar
2. **No API key** → Add in AI Settings
3. **Wrong provider selected** → Check AI Settings
4. **Auto-trigger disabled** → Enable in AI Settings
5. **Invalid API key** → Re-enter and test connection

## 🚀 Quick Test

```cpp
// Open a new C++ file and type:
int main() {
    // Press Enter here and wait 350ms
    // OR press Alt+\ to manually trigger
    // You should see ghost text suggestion
}
```

## 📊 Debug Panel Quick Reference

**Green (✅) = Good:**
- aiEnabled: true
- aiStatus: "idle"
- hasApiKey: true
- hasActiveTab: true
- hasActiveEditor: true
- totalMonacoModels: > 0

**Red (❌) = Problem:**
- aiEnabled: false → Enable AI
- aiStatus: "disabled" → Enable AI
- aiStatus: "no-api-key" → Add API key
- hasApiKey: false → Add API key
- hasActiveTab: false → Open a file
- hasActiveEditor: false → Click in editor
- totalMonacoModels: 0 → Monaco not initialized

## 🔧 Quick Fixes

### Fix 1: Enable AI
1. Click AI icon in top bar (should turn blue/active)
2. OR go to Settings → AI → Enable checkbox

### Fix 2: Add API Key
1. Open AI Settings
2. Select your provider tab
3. Enter API key
4. Click Save
5. Click Test Connection

### Fix 3: Enable Auto-Trigger
1. AI Settings → Completion tab
2. Check "Enable auto-trigger"
3. Set delay to 350ms

### Fix 4: Select Valid Model
1. AI Settings → Provider tab
2. Select a model from dropdown
3. For OpenRouter: ensure model ID is valid
4. For Ollama: click "Refresh Models"

### Fix 5: Restart Editor
1. Close all files
2. Reopen a file
3. Click in editor to focus
4. Try again

## 📝 What to Report if Nothing Works

If you've tried everything:

1. **Screenshot of Debug Panel** (all diagnostics visible)
2. **Console logs** (from F12 DevTools)
3. **AI Activity Log** (from AI Settings)
4. **Provider name** (DeepSeek, OpenRouter, etc.)
5. **Does manual trigger work?** (Alt+\\)

## ⏱️ Expected Timing

- **Auto-trigger:** 350ms after you stop typing
- **Manual trigger:** Immediate (Alt+\\)
- **API response:** 1-3 seconds typically
- **Ghost text:** Appears immediately after response

## 🎨 Visual Indicators

**When working:**
- Gray/muted text appears after cursor
- Text is slightly transparent
- Pressing Tab accepts it
- Pressing Esc rejects it

**When not working:**
- No ghost text appears
- No visual feedback
- Check debug panel and console

## 🔄 Reset Everything

If completely stuck:
1. Close all files
2. AI Settings → Click "Reset to Defaults" (if available)
3. Re-enter API key
4. Test connection
5. Reopen file
6. Try again

## ✅ Success Criteria

You'll know it's working when:
1. Type code in editor
2. Wait 350ms (or press Alt+\\)
3. Gray ghost text appears
4. Press Tab
5. Ghost text becomes real code
6. 🎉 Success!
