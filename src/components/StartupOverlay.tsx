import { useEffect, useMemo, useRef, useState } from 'react';

interface StartupOverlayProps {
  ready: boolean;
  onFinished: () => void;
}

const BOOT_LINES = [
  '[Forge] Awakening the Code Forge...',
  '[SUMMON] Lightning cores aligned...',
  '[LOAD] Runes of thunder awakened...',
  '[ARM] Hammer protocols engaged...',
  '[READY] Doom Code v1.0',
];

// Startup customization point: edit text and timing values here.
const BOOT_TOTAL_MS = 2000;
const NEXT_LINE_DELAY_MS = 80;
const WAIT_FOR_READY_MAX_MS = 0;
const BOOT_FADE_MS = 0;
const LOGO_SHOW_MS = 2000;
const EXIT_FADE_MS = 0;
const HARD_TIMEOUT_MS = 9000;

export default function StartupOverlay({ ready, onFinished }: StartupOverlayProps) {
  const totalChars = useMemo(() => BOOT_LINES.reduce((sum, line) => sum + line.length, 0), []);
  const charDelayMs = useMemo(() => {
    const lineDelayBudget = Math.max(0, BOOT_LINES.length - 1) * NEXT_LINE_DELAY_MS;
    const availableForChars = Math.max(1, BOOT_TOTAL_MS - lineDelayBudget);
    return Math.max(1, availableForChars / Math.max(1, totalChars));
  }, [totalChars]);
  const [typedLines, setTypedLines] = useState<string[]>(BOOT_LINES.map(() => ''));
  const [typedChars, setTypedChars] = useState(0);
  const [bootDone, setBootDone] = useState(false);
  const [phase, setPhase] = useState<'boot' | 'boot-fade' | 'logo' | 'exit'>('boot');
  const readyRef = useRef(ready);
  const onFinishedRef = useRef(onFinished);
  const finishedRef = useRef(false);

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, ms);
        timers.push(timer);
      });

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinishedRef.current();
    };

    const hardTimeout = window.setTimeout(() => {
      if (cancelled) return;
      setPhase('exit');
      finish();
    }, HARD_TIMEOUT_MS);
    timers.push(hardTimeout);

    const run = async () => {
      for (let line = 0; line < BOOT_LINES.length; line += 1) {
        const text = BOOT_LINES[line];
        for (let charPos = 1; charPos <= text.length; charPos += 1) {
          if (cancelled) return;
          const nextText = text.slice(0, charPos);
          setTypedLines((prev) => {
            const next = [...prev];
            next[line] = nextText;
            return next;
          });
          setTypedChars((value) => value + 1);
          await wait(charDelayMs);
        }
        if (line < BOOT_LINES.length - 1) {
          await wait(NEXT_LINE_DELAY_MS);
        }
      }

      if (cancelled) return;
      setBootDone(true);

      const readyWaitStarted = Date.now();
      while (!readyRef.current && Date.now() - readyWaitStarted < WAIT_FOR_READY_MAX_MS) {
        await wait(40);
        if (cancelled) return;
      }

      setPhase('boot-fade');
      await wait(BOOT_FADE_MS);
      if (cancelled) return;

      setPhase('logo');
      await wait(LOGO_SHOW_MS);
      if (cancelled) return;

      setPhase('exit');
      await wait(EXIT_FADE_MS);
      if (cancelled) return;

      finish();
    };

    run();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const progress = totalChars > 0 ? Math.min(1, typedChars / totalChars) : 0;
  const isBootVisible = phase === 'boot' || phase === 'boot-fade';
  const isLogoVisible = phase === 'logo';

  return (
    <div className={`startup-overlay phase-${phase}`} aria-hidden={phase === 'exit' ? 'true' : 'false'}>
      <div className={`startup-bootlog ${isBootVisible ? 'visible' : 'hidden'}`}>
        {typedLines.map((line, idx) => (
          <div key={idx} className="startup-bootline">
            {line}
            {!bootDone && idx === typedLines.findIndex((value) => value.length < BOOT_LINES[idx].length) ? (
              <span className="startup-caret">_</span>
            ) : null}
          </div>
        ))}
      </div>

      <div className={`startup-logo ${isLogoVisible ? 'visible' : 'hidden'}`}>
        <span className="startup-logo-text">Doom Code</span>
      </div>

      <div className={`startup-progress ${bootDone ? 'complete' : ''}`}>
        <div className="startup-progress-fill" style={{ transform: `scaleX(${Math.max(progress, bootDone ? 1 : 0.02)})` }} />
        <div className="startup-progress-shimmer" />
      </div>
    </div>
  );
}
