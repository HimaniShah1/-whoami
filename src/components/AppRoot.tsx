'use client';

import { useEffect, useState } from 'react';
import Experience from '@/components/canvas/Experience';
import Hud from '@/components/hud/Hud';
import WebGLUnavailable from '@/components/canvas/WebGLUnavailable';
import ConnectionLost from '@/components/canvas/ConnectionLost';
import { isWebGLAvailable } from '@/lib/webgl';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { useUIStore } from '@/engine/state/useUIStore';

export default function AppRoot() {
  const [webglReady, setWebglReady] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const setReducedMotion = useUIStore((state) => state.setReducedMotion);

  useEffect(() => {
    // One-time mount detection of browser-only APIs (WebGL, matchMedia) — must run
    // in an effect (not during render) to avoid an SSR/hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglReady(isWebGLAvailable());
    setReducedMotion(prefersReducedMotion());
  }, [setReducedMotion]);

  if (webglReady === null) return null;
  if (!webglReady) return <WebGLUnavailable />;
  if (contextLost) return <ConnectionLost />;

  return (
    <>
      <Experience onContextLost={() => setContextLost(true)} />
      <Hud />
    </>
  );
}
