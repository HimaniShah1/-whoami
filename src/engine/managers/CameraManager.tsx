'use client';

import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier';
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat';
import { QueryFilterFlags } from '@dimforge/rapier3d-compat';
import { useKeyboardControls } from '@/engine/hooks/useKeyboardControls';
import { useUIStore } from '@/engine/state/useUIStore';
import { eventBus, type AppEvents } from '@/engine/managers/EventBus';
import { applyGravity, headBobOffset, smoothVelocity } from '@/lib/movement';
import {
  BASE_SPEED,
  CHARACTER_CONTROLLER_OFFSET,
  EYE_HEIGHT,
  GRAVITY,
  HEAD_BOB_AMPLITUDE,
  HEAD_BOB_FREQUENCY,
  INITIAL_SPAWN_POSITION,
  JUMP_VELOCITY,
  MOVEMENT_RESPONSIVENESS,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_RADIUS,
  PLAYER_EYE_OFFSET,
  SPRINT_MULTIPLIER,
  VOID_FALL_RESET_Y,
} from '@/engine/constants/player';

export default function CameraManager() {
  const controlsRef = useRef<ComponentRef<typeof PointerLockControls>>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const colliderRef = useRef<RapierCollider>(null);
  const characterControllerRef = useRef<KinematicCharacterController | null>(null);
  const keyboard = useKeyboardControls();
  const reducedMotion = useUIStore((state) => state.reducedMotion);
  const { camera } = useThree();
  const { world } = useRapier();

  const forwardVector = useRef(new THREE.Vector3());
  const rightVector = useRef(new THREE.Vector3());
  const desiredMovement = useRef(new THREE.Vector3());
  const velocity = useRef({ x: 0, z: 0 });
  const distanceTraveled = useRef(0);
  const verticalVelocity = useRef(0);
  const isGrounded = useRef(true);
  const wasJumpPressed = useRef(false);
  const awaitingGround = useRef(false);
  const bobWeight = useRef(0);

  useEffect(() => {
    const controller = world.createCharacterController(CHARACTER_CONTROLLER_OFFSET);
    characterControllerRef.current = controller;
    return () => {
      world.removeCharacterController(controller);
      characterControllerRef.current = null;
    };
  }, [world]);

  // Teleports the camera and the physics body together to an exact
  // transform, resetting all per-frame movement state. Two callers: the
  // camera:reset event below (portal crossings) and the void-fall safety
  // net inside useFrame (walking off a room's floor edge) — extracted here
  // rather than duplicated since both need the identical reset sequence.
  const teleportTo = useCallback(
    (position: [number, number, number], yaw: number) => {
      camera.position.set(position[0], position[1], position[2]);
      camera.rotation.set(0, yaw, 0);
      rigidBodyRef.current?.setTranslation(
        { x: position[0], y: position[1] - PLAYER_EYE_OFFSET, z: position[2] },
        true,
      );
      velocity.current.x = 0;
      velocity.current.z = 0;
      verticalVelocity.current = 0;
      isGrounded.current = true;
      distanceTraveled.current = 0;
      bobWeight.current = 0;
      awaitingGround.current = true;
    },
    [camera],
  );

  useEffect(() => {
    const handleReset = ({ position, facingYaw }: AppEvents['camera:reset']) => {
      teleportTo(position, facingYaw);
    };
    eventBus.on('camera:reset', handleReset);
    return () => eventBus.off('camera:reset', handleReset);
  }, [camera, teleportTo]);

  // R3F's useFrame is the sanctioned place to imperatively mutate the camera
  // returned by useThree() every frame — this is not a React Compiler
  // violation, it's how R3F drives Three.js.
  useFrame((_, delta) => {
    const rigidBody = rigidBodyRef.current;
    const collider = colliderRef.current;
    const controller = characterControllerRef.current;
    if (!rigidBody || !collider || !controller) return;

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

    desiredMovement.current.set(0, 0, 0);
    desiredMovement.current.addScaledVector(forwardVector.current, -velocity.current.z * delta);
    desiredMovement.current.addScaledVector(rightVector.current, velocity.current.x * delta);

    const jumpWasPressedLastFrame = wasJumpPressed.current;
    wasJumpPressed.current = keys.jump;

    if (awaitingGround.current) {
      // Frozen until real ground is confirmed under the teleported position
      // (see teleportTo). During a portal crossing, the destination room's
      // floor collider may not have mounted yet (its RigidBody unmounts with
      // the old room and remounts once the new room's lazy chunk resolves) —
      // integrating gravity during that gap can sink the player into or
      // through the floor once it does appear.
      desiredMovement.current.y = 0;
    } else {
      // Jump: edge-triggered on Space so a held key doesn't multi-jump.
      if (keys.jump && !jumpWasPressedLastFrame && isGrounded.current) {
        verticalVelocity.current = JUMP_VELOCITY;
        isGrounded.current = false;
      }

      const previousVerticalVelocity = verticalVelocity.current;
      verticalVelocity.current = applyGravity(verticalVelocity.current, delta, GRAVITY);
      desiredMovement.current.y = ((previousVerticalVelocity + verticalVelocity.current) / 2) * delta;
    }

    // The character controller resolves desiredMovement against fixed
    // colliders (room floors, locked portals) and returns a corrected,
    // slide-adjusted displacement — this is what makes those colliders
    // actually stop the player, unlike the old direct position write.
    controller.computeColliderMovement(
      collider,
      desiredMovement.current,
      QueryFilterFlags.EXCLUDE_SENSORS,
    );
    const corrected = controller.computedMovement();
    const grounded = controller.computedGrounded();

    const current = rigidBody.translation();
    const next = {
      x: current.x + corrected.x,
      y: current.y + corrected.y,
      z: current.z + corrected.z,
    };
    rigidBody.setNextKinematicTranslation(next);

    const rising = verticalVelocity.current > 0;
    isGrounded.current = grounded && !rising;
    if (grounded && !rising) {
      verticalVelocity.current = 0;
    }

    if (awaitingGround.current && grounded) {
      awaitingGround.current = false;
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

    camera.position.set(next.x, next.y + PLAYER_EYE_OFFSET + bob, next.z);

    // Void-fall safety net: today's rooms are a single 20x20 floor with no
    // perimeter walls, so walking far enough off-center now lets the player
    // fall (real collision-based grounding, unlike the old height-only
    // clamp, doesn't stop them). Every room's floor is centered at its local
    // origin, so (0, EYE_HEIGHT, 0) is always a safe recovery point.
    if (camera.position.y < VOID_FALL_RESET_Y) {
      teleportTo([0, EYE_HEIGHT, 0], 0);
    }
  });

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        type="kinematicPosition"
        colliders={false}
        enabledRotations={[false, false, false]}
        position={[
          INITIAL_SPAWN_POSITION[0],
          INITIAL_SPAWN_POSITION[1] - PLAYER_EYE_OFFSET,
          INITIAL_SPAWN_POSITION[2],
        ]}
      >
        <CapsuleCollider ref={colliderRef} args={[PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_CAPSULE_RADIUS]} />
      </RigidBody>
      <PointerLockControls ref={controlsRef} />
    </>
  );
}
