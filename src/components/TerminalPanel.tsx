import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useThemeStore, useSettingsStore } from '../stores';
import { onTerminalOutput } from '../services/commandService';
import '@xterm/xterm/css/xterm.css';

export default function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const colors = useThemeStore((s) => s.colors);
  const terminalSettings = useSettingsStore((s) => s.settings.terminal);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      fontSize: terminalSettings.fontSize,
      fontFamily: terminalSettings.fontFamily,
      lineHeight: terminalSettings.lineHeight,
      theme: {
        background: colors.bgDeepest,
        foreground: colors.textPrimary,
        cursor: colors.accentPrimary,
        selectionBackground: colors.bgHighlight,
      },
      cursorBlink: terminalSettings.cursorBlink,
      cursorStyle: terminalSettings.cursorStyle,
      scrollback: terminalSettings.scrollback,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(containerRef.current);
    fitAddon.fit();
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[36mDoom Code Terminal\x1b[0m');
    term.writeln('\x1b[2mBuild output will appear here\x1b[0m');
    term.writeln('');

    // Connect to build output from command service
    const unsub = onTerminalOutput((data) => {
      term.write(data);
    });

    const onResize = () => {
      try {
        fitAddon.fit();
      } catch {}
    };
    window.addEventListener('resize', onResize);

    const observer = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {}
    });
    observer.observe(containerRef.current);

    return () => {
      unsub();
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  // Update theme
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = {
        background: colors.bgDeepest,
        foreground: colors.textPrimary,
        cursor: colors.accentPrimary,
        selectionBackground: colors.bgHighlight,
      };
    }
  }, [colors]);

  // Update terminal font settings
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.fontSize = terminalSettings.fontSize;
      termRef.current.options.fontFamily = terminalSettings.fontFamily;
      termRef.current.options.lineHeight = terminalSettings.lineHeight;
      termRef.current.options.cursorBlink = terminalSettings.cursorBlink;
      termRef.current.options.cursorStyle = terminalSettings.cursorStyle;
      termRef.current.options.scrollback = terminalSettings.scrollback;
      try {
        fitAddonRef.current?.fit();
      } catch {}
    }
  }, [terminalSettings.cursorBlink, terminalSettings.cursorStyle, terminalSettings.fontFamily, terminalSettings.fontSize, terminalSettings.lineHeight, terminalSettings.scrollback]);

  return <div ref={containerRef} className="terminal-container" />;
}
