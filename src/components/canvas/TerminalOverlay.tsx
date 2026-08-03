'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { eventBus, type AppEvents } from '@/engine/managers/EventBus';
import { useUIStore } from '@/engine/state/useUIStore';
import TerminalPanel from './TerminalPanel';

const LINE_DURATION_SECONDS = 0.4;
const REDUCED_MOTION_DURATION_SECONDS = 0.001;

export default function TerminalOverlay() {
  const reducedMotion = useUIStore((state) => state.reducedMotion);
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const [openId, setOpenId] = useState<string | null>(null);
  const openIdRef = useRef<string | null>(null);
  useEffect(() => {
    openIdRef.current = openId;
  }, [openId]);

  const [title, setTitle] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [done, setDone] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const handleTrigger = (payload: AppEvents['terminal:trigger']) => {
      timelineRef.current?.kill();

      if (openIdRef.current === payload.id) {
        setOpenId(null);
        return;
      }

      setOpenId(payload.id);
      setTitle(payload.title);
      setLines(payload.lines);
      setVisibleCount(0);
      setDone(false);

      const stepDuration = reducedMotionRef.current
        ? REDUCED_MOTION_DURATION_SECONDS
        : LINE_DURATION_SECONDS;

      const timeline = gsap.timeline({
        onComplete: () => setDone(true),
      });
      timelineRef.current = timeline;

      payload.lines.forEach((_, index) => {
        timeline.call(() => setVisibleCount(index + 1));
        timeline.to({}, { duration: stepDuration });
      });
    };

    eventBus.on('terminal:trigger', handleTrigger);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && openIdRef.current !== null) {
        timelineRef.current?.kill();
        setOpenId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      eventBus.off('terminal:trigger', handleTrigger);
      window.removeEventListener('keydown', handleKeyDown);
      timelineRef.current?.kill();
    };
  }, []);

  if (!openId) return null;

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <TerminalPanel
        title={title}
        visibleLines={lines.slice(0, visibleCount)}
        done={done}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
