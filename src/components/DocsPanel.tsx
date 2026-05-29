import type { MouseEvent } from 'react';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import { useNotificationStore, useUIStore } from '../stores';
import './DocsPanel.css';

export default function DocsPanel() {
  const githubRepoUrl = 'https://github.com/ig-vikas/Doom-Code-IDE';
  const closePanel = () => useUIStore.getState().setDocsOpen(false);

  const handleGitHubClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    try {
      await openExternal(githubRepoUrl);
      return;
    } catch (error) {
      console.warn('Failed to open GitHub link through Tauri shell API, using window fallback.', error);
    }

    const popup = window.open(githubRepoUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      useNotificationStore
        .getState()
        .error('Unable to open the GitHub link. Please copy and open it manually.');
    }
  };

  return (
    <div className="docs-panel-overlay" onClick={closePanel}>
      <div className="docs-panel-container" onClick={(e) => e.stopPropagation()}>
        <div className="docs-panel-header">
          <h1 className="docs-panel-title">Doom Code Docs</h1>
          <button className="docs-panel-close" onClick={closePanel} title="Close">
            ×
          </button>
        </div>

        <div className="docs-panel-content">
          {/* Introduction */}
          <section className="docs-section">
            <h2>Introduction</h2>
            <p>
              Doom Code is a lightweight (18 MB) C++ IDE built with Tauri, React, and Monaco Editor.
              It provides a fast, customizable coding environment designed specifically for competitive
              programming and C++ development.
            </p>
          </section>

          {/* Getting Started */}
          <section className="docs-section">
            <h2>Getting Started</h2>
            <h3>Opening Files and Folders</h3>
            <ul>
              <li><strong>New File:</strong> Press <code>Ctrl+N</code> or use File → New File</li>
              <li><strong>New CP File:</strong> Press <code>Ctrl+Alt+N</code> to create a file with competitive programming template</li>
              <li><strong>Open File:</strong> Press <code>Ctrl+O</code> or use File → Open File</li>
              <li><strong>Open Folder:</strong> Press <code>Ctrl+K Ctrl+O</code> to open a workspace folder</li>
            </ul>

            <h3>Saving Your Work</h3>
            <ul>
              <li><strong>Save:</strong> Press <code>Ctrl+S</code></li>
              <li><strong>Save As:</strong> Press <code>Ctrl+Shift+S</code></li>
              <li><strong>Save All:</strong> Press <code>Ctrl+Alt+S</code> to save all open files</li>
              <li><strong>Auto-Save:</strong> Configure in Settings → Files → Auto Save</li>
            </ul>
          </section>

          {/* Build System */}
          <section className="docs-section">
            <h2>Build System</h2>
            <p>
              Doom Code includes a powerful build system with multiple profiles for different compilation needs.
            </p>

            <h3>Build Profiles</h3>
            <div className="docs-profile-grid">
              <div className="docs-profile-card">
                <h4>Competitive</h4>
                <p>Optimized for competitive programming with fast compilation and execution.</p>
                <code>-std=c++20 -O2 -Wall</code>
              </div>
              <div className="docs-profile-card">
                <h4>Debug</h4>
                <p>Includes debugging symbols and sanitizers for development.</p>
                <code>-std=c++20 -g -Wall -Wextra -fsanitize=address</code>
              </div>
              <div className="docs-profile-card">
                <h4>Release</h4>
                <p>Maximum optimization for production builds.</p>
                <code>-std=c++20 -O3 -DNDEBUG</code>
              </div>
            </div>

            <h3>Build Commands</h3>
            <ul>
              <li><strong>Compile & Run:</strong> Press <code>Ctrl+B</code> to compile and execute</li>
              <li><strong>Compile Only:</strong> Press <code>Ctrl+Shift+B</code> to compile without running</li>
              <li><strong>Run Only:</strong> Press <code>Ctrl+F5</code> to run previously compiled executable</li>
              <li><strong>Kill Process:</strong> Press <code>Ctrl+K</code> to terminate running process</li>
            </ul>

            <h3>Custom Build Profiles</h3>
            <p>
              Create custom build profiles in Settings → Build Configuration. You can specify:
            </p>
            <ul>
              <li>Compiler flags and optimization levels</li>
              <li>Standard library version (C++11, C++14, C++17, C++20, C++23)</li>
              <li>Warning levels and sanitizers</li>
              <li>Custom compiler commands</li>
            </ul>
          </section>

          {/* Test Cases */}
          <section className="docs-section">
            <h2>Test Cases</h2>
            <p>
              Manage and run test cases to verify your code against expected outputs.
            </p>

            <h3>Creating Test Cases</h3>
            <ol>
              <li>Open the Test Cases panel (bottom panel)</li>
              <li>Click "Add Test Case" button</li>
              <li>Enter input data in the Input field</li>
              <li>Enter expected output in the Expected Output field</li>
              <li>Run individual test or all tests</li>
            </ol>

            <h3>Test Case Features</h3>
            <ul>
              <li><strong>Run All Tests:</strong> Press <code>Ctrl+Alt+T</code> to execute all test cases</li>
              <li><strong>Verdict Display:</strong> See AC (Accepted), WA (Wrong Answer), RE (Runtime Error), TLE (Time Limit Exceeded)</li>
              <li><strong>Execution Time:</strong> View execution time for each test case in milliseconds</li>
              <li><strong>Diff View:</strong> Toggle to see differences between expected and actual output</li>
              <li><strong>Duplicate Test:</strong> Quickly create copies of existing test cases</li>
              <li><strong>Import/Export:</strong> Batch import test cases from JSON format</li>
            </ul>

            <h3>Test Case Timestamps</h3>
            <p>
              Each test execution records a timestamp showing when it was run. This helps track:
            </p>
            <ul>
              <li>When tests were last executed</li>
              <li>Test execution history</li>
              <li>Performance tracking over time</li>
            </ul>
          </section>

          {/* Snippets */}
          <section className="docs-section">
            <h2>Code Snippets</h2>
            <p>
              Snippets allow you to quickly insert commonly used code patterns.
            </p>

            <h3>Using Snippets</h3>
            <ol>
              <li>Type the snippet prefix (e.g., <code>for</code>, <code>while</code>, <code>class</code>)</li>
              <li>Press <code>Tab</code> or select from IntelliSense suggestions</li>
              <li>The snippet expands with cursor positions for easy editing</li>
            </ol>

            <h3>Built-in Snippets</h3>
            <ul>
              <li><code>for</code> - For loop</li>
              <li><code>fori</code> - For loop with index</li>
              <li><code>while</code> - While loop</li>
              <li><code>if</code> - If statement</li>
              <li><code>class</code> - Class definition</li>
              <li><code>struct</code> - Struct definition</li>
              <li><code>fn</code> - Function definition</li>
              <li><code>main</code> - Main function</li>
            </ul>

            <h3>Custom Snippets</h3>
            <p>
              Create your own snippets in the Snippets panel:
            </p>
            <ol>
              <li>Open Snippets panel from the sidebar</li>
              <li>Click "Add Snippet"</li>
              <li>Define prefix, name, description, and body</li>
              <li>Use <code>$1</code>, <code>$2</code> for tab stops and <code>$0</code> for final cursor position</li>
            </ol>

            <h3>Snippet Timestamps</h3>
            <p>
              Snippets track creation and last modified timestamps, helping you:
            </p>
            <ul>
              <li>Identify recently added snippets</li>
              <li>Track snippet usage patterns</li>
              <li>Organize and maintain your snippet library</li>
            </ul>
          </section>

          {/* Editor Features */}
          <section className="docs-section">
            <h2>Editor Features</h2>
            <p>
              Doom Code uses Monaco Editor, the same editor that powers VS Code.
            </p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>IntelliSense:</strong> Auto-completion for C++ keywords, functions, and variables</li>
              <li><strong>Multi-cursor:</strong> Hold <code>Alt</code> and click to add cursors</li>
              <li><strong>Find & Replace:</strong> Press <code>Ctrl+F</code> for find, <code>Ctrl+H</code> for replace</li>
              <li><strong>Go to Line:</strong> Press <code>Ctrl+G</code> to jump to a specific line</li>
              <li><strong>Comment Toggle:</strong> Press <code>Ctrl+/</code> for line comments, <code>Ctrl+Shift+/</code> for block comments</li>
              <li><strong>Format Document:</strong> Press <code>Shift+Alt+F</code> to format code</li>
              <li><strong>Bracket Matching:</strong> Automatic bracket pair colorization and matching</li>
              <li><strong>Minimap:</strong> Toggle minimap in Settings → Editor</li>
            </ul>

            <h3>Editor Customization</h3>
            <p>
              Customize the editor in Settings → Editor:
            </p>
            <ul>
              <li>Font family, size, and weight</li>
              <li>Line height and tab size</li>
              <li>Word wrap settings</li>
              <li>Cursor style and blinking</li>
              <li>Whitespace rendering</li>
              <li>Bracket pair colorization</li>
              <li>Auto-closing brackets and quotes</li>
            </ul>
          </section>

          {/* Themes */}
          <section className="docs-section">
            <h2>Themes & Appearance</h2>
            <p>
              Customize the look and feel of Doom Code with built-in themes and color schemes.
            </p>

            <h3>UI Themes</h3>
            <p>Available themes for the application interface:</p>
            <ul>
              <li>VS Code Dark</li>
              <li>VS Code Dark Forge</li>
              <li>Tokyo Night</li>
              <li>Dracula</li>
              <li>Gruvbox</li>
              <li>Nord</li>
              <li>Monokai</li>
              <li>Obsidian</li>
              <li>JetBrains</li>
              <li>Dawn (Light)</li>
            </ul>

            <h3>Editor Color Schemes</h3>
            <p>Separate color schemes for the code editor:</p>
            <ul>
              <li>VS Code Dark++</li>
              <li>VS Code Dark++ Forge</li>
              <li>One Dark Pro</li>
              <li>Catppuccin Mocha</li>
              <li>Dracula</li>
              <li>GitHub Dark</li>
              <li>Monokai Pro</li>
              <li>CLion Darcula</li>
              <li>Doom+ Dark</li>
            </ul>

            <h3>Custom Themes</h3>
            <p>
              Create your own themes and color schemes:
            </p>
            <ol>
              <li>Open Settings → Appearance</li>
              <li>Click "Create Custom Theme" or "Create Custom Scheme"</li>
              <li>Customize colors for each UI element</li>
              <li>Save and apply your custom theme</li>
            </ol>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="docs-section">
            <h2>Keyboard Shortcuts</h2>
            <p>
              Master Doom Code with these essential keyboard shortcuts.
            </p>

            <h3>File Operations</h3>
            <table className="docs-shortcuts-table">
              <tbody>
                <tr><td><code>Ctrl+N</code></td><td>New File</td></tr>
                <tr><td><code>Ctrl+Alt+N</code></td><td>New CP File</td></tr>
                <tr><td><code>Ctrl+O</code></td><td>Open File</td></tr>
                <tr><td><code>Ctrl+K Ctrl+O</code></td><td>Open Folder</td></tr>
                <tr><td><code>Ctrl+S</code></td><td>Save</td></tr>
                <tr><td><code>Ctrl+Shift+S</code></td><td>Save As</td></tr>
                <tr><td><code>Ctrl+Alt+S</code></td><td>Save All</td></tr>
                <tr><td><code>Ctrl+W</code></td><td>Close Tab</td></tr>
              </tbody>
            </table>

            <h3>Editing</h3>
            <table className="docs-shortcuts-table">
              <tbody>
                <tr><td><code>Ctrl+Z</code></td><td>Undo</td></tr>
                <tr><td><code>Ctrl+Y</code></td><td>Redo</td></tr>
                <tr><td><code>Ctrl+X</code></td><td>Cut</td></tr>
                <tr><td><code>Ctrl+C</code></td><td>Copy</td></tr>
                <tr><td><code>Ctrl+V</code></td><td>Paste</td></tr>
                <tr><td><code>Ctrl+/</code></td><td>Toggle Comment</td></tr>
                <tr><td><code>Ctrl+Shift+/</code></td><td>Toggle Block Comment</td></tr>
              </tbody>
            </table>

            <h3>Navigation</h3>
            <table className="docs-shortcuts-table">
              <tbody>
                <tr><td><code>Ctrl+P</code></td><td>Quick Open</td></tr>
                <tr><td><code>Ctrl+Shift+P</code></td><td>Command Palette</td></tr>
                <tr><td><code>Ctrl+G</code></td><td>Go to Line</td></tr>
                <tr><td><code>Ctrl+F</code></td><td>Find</td></tr>
                <tr><td><code>Ctrl+H</code></td><td>Replace</td></tr>
                <tr><td><code>Ctrl+Shift+F</code></td><td>Find in Files</td></tr>
              </tbody>
            </table>

            <h3>View</h3>
            <table className="docs-shortcuts-table">
              <tbody>
                <tr><td><code>Ctrl+K Ctrl+B</code></td><td>Toggle Sidebar</td></tr>
                <tr><td><code>Ctrl+`</code></td><td>Toggle Terminal</td></tr>
                <tr><td><code>F11</code></td><td>Toggle Fullscreen</td></tr>
                <tr><td><code>Ctrl++</code></td><td>Zoom In</td></tr>
                <tr><td><code>Ctrl+-</code></td><td>Zoom Out</td></tr>
                <tr><td><code>Ctrl+0</code></td><td>Reset Zoom</td></tr>
              </tbody>
            </table>

            <h3>Build & Run</h3>
            <table className="docs-shortcuts-table">
              <tbody>
                <tr><td><code>Ctrl+B</code></td><td>Compile & Run</td></tr>
                <tr><td><code>Ctrl+Shift+B</code></td><td>Compile Only</td></tr>
                <tr><td><code>Ctrl+F5</code></td><td>Run Only</td></tr>
                <tr><td><code>Ctrl+K</code></td><td>Kill Process</td></tr>
                <tr><td><code>Ctrl+Alt+T</code></td><td>Run All Test Cases</td></tr>
              </tbody>
            </table>

          </section>

          {/* Terminal */}
          <section className="docs-section">
            <h2>Integrated Terminal</h2>
            <p>
              Doom Code includes a built-in terminal powered by xterm.js.
            </p>

            <h3>Terminal Features</h3>
            <ul>
              <li>Full terminal emulation with ANSI color support</li>
              <li>Configurable font family, size, and line height</li>
              <li>Cursor style and blinking options</li>
              <li>Scrollback buffer (default: 5000 lines)</li>
              <li>Copy/paste support</li>
              <li>Web links detection and clickable URLs</li>
            </ul>

            <h3>Using the Terminal</h3>
            <ul>
              <li>Press <code>Ctrl+`</code> to toggle terminal visibility</li>
              <li>Run shell commands, compile manually, or execute scripts</li>
              <li>View build output and program execution</li>
              <li>Clear terminal with <code>clear</code> command or Ctrl+L</li>
            </ul>
          </section>

          {/* Tips & Tricks */}
          <section className="docs-section">
            <h2>Tips & Tricks</h2>

            <h3>Competitive Programming Workflow</h3>
            <ol>
              <li>Press <code>Ctrl+Alt+N</code> to create a new CP file with template</li>
              <li>Write your solution in the editor</li>
              <li>Add test cases in the Test Cases panel</li>
              <li>Press <code>Ctrl+Alt+T</code> to run all tests</li>
              <li>Verify verdicts and execution times</li>
            </ol>

            <h3>Performance Tips</h3>
            <ul>
              <li>Disable minimap for better performance on large files</li>
              <li>Use "Competitive" build profile for fastest compilation</li>
              <li>Enable auto-save to prevent data loss</li>
              <li>Close unused tabs to reduce memory usage</li>
            </ul>

            <h3>Customization Tips</h3>
            <ul>
              <li>Create custom build profiles for specific contest platforms</li>
              <li>Set up snippets for frequently used algorithms</li>
              <li>Customize keybindings in Settings → Keybindings</li>
              <li>Use custom themes to reduce eye strain</li>
            </ul>
          </section>

          {/* Troubleshooting */}
          <section className="docs-section">
            <h2>Troubleshooting</h2>

            <h3>Build Issues</h3>
            <div className="docs-error-section">
              <h4>Compiler Not Found</h4>
              <p><strong>Solution:</strong> Install g++ or specify custom compiler path in Settings → Build</p>

              <h4>Compilation Errors</h4>
              <p><strong>Solution:</strong> Check error messages in Output panel, verify C++ standard version, ensure all includes are present</p>

              <h4>Execution Fails</h4>
              <p><strong>Solution:</strong> Check for runtime errors, verify input format, ensure executable has proper permissions</p>
            </div>

            <h3>General Issues</h3>
            <div className="docs-error-section">
              <h4>Files Not Saving</h4>
              <p><strong>Solution:</strong> Check file permissions, verify disk space, ensure file path is valid</p>

              <h4>UI Not Responding</h4>
              <p><strong>Solution:</strong> Close large files, reduce zoom level, restart application</p>

              <h4>Terminal Not Working</h4>
              <p><strong>Solution:</strong> Check shell configuration, verify terminal settings, restart application</p>
            </div>
          </section>

          {/* About */}
          <section className="docs-section">
            <h2>About Doom Code</h2>
            <p>
              <strong>Version:</strong> 1.0.0<br />
              <strong>License:</strong> MIT License<br />
              <strong>Built with:</strong> Tauri 2.0, React 18, TypeScript 5, Monaco Editor, xterm.js
            </p>
            <p>
              Doom Code is designed for competitive programmers and C++ developers who value speed,
              simplicity, and customization. With a lightweight footprint of just 13 MB, it provides
              a powerful development environment without the bloat.
            </p>

          </section>

          {/* Open Source & Customization */}
          <section className="docs-section">
            <h2>Open Source & Customization</h2>
            <p>
              Doom Code is fully open source and available on GitHub. You can explore the codebase,
              contribute improvements, report issues, or fork the project to create your own customized IDE.
            </p>

            <div className="docs-github-card">
              <div className="docs-github-icon">
                <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
              </div>
              <div className="docs-github-content">
                <h3>GitHub Repository</h3>
                <p>
                  Access the complete source code, documentation, and development resources.
                </p>
                <a
                  href={githubRepoUrl}
                  onClick={handleGitHubClick}
                  className="docs-github-link"
                >
                  <span>github.com/ig-vikas/Doom-Code-IDE</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.75 2a.75.75 0 01.75.75v7.5a.75.75 0 01-1.5 0v-7.5A.75.75 0 013.75 2zm8.5 0a.75.75 0 01.75.75v7.5a.75.75 0 01-1.5 0v-7.5a.75.75 0 01.75-.75zm-8.5 10a.75.75 0 01.75.75v.5a.75.75 0 01-1.5 0v-.5a.75.75 0 01.75-.75zm8.5 0a.75.75 0 01.75.75v.5a.75.75 0 01-1.5 0v-.5a.75.75 0 01.75-.75z" />
                    <path d="M8 1a.75.75 0 01.75.75v.688l.549-.549a.75.75 0 111.06 1.06L8.53 4.78a.75.75 0 01-1.06 0L5.64 2.95a.75.75 0 111.06-1.06l.549.549V1.75A.75.75 0 018 1z" />
                  </svg>
                </a>
              </div>
            </div>

            <h3>How to Customize</h3>
            <ol>
              <li>
                <strong>Clone the Repository:</strong>
                <code className="docs-code-block">git clone https://github.com/ig-vikas/Doom-Code-IDE.git</code>
              </li>
              <li>
                <strong>Install Dependencies:</strong>
                <code className="docs-code-block">cd Doom-Code-IDE && npm install</code>
              </li>
              <li>
                <strong>Run Development Server:</strong>
                <code className="docs-code-block">npm run tauri dev</code>
              </li>
              <li>
                <strong>Make Your Changes:</strong> Modify themes, add features, customize UI, or extend functionality
              </li>
              <li>
                <strong>Build Your Custom IDE:</strong>
                <code className="docs-code-block">npm run tauri build</code>
              </li>
            </ol>

            <h3>Contribution Guidelines</h3>
            <ul>
              <li>Fork the repository and create a feature branch</li>
              <li>Follow the existing code style and conventions</li>
              <li>Write clear commit messages</li>
              <li>Test your changes thoroughly</li>
              <li>Submit a pull request with a detailed description</li>
            </ul>

            <h3>What You Can Customize</h3>
            <div className="docs-customization-grid">
              <div className="docs-custom-item">
                <h4>🎨 Themes & Colors</h4>
                <p>Create custom UI themes and editor color schemes</p>
              </div>
              <div className="docs-custom-item">
                <h4>⚙️ Build Profiles</h4>
                <p>Add compiler configurations for different platforms</p>
              </div>

              <div className="docs-custom-item">
                <h4>📝 Code Templates</h4>
                <p>Add language support and custom templates</p>
              </div>
              <div className="docs-custom-item">
                <h4>🔧 Extensions</h4>
                <p>Build plugins and extend core functionality</p>
              </div>
              <div className="docs-custom-item">
                <h4>🎯 Shortcuts</h4>
                <p>Customize keybindings and commands</p>
              </div>
            </div>

            <h3>Community & Support</h3>
            <ul>
              <li><strong>Issues:</strong> Report bugs or request features on GitHub Issues</li>
              <li><strong>Discussions:</strong> Join community discussions and share ideas</li>
              <li><strong>Pull Requests:</strong> Contribute code improvements and new features</li>
              <li><strong>Stars:</strong> Show your support by starring the repository ⭐</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
