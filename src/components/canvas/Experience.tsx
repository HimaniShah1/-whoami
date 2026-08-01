'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import PhysicsProvider from '@/engine/physics/PhysicsProvider';
import CameraManager from '@/engine/managers/CameraManager';
import SceneManager from '@/engine/managers/SceneManager';
import { useGameStore } from '@/engine/state/useGameStore';
import { colors } from '@/engine/constants/design-tokens';

export default function Experience() {
  const currentRoomId = useGameStore((state) => state.currentRoomId);

  return (
    <Canvas
      shadows
      camera={{ fov: 75, position: [0, 1.6, 5] }}
      style={{ background: colors.background }}
    >
      <Suspense fallback={null}>
        <PhysicsProvider>
          <CameraManager />
          <SceneManager activeRoomId={currentRoomId} />
        </PhysicsProvider>
      </Suspense>
    </Canvas>
  );
}
