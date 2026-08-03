# Player Physics Body Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the player a real Rapier physics body so `CameraManager`'s movement is resolved through physics — fixed colliders (locked portals, room floors) genuinely block the player — while preserving the exact movement feel tuned in Phase 2.

**Architecture:** `CameraManager` gains an invisible `kinematicPosition` `RigidBody` with a `CapsuleCollider`, driven each frame by a Rapier `KinematicCharacterController` (`world.createCharacterController`). The existing `smoothVelocity`/`applyGravity`/head-bob math is unchanged — it still computes a *desired* per-frame displacement — but that displacement is now fed through `controller.computeColliderMovement()` for collision resolution before being applied, and `camera.position` is derived from the resolved `RigidBody` translation instead of being written directly. Grounded state comes from `controller.computedGrounded()` instead of a hardcoded height check. A small void-fall safety net catches the new failure mode this introduces (walking off a room's floor edge can now cause an actual fall, since grounding is no longer height-only).

**Tech Stack:** React Three Fiber, `@react-three/rapier` `^2.2.0`, `@dimforge/rapier3d-compat` (already installed, verified against its shipped `.d.ts` files), Vitest.

## Global Constraints

- TypeScript strict mode; `@typescript-eslint/no-explicit-any` is an error. Use `unknown` + narrowing instead of `any`.
- Components: PascalCase, default export, no exceptions. Hooks/utils/constants modules: camelCase, named exports only.
- This project requires Node >= 22 (`.nvmrc` pins `22.22.3`); every Bash command invoking `npm`/`npx`/`node` must chain the nvm switch in the same command: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && <command>` — shell state does not persist between separate tool calls.
- This codebase has hit real, newer React-Compiler-aware ESLint rules (`react-hooks/set-state-in-effect`, `react-hooks/immutability`, `react-hooks/exhaustive-deps`, `react-hooks/static-components`) in every phase so far. If `npm run lint` flags a new error on code that matches an existing pattern in the file being edited, add a scoped `eslint-disable-next-line <rule>` with a one-line justification, matching the file's own precedent — do not restructure working logic to satisfy an overly aggressive static-analysis rule. Note: this plan's `CameraManager` rewrite replaces its one `camera.position.y = ...` *assignment* with a `camera.position.set(...)` *method call* — per this file's own existing comment, `react-hooks/immutability` only flags assignment syntax, not method calls, so the two `eslint-disable-next-line react-hooks/immutability` comments from the current file become unnecessary and should be removed, not carried forward.
- Pure functions and presentational/state-only units get unit tests. `useFrame`/`useThree`-dependent, physics-driven components are manually verified only, matching `CameraManager.tsx`'s established convention — do not attempt to unit-test them.
- The sandboxed browser pane used for manual verification has known limitations (documented in this project's memory): Pointer Lock API fails there, so mouse-look can't be verified — verify WASD movement/collision instead; `requestAnimationFrame` is throttled, so don't judge feel/timing precision from the pane, only correctness of behavior (does the player stop at a wall, does it fall and recover, etc.).
- Every task ends with `npx tsc --noEmit` passing and, where applicable, `npm run test` passing, before committing.
- `node_modules` is not present in this worktree yet (each `git worktree` gets its own). Task 1's first step installs dependencies — do this before running any `npm`/`npx` command in any task.

---

### Task 1: Player capsule/controller constants

**Files:**
- Modify: `src/engine/constants/player.ts`
- Test: `src/engine/constants/player.test.ts` (new)

**Interfaces:**
- Produces: `PLAYER_CAPSULE_RADIUS: number`, `PLAYER_CAPSULE_HALF_HEIGHT: number`, `PLAYER_EYE_OFFSET: number`, `CHARACTER_CONTROLLER_OFFSET: number`, `VOID_FALL_RESET_Y: number` — all named exports alongside the existing constants in this file. Consumed by Task 2 (`CameraManager.tsx`).

- [ ] **Step 1: Install dependencies for this worktree**

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npm install`
Expected: installs succeed, `node_modules/@react-three/rapier` and `node_modules/@dimforge/rapier3d-compat` present.

- [ ] **Step 2: Write the failing test**

Create `src/engine/constants/player.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  EYE_HEIGHT,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_RADIUS,
  PLAYER_EYE_OFFSET,
} from './player';

describe('player capsule dimensions', () => {
  it('the capsule total height equals EYE_HEIGHT, so grounded eyes sit at EYE_HEIGHT with no separate tuning constant', () => {
    const capsuleHeight = 2 * (PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS);
    expect(capsuleHeight).toBeCloseTo(EYE_HEIGHT);
  });

  it('PLAYER_EYE_OFFSET is exactly half the capsule height (eyes sit at the capsule top)', () => {
    expect(PLAYER_EYE_OFFSET).toBeCloseTo(EYE_HEIGHT / 2);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npm run test -- src/engine/constants/player.test.ts`
Expected: FAIL — `PLAYER_CAPSULE_HALF_HEIGHT` (and the other three names) are not exported from `./player`.

- [ ] **Step 4: Add the constants**

Modify `src/engine/constants/player.ts` — append after the existing constants (append, do not reorder or remove any existing line):
```ts
export const PLAYER_CAPSULE_RADIUS = 0.3; // meters — player collider radius
// Chosen so the capsule's total height (2 * (halfHeight + radius)) equals
// EYE_HEIGHT exactly: standing on a floor at y=0, the capsule's center sits
// at EYE_HEIGHT/2 and its top (where the eyes are) sits at EYE_HEIGHT —
// matching the pre-physics grounded camera height with no new tuning.
export const PLAYER_CAPSULE_HALF_HEIGHT = EYE_HEIGHT / 2 - PLAYER_CAPSULE_RADIUS;
export const PLAYER_EYE_OFFSET = EYE_HEIGHT / 2; // meters — capsule center to eye (== capsule top)
export const CHARACTER_CONTROLLER_OFFSET = 0.01; // meters — Rapier's recommended small stability gap
export const VOID_FALL_RESET_Y = -20; // meters — below this, snap the player back to room-center
```

- [ ] **Step 5: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npm run test -- src/engine/constants/player.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Type-check and commit**

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npx tsc --noEmit`
Expected: no errors.
```bash
git add src/engine/constants/player.ts src/engine/constants/player.test.ts
git commit -m "Add player capsule/character-controller constants"
```

---

### Task 2: Route CameraManager's movement through a KinematicCharacterController

**Files:**
- Modify: `src/engine/managers/CameraManager.tsx`

**Interfaces:**
- Consumes: `PLAYER_CAPSULE_RADIUS`, `PLAYER_CAPSULE_HALF_HEIGHT`, `PLAYER_EYE_OFFSET`, `CHARACTER_CONTROLLER_OFFSET`, `VOID_FALL_RESET_Y` (Task 1); `RigidBody`, `CapsuleCollider`, `useRapier`, `RapierRigidBody`, `RapierCollider` (`@react-three/rapier`, already a project dependency); `KinematicCharacterController` (`@dimforge/rapier3d-compat`, a transitive dependency of `@react-three/rapier` already in `package-lock.json`).
- Produces: no change to `CameraManager`'s external interface (still default-exported, prop-less). Its rendered output now includes a `RigidBody`/`CapsuleCollider` pair in addition to the existing `PointerLockControls`.

No unit test — same manually-verified bucket as today's `CameraManager.tsx` (verified in Task 3).

- [ ] **Step 1: Replace the full contents of `CameraManager.tsx`**

Replace the full contents of `src/engine/managers/CameraManager.tsx`:
```tsx
'use client';

import { useEffect, useRef, type ComponentRef } from 'react';
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
  JUMP_VELOCITY,
  MOVEMENT_RESPONSIVENESS,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_RADIUS,
  PLAYER_EYE_OFFSET,
  SPRINT_MULTIPLIER,
  VOID_FALL_RESET_Y,
} from '@/engine/constants/player';

// Must match Experience.tsx's Canvas `camera={{ position: [...] }}` prop so
// the physics body and the camera agree on where the player starts, before
// any camera:reset event has fired.
const INITIAL_SPAWN_POSITION: [number, number, number] = [0, EYE_HEIGHT, 5];

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
  const teleportTo = (position: [number, number, number], yaw: number) => {
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
  };

  useEffect(() => {
    const handleReset = ({ position, facingYaw }: AppEvents['camera:reset']) => {
      teleportTo(position, facingYaw);
    };
    eventBus.on('camera:reset', handleReset);
    return () => eventBus.off('camera:reset', handleReset);
  }, [camera]);

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

    // Jump: edge-triggered on Space so a held key doesn't multi-jump.
    if (keys.jump && !wasJumpPressed.current && isGrounded.current) {
      verticalVelocity.current = JUMP_VELOCITY;
      isGrounded.current = false;
    }
    wasJumpPressed.current = keys.jump;

    const previousVerticalVelocity = verticalVelocity.current;
    verticalVelocity.current = applyGravity(verticalVelocity.current, delta, GRAVITY);
    desiredMovement.current.y = ((previousVerticalVelocity + verticalVelocity.current) / 2) * delta;

    // The character controller resolves desiredMovement against fixed
    // colliders (room floors, locked portals) and returns a corrected,
    // slide-adjusted displacement — this is what makes those colliders
    // actually stop the player, unlike the old direct position write.
    controller.computeColliderMovement(collider, desiredMovement.current);
    const corrected = controller.computedMovement();
    const grounded = controller.computedGrounded();

    const current = rigidBody.translation();
    const next = {
      x: current.x + corrected.x,
      y: current.y + corrected.y,
      z: current.z + corrected.z,
    };
    rigidBody.setNextKinematicTranslation(next);

    isGrounded.current = grounded;
    if (grounded) {
      verticalVelocity.current = 0;
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
```

- [ ] **Step 2: Type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npx tsc --noEmit`
Expected: no errors. If `KinematicCharacterController` fails to resolve from `@dimforge/rapier3d-compat`, confirm the import path against `node_modules/@dimforge/rapier3d-compat/control/character_controller.d.ts` (it's exported from that package's root entry point via its `control` barrel).

- [ ] **Step 3: Lint**

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npm run lint`
Expected: no errors. This file's only remaining Three.js-object mutations are method calls (`camera.position.set(...)`, `camera.rotation.set(...)`, `.addScaledVector(...)`) — per this file's own historical comment, `react-hooks/immutability` only flags assignment-expression mutations (`camera.position.y = ...`), which no longer appear in this file, so no `eslint-disable` comments should be needed here. If `react-hooks/exhaustive-deps` flags the `useEffect` around `handleReset` for not listing `teleportTo`, add `teleportTo` to that effect's dependency array rather than suppressing (it's a plain function recreated each render, listing it is correct and won't cause an infinite loop since the effect only re-subscribes, it doesn't call `teleportTo` during render).

- [ ] **Step 4: Commit**

```bash
git add src/engine/managers/CameraManager.tsx
git commit -m "Route CameraManager movement through a Rapier KinematicCharacterController"
```

---

### Task 3: Full verification pass

**Files:** none created; this task only runs and observes.

- [ ] **Step 1: Run the full automated check suite**

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npm run test`
Expected: all tests pass, including the 2 new ones from Task 1, with no regressions to any existing suite.

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npx tsc --noEmit`
Expected: no errors.

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npm run lint`
Expected: no errors.

Run: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && npm run build`
Expected: production build succeeds.

- [ ] **Step 2: Manual browser walkthrough**

Start the dev server and open it in the browser preview. Note: Pointer Lock fails in the sandboxed browser pane (known limitation), so verify WASD movement and collision, not mouse-look precision.

1. Skip or complete the boot sequence into `load-balancer`; confirm the player still walks, sprints, and jumps with the same feel as before this change (same speed, same jump height/arc, same head-bob while moving).
2. Walk into the room's floor from an angle (e.g. holding forward continuously) and confirm the player doesn't clip through the floor or jitter — the capsule should rest cleanly at `EYE_HEIGHT`.
3. Verify real collision blocking against a locked portal. `ROOM_REGISTRY`'s linear `requiresVisited` chain means no portal is naturally locked while reachable, so force the locked/blocking state temporarily: in `src/scenes/world/shared/Portal.tsx`, find the line `const unlocked = useGameStore((state) => state.isUnlocked(targetRoomId));` and temporarily change it to `const unlocked = false;` (do not commit this). Restart the dev server, walk into any portal, and confirm the player is physically stopped by its blocking collider rather than passing through. Then revert the edit — run `git diff src/scenes/world/shared/Portal.tsx` to confirm it's back to the committed version (or `git checkout -- src/scenes/world/shared/Portal.tsx` if not) — before continuing to the next step.
4. Cross an actually-unlocked portal; confirm `RoomTransition` still fades, `enterRoom` still fires, and the player spawns correctly in the next room facing the right direction (regression check — this exercises the `camera:reset` teleport path through the new `RigidBody.setTranslation` call).
5. Deliberately walk away from the room's center for several seconds past the floor's edge; confirm the player falls and is then snapped back to `(0, EYE_HEIGHT, 0)` rather than falling forever.
6. Open browser devtools and confirm no console errors throughout.

Note any issues (jitter, clipping, incorrect spawn facing, void-fall not triggering) and fix them before proceeding.

- [ ] **Step 3: Confirm no uncommitted changes remain**

Run: `git status`
Expected: clean working tree (everything from Steps 1-2 was either already committed in earlier tasks, or Step 2's fixes have been committed here).

If Step 2 required fixes, commit them:
```bash
git add -A
git commit -m "Fix issues found during player physics body manual verification"
```
