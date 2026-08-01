'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import PhysicsProvider from '@/engine/physics/PhysicsProvider';
import CameraManager from '@/engine/managers/CameraManager';
import SceneManager from '@/engine/managers/SceneManager';
import { useGameStore } from '@/engine/state/useGameStore';
import { colors } from '@/engine/constants/design-tokens';

interface ExperienceProps {
  onContextLost?: () => void;
}

export default function Experience({ onContextLost }: ExperienceProps) {
  const currentRoomId = useGameStore((state) => state.currentRoomId);

  return (
    <Canvas
      shadows
      camera={{ fov: 75, position: [0, 1.6, 5] }}
      style={{ background: colors.background }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          onContextLost?.();
        });
      }}
    >
      <fog attach="fog" args={[colors.fog, 5, 40]} />
      <Suspense fallback={null}>
        <PhysicsProvider>
          <CameraManager />
          <SceneManager activeRoomId={currentRoomId} />
        </PhysicsProvider>
      </Suspense>
    </Canvas>
  );
}
