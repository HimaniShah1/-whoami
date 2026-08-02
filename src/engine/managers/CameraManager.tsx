'use client';

import { useEffect, useRef, type ComponentRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useKeyboardControls } from '@/engine/hooks/useKeyboardControls';
import { useUIStore } from '@/engine/state/useUIStore';
import { eventBus, type AppEvents } from '@/engine/managers/EventBus';
import { applyGravity, headBobOffset, smoothVelocity } from '@/lib/movement';
import {
  BASE_SPEED,
  EYE_HEIGHT,
  GRAVITY,
  HEAD_BOB_AMPLITUDE,
  HEAD_BOB_FREQUENCY,
  JUMP_VELOCITY,
  MOVEMENT_RESPONSIVENESS,
  SPRINT_MULTIPLIER,
} from '@/engine/constants/player';

export default function CameraManager() {
  const controlsRef = useRef<ComponentRef<typeof PointerLockControls>>(null);
  const keyboard = useKeyboardControls();
  const reducedMotion = useUIStore((state) => state.reducedMotion);
  const { camera } = useThree();

  const forwardVector = useRef(new THREE.Vector3());
  const rightVector = useRef(new THREE.Vector3());
  const velocity = useRef({ x: 0, z: 0 });
  const distanceTraveled = useRef(0);
  const baseY = useRef(EYE_HEIGHT);
  const verticalVelocity = useRef(0);
  const isGrounded = useRef(true);
  const wasJumpPressed = useRef(false);
  const bobWeight = useRef(0);

  useEffect(() => {
    const handleReset = ({ position, facingYaw }: AppEvents['camera:reset']) => {
      camera.position.set(position[0], position[1], position[2]);
      camera.rotation.set(0, facingYaw, 0);
      baseY.current = position[1];
      velocity.current.x = 0;
      velocity.current.z = 0;
      verticalVelocity.current = 0;
      isGrounded.current = true;
      distanceTraveled.current = 0;
      bobWeight.current = 0;
    };
    eventBus.on('camera:reset', handleReset);
    return () => eventBus.off('camera:reset', handleReset);
  }, [camera]);

  // R3F's useFrame is the sanctioned place to imperatively mutate the camera
  // returned by useThree() every frame — this is not a React Compiler
  // violation, it's how R3F drives Three.js. react-hooks/immutability flags
  // this callback (and, separately, the `camera.position.y = ...` line
  // below) purely because that line uses assignment syntax; it doesn't flag
  // the equivalent addScaledVector() mutations above since those are method
  // calls, not assignment expressions — a real gap in the rule, not a bug
  // in this code.
  // eslint-disable-next-line react-hooks/immutability
  useFrame((_, delta) => {
    const keys = keyboard.current;

    // Horizontal movement: smoothed toward target velocity. smoothVelocity
    // IS the inertia mechanic — it also gives sprint a smooth transition for
    // free, since sprint just changes the target speed being eased toward.
    let inputX = 0;
    let inputZ = 0;
    if (keys.forward) inputZ -= 1;
    if (keys.backward) inputZ += 1;
    if (keys.left) inputX -= 1;
    if (keys.right) inputX += 1;

    const inputLength = Math.hypot(inputX, inputZ);
    if (inputLength > 0) {
      inputX /= inputLength;
      inputZ /= inputLength;
    }

    const speed = BASE_SPEED * (keys.sprint ? SPRINT_MULTIPLIER : 1);
    velocity.current.x = smoothVelocity(
      velocity.current.x,
      inputX * speed,
      delta,
      MOVEMENT_RESPONSIVENESS,
    );
    velocity.current.z = smoothVelocity(
      velocity.current.z,
      inputZ * speed,
      delta,
      MOVEMENT_RESPONSIVENESS,
    );

    camera.getWorldDirection(forwardVector.current);
    forwardVector.current.y = 0;
    forwardVector.current.normalize();
    rightVector.current.crossVectors(forwardVector.current, camera.up).normalize();

    camera.position.addScaledVector(forwardVector.current, -velocity.current.z * delta);
    camera.position.addScaledVector(rightVector.current, velocity.current.x * delta);

    // Jump: edge-triggered on Space so a held key doesn't multi-jump.
    if (keys.jump && !wasJumpPressed.current && isGrounded.current) {
      verticalVelocity.current = JUMP_VELOCITY;
      isGrounded.current = false;
    }
    wasJumpPressed.current = keys.jump;

    const previousVerticalVelocity = verticalVelocity.current;
    verticalVelocity.current = applyGravity(verticalVelocity.current, delta, GRAVITY);
    baseY.current += ((previousVerticalVelocity + verticalVelocity.current) / 2) * delta;

    if (baseY.current <= EYE_HEIGHT) {
      baseY.current = EYE_HEIGHT;
      verticalVelocity.current = 0;
      isGrounded.current = true;
    }

    // Head-bob: cosmetic offset recomputed fresh each frame (not
    // accumulated). Distance only accrues while grounded, so the bob phase
    // pauses cleanly during a jump and resumes on landing. The raw offset is
    // always computed, but it's scaled by a smoothed bobWeight (0-1) that
    // eases toward 1 while grounded-and-moving-and-not-reduced-motion, and
    // toward 0 otherwise, so the applied offset fades out/in instead of
    // snapping to/from zero when starting, stopping, jumping, or landing.
    const horizontalSpeed = Math.hypot(velocity.current.x, velocity.current.z);
    if (isGrounded.current && horizontalSpeed > 0.01) {
      distanceTraveled.current += horizontalSpeed * delta;
    }
    const targetBobWeight =
      !reducedMotion && isGrounded.current && horizontalSpeed > 0.01 ? 1 : 0;
    bobWeight.current = smoothVelocity(
      bobWeight.current,
      targetBobWeight,
      delta,
      MOVEMENT_RESPONSIVENESS,
    );
    const bob =
      headBobOffset(distanceTraveled.current, HEAD_BOB_AMPLITUDE, HEAD_BOB_FREQUENCY) *
      bobWeight.current;

    // Second flag for the same intentional mutation — see the comment above
    // useFrame() for why this is safe to suppress.
    // eslint-disable-next-line react-hooks/immutability
    camera.position.y = baseY.current + bob;
  });

  return <PointerLockControls ref={controlsRef} />;
}
