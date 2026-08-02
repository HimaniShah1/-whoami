'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { RoomId } from '@/types/rooms';
import { eventBus, type AppEvents } from '@/engine/managers/EventBus';
import { useGameStore } from '@/engine/state/useGameStore';
import { useUIStore } from '@/engine/state/useUIStore';
import { getRoomById } from '@/engine/constants/rooms';

const FADE_DURATION_SECONDS = 0.35;
const LATENCY_SETTLE_DURATION_SECONDS = 0.8;
const LATENCY_REST_MS = 24;
const REDUCED_MOTION_DURATION_SECONDS = 0.001;

export default function RoomTransition() {
  const reducedMotion = useUIStore((state) => state.reducedMotion);
  const reducedMotionRef = useRef(reducedMotion);

  const [targetRoomId, setTargetRoomId] = useState<RoomId | null>(null);
  const [opacity, setOpacity] = useState(0);
  const isTransitioningRef = useRef(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    const handleTrigger = (payload: AppEvents['portal:trigger']) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      const fadeDuration = reducedMotionRef.current
        ? REDUCED_MOTION_DURATION_SECONDS
        : FADE_DURATION_SECONDS;
      const settleDuration = reducedMotionRef.current
        ? REDUCED_MOTION_DURATION_SECONDS
        : LATENCY_SETTLE_DURATION_SECONDS;

      setTargetRoomId(payload.targetRoomId);
      const opacityState = { value: 0 };
      const latencyState = { value: 0 };

      const timeline = gsap.timeline({
        onComplete: () => {
          isTransitioningRef.current = false;
          setTargetRoomId(null);
        },
      });
      timelineRef.current = timeline;

      timeline.to(opacityState, {
        value: 1,
        duration: fadeDuration,
        onUpdate: () => setOpacity(opacityState.value),
      });
      timeline.call(() => {
        useGameStore.getState().enterRoom(payload.targetRoomId);
        latencyState.value = useGameStore.getState().latencyMs;
        eventBus.emit('camera:reset', {
          position: payload.spawnPosition,
          facingYaw: payload.spawnFacingYaw,
        });
      });
      timeline.to(opacityState, {
        value: 0,
        duration: fadeDuration,
        onUpdate: () => setOpacity(opacityState.value),
      });
      timeline.to(latencyState, {
        value: LATENCY_REST_MS,
        duration: settleDuration,
        onUpdate: () => useGameStore.getState().setLatency(Math.round(latencyState.value)),
      });
    };

    eventBus.on('portal:trigger', handleTrigger);
    return () => {
      eventBus.off('portal:trigger', handleTrigger);
      timelineRef.current?.kill();
    };
  }, []);

  if (!targetRoomId) return null;
  const room = getRoomById(targetRoomId);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-background font-mono text-sm text-primary-muted"
      style={{ opacity }}
    >
      <div>Routing to {room.name}...</div>
    </div>
  );
}
