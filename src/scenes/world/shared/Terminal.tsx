'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import { useProximity } from '@/engine/hooks/useProximity';
import { useKeyboardControls } from '@/engine/hooks/useKeyboardControls';
import { colors } from '@/engine/constants/design-tokens';
import { eventBus } from '@/engine/managers/EventBus';

const TERMINAL_INTERACT_RADIUS = 2;

interface TerminalProps {
  id: string;
  title: string;
  lines: string[];
  position: [number, number, number];
}

export default function Terminal({ id, title, lines, position }: TerminalProps) {
  const inRange = useProximity(position, TERMINAL_INTERACT_RADIUS);
  const keyboard = useKeyboardControls();
  const wasInteractPressedRef = useRef(false);

  useFrame(() => {
    const interactPressed = keyboard.current.interact;
    if (inRange && interactPressed && !wasInteractPressedRef.current) {
      eventBus.emit('terminal:trigger', { id, title, lines });
    }
    wasInteractPressedRef.current = interactPressed;
  });

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow>
          <boxGeometry args={[0.8, 1.2, 0.15]} />
          <meshStandardMaterial
            color={colors.rackFrame}
            emissive={colors.primary}
            emissiveIntensity={0.3}
          />
        </mesh>
      </RigidBody>
      {inRange && (
        <Html position={[0, 0.9, 0]} center zIndexRange={[30, 0]}>
          <div className="pointer-events-none whitespace-nowrap font-mono text-xs text-primary">
            [E] Interact
          </div>
          <span role="status" aria-live="polite" className="sr-only">
            {title} nearby — press E to interact
          </span>
        </Html>
      )}
    </group>
  );
}
