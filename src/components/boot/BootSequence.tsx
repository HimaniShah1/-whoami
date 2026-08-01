'use client';

import { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '@/engine/state/useGameStore';
import { useUIStore } from '@/engine/state/useUIStore';
import { buildBootScript } from './bootScript';
import TerminalOutput from './TerminalOutput';

const LINE_DURATION_SECONDS = 0.5;
const POST_COMPLETE_HOLD_SECONDS = 0.6;
const REDUCED_MOTION_STEP_SECONDS = 0.001;
const REDUCED_MOTION_HOLD_SECONDS = 1.5;

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const requestId = useGameStore((state) => state.requestId);
  const protocol = useGameStore((state) => state.protocol);
  const ttl = useGameStore((state) => state.ttl);
  const reducedMotion = useUIStore((state) => state.reducedMotion);

  const [script] = useState(() => buildBootScript(requestId, protocol, ttl));
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const lines = script;
    const lineCount = Math.max(lines.length, 1);
    const stepDuration = reducedMotion ? REDUCED_MOTION_STEP_SECONDS : LINE_DURATION_SECONDS;
    const holdDuration = reducedMotion ? REDUCED_MOTION_HOLD_SECONDS : POST_COMPLETE_HOLD_SECONDS;
    const progressState = { value: 0 };

    const timeline = gsap.timeline({
      onComplete: () => {
        onComplete();
      },
    });

    lines.forEach((_, index) => {
      timeline.call(() => setVisibleCount(index + 1));
      timeline.to(progressState, {
        value: ((index + 1) / lineCount) * 100,
        duration: stepDuration,
        onUpdate: () => setProgress(progressState.value),
      });
    });

    timeline.call(() => setDone(true));
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
      <div className="min-h-72 w-full max-w-lg">
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
