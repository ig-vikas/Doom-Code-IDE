const fs = require('fs');
const code = fs.readFileSync('src/services/commandService.ts', 'utf8');
const searchString1 = "registerCommand('selection.selectAllOccurrences', monacoAction('editor.action.selectHighlights'));";
const searchString2 = "  registerCommand('view.toggleTerminal', () => {";

const split1 = code.split(searchString1);
const split2 = split1[1].split(searchString2);

const missingCode = `
  registerCommand('selection.skipOccurrence', monacoAction('editor.action.moveSelectionToNextFindMatch'));
  registerCommand('selection.selectLine', monacoAction('expandLineSelection'));
  registerCommand('selection.splitIntoLines', monacoAction('editor.action.insertCursorAtEndOfEachLineSelected'));
  registerCommand('selection.expandToBrackets', monacoAction('editor.action.selectToBracket'));
  registerCommand('selection.addCursorAbove', monacoAction('editor.action.insertCursorAbove'));
  registerCommand('selection.addCursorBelow', monacoAction('editor.action.insertCursorBelow'));
  registerCommand('selection.singleCursor', () => {
    // Escape - remove multi-cursors
  });

  // ======================== NAVIGATION ========================
  registerCommand('navigation.commandPalette', () => {
    useUIStore.getState().toggleCommandPalette();
  });

  registerCommand('navigation.quickOpen', () => {
    useUIStore.getState().toggleQuickOpen();
  });

  registerCommand('navigation.goToLine', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'editor.action.gotoLine', null);
    }
  });

  registerCommand('navigation.goToSymbol', monacoAction('editor.action.quickOutline'));
  registerCommand('navigation.goToMatchingBracket', monacoAction('editor.action.jumpToBracket'));
  registerCommand('navigation.goBack', () => {});
  registerCommand('navigation.goForward', () => {});
  registerCommand('navigation.toggleBookmark', () => {});
  registerCommand('navigation.nextBookmark', () => {});
  registerCommand('navigation.previousBookmark', () => {});

  // ======================== SEARCH ========================
  registerCommand('search.find', () => {
    if (activeEditor) {
      activeEditor.focus();
      activeEditor.trigger('keyboard', 'actions.find', null);
    }
  });

  registerCommand('search.findReplace', () => {
    if (activeEditor) {
      activeEditor.focus();
      activeEditor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
    }
  });

  registerCommand('search.findInFiles', () => {
    useUIStore.getState().setSidebarView('search');
  });

  registerCommand('search.findNext', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'editor.action.nextMatchFindAction', null);
    }
  });

  registerCommand('search.findPrevious', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'editor.action.previousMatchFindAction', null);
    }
  });

  registerCommand('search.findWordUnderCursor', monacoAction('editor.action.addSelectionToNextFindMatch'));
  registerCommand('search.replaceAll', () => {
    if (activeEditor) {
      activeEditor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
    }
  });

  // ======================== VIEW ========================
  registerCommand('view.toggleSidebar', () => {
    useUIStore.getState().toggleSidebar();
  });

`;

const newCode = split1[0] + searchString1 + '\n' + missingCode + searchString2 + split2[1];
fs.writeFileSync('src/services/commandService.ts', newCode, 'utf8');
console.log('Restored commandService successfully');
