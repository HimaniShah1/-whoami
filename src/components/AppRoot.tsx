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
