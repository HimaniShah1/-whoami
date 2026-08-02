'use client';

import { useCallback, useEffect, useState } from 'react';
import Experience from '@/components/canvas/Experience';
import Hud from '@/components/hud/Hud';
import RoomTransition from '@/components/canvas/RoomTransition';
import WebGLUnavailable from '@/components/canvas/WebGLUnavailable';
import ConnectionLost from '@/components/canvas/ConnectionLost';
import BootSequence from '@/components/boot/BootSequence';
import { isWebGLAvailable } from '@/lib/webgl';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { hasSeenBootSequence, markBootSequenceSeen } from '@/lib/session';
import { useUIStore } from '@/engine/state/useUIStore';

export default function AppRoot() {
  const [webglReady, setWebglReady] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const setReducedMotion = useUIStore((state) => state.setReducedMotion);

  useEffect(() => {
    // One-time mount detection of browser-only APIs (WebGL, matchMedia) — must run
    // in an effect (not during render) to avoid an SSR/hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglReady(isWebGLAvailable());
    setReducedMotion(prefersReducedMotion());
    setBootDone(hasSeenBootSequence());
  }, [setReducedMotion]);

  const handleBootComplete = useCallback(() => {
    markBootSequenceSeen();
    setBootDone(true);
  }, []);

  if (webglReady === null) return null;
  if (!webglReady) return <WebGLUnavailable />;
  if (contextLost) return <ConnectionLost />;

  if (!bootDone) {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  return (
    <>
      <Experience onContextLost={() => setContextLost(true)} />
      <Hud />
      <RoomTransition />
    </>
  );
}
