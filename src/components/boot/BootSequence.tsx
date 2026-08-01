'use client';

import { useEffect, useMemo, useState } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '@/engine/state/useGameStore';
import { useUIStore } from '@/engine/state/useUIStore';
import { buildBootScript } from './bootScript';
import TerminalOutput from './TerminalOutput';

const LINE_DURATION_SECONDS = 0.5;
const POST_COMPLETE_HOLD_SECONDS = 0.6;
const REDUCED_MOTION_DURATION_SECONDS = 0.001;

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const requestId = useGameStore((state) => state.requestId);
  const protocol = useGameStore((state) => state.protocol);
  const ttl = useGameStore((state) => state.ttl);
  const reducedMotion = useUIStore((state) => state.reducedMotion);

  const script = useMemo(() => buildBootScript(requestId, protocol, ttl), [requestId, protocol, ttl]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const lines = script;
    const stepDuration = reducedMotion ? REDUCED_MOTION_DURATION_SECONDS : LINE_DURATION_SECONDS;
    const holdDuration = reducedMotion ? REDUCED_MOTION_DURATION_SECONDS : POST_COMPLETE_HOLD_SECONDS;
    const progressState = { value: 0 };

    const timeline = gsap.timeline({
      onComplete: () => {
        setDone(true);
        onComplete();
      },
    });

    lines.forEach((_, index) => {
      timeline.call(() => setVisibleCount(index + 1));
      timeline.to(progressState, {
        value: ((index + 1) / lines.length) * 100,
        duration: stepDuration,
        onUpdate: () => setProgress(progressState.value),
      });
    });

    timeline.to({}, { duration: holdDuration });

    const skip = () => timeline.progress(1);
    window.addEventListener('keydown', skip);
    window.addEventListener('click', skip);

    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('click', skip);
      timeline.kill();
    };
  }, [onComplete, reducedMotion, script]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg">
        <TerminalOutput
          visibleLines={script.slice(0, visibleCount)}
          progress={progress}
          done={done}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
}
