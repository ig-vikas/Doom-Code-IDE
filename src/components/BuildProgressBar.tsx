import { useEffect, useState } from 'react';
import { useBuildStore } from '../stores';

type BuildProgressVisual = 'hidden' | 'running' | 'success' | 'failure';

export default function BuildProgressBar() {
  const compiling = useBuildStore((s) => s.compiling);
  const running = useBuildStore((s) => s.running);
  const buildVisualState = useBuildStore((s) => s.buildVisualState);
  const buildVisualToken = useBuildStore((s) => s.buildVisualToken);
  const [visual, setVisual] = useState<BuildProgressVisual>('hidden');

  useEffect(() => {
    if (compiling || running || buildVisualState === 'running') {
      setVisual('running');
      return;
    }

    if (buildVisualState === 'success' || buildVisualState === 'failure') {
      setVisual(buildVisualState);
      const timer = window.setTimeout(() => setVisual('hidden'), 700);
      return () => window.clearTimeout(timer);
    }

    setVisual('hidden');
  }, [buildVisualState, buildVisualToken, compiling, running]);

  return (
    <div className={`build-progress ${visual !== 'hidden' ? 'visible' : ''} ${visual}`}>
      <div className="build-progress-track">
        <div className="build-progress-indeterminate" />
        <div className="build-progress-fill" />
      </div>
    </div>
  );
}
