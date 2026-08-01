'use client';

import { useRef, type ComponentRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useKeyboardControls } from '@/engine/hooks/useKeyboardControls';
import { useUIStore } from '@/engine/state/useUIStore';
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
    velocity.current.x = smoothVelocity(velocity.current.x, inputX * speed, delta, MOVEMENT_RESPONSIVENESS);
    velocity.current.z = smoothVelocity(velocity.current.z, inputZ * speed, delta, MOVEMENT_RESPONSIVENESS);

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

    verticalVelocity.current = applyGravity(verticalVelocity.current, delta, GRAVITY);
    baseY.current += verticalVelocity.current * delta;

    if (baseY.current <= EYE_HEIGHT) {
      baseY.current = EYE_HEIGHT;
      verticalVelocity.current = 0;
      isGrounded.current = true;
    }

    // Head-bob: cosmetic offset recomputed fresh each frame (not
    // accumulated), only while grounded and moving, skipped under
    // reduced-motion. Distance only accrues while grounded, so the bob
    // phase pauses cleanly during a jump and resumes on landing.
    const horizontalSpeed = Math.hypot(velocity.current.x, velocity.current.z);
    if (isGrounded.current && horizontalSpeed > 0.01) {
      distanceTraveled.current += horizontalSpeed * delta;
    }
    const bob =
      !reducedMotion && isGrounded.current
        ? headBobOffset(distanceTraveled.current, HEAD_BOB_AMPLITUDE, HEAD_BOB_FREQUENCY)
        : 0;

    // Second flag for the same intentional mutation — see the comment above
    // useFrame() for why this is safe to suppress.
    // eslint-disable-next-line react-hooks/immutability
    camera.position.y = baseY.current + bob;
  });

  return <PointerLockControls ref={controlsRef} />;
}
