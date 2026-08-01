# Phase 2: Player & Camera Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phase 1's rough, un-smoothed WASD camera movement with proper game feel — inertia-based movement smoothing, head-bob while walking, and a simple kinematic jump — with no changes outside the camera/movement system.

**Architecture:** Three pure, unit-tested movement math functions live in `src/lib/movement.ts` (`smoothVelocity`, `headBobOffset`, `applyGravity`). `src/engine/managers/CameraManager.tsx` becomes a thin per-frame orchestrator that calls these functions and applies the results to the live `THREE.Camera`. All movement tuning constants move into a new `src/engine/constants/player.ts`, replacing scattered magic numbers.

**Tech Stack:** React Three Fiber (`useFrame`, `useThree`), Three.js, Vitest for the pure-function unit tests.

## Global Constraints

- TypeScript strict mode; no `any` anywhere.
- Components: PascalCase, default export, no exceptions. Hooks/utils: camelCase, named exports only.
- Zustand state is selected via individual field selectors, never object-literal selectors.
- No collision detection in this phase — movement stays camera-position-based (deferred to Phase 4).
- Mouse-look (rotation) is untouched — `PointerLockControls` keeps its existing 1:1 mouse-to-rotation mapping.
- Head-bob is gated by `useUIStore.reducedMotion`; velocity smoothing/inertia is not (it's core movement feedback, not decorative).
- This project requires Node >= 22 (`.nvmrc` pins `22.22.3`); every Bash command invoking `npm`/`npx`/`node` must chain the nvm switch in the same command: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && <command>` — shell state does not persist between separate tool calls.
- Every task ends with `npx tsc --noEmit` passing and, where applicable, `npm run test` passing, before committing.

---

### Task 1: Player movement constants

**Files:**
- Create: `src/engine/constants/player.ts`

**Interfaces:**
- Produces: `EYE_HEIGHT`, `BASE_SPEED`, `SPRINT_MULTIPLIER`, `MOVEMENT_RESPONSIVENESS`, `HEAD_BOB_AMPLITUDE`, `HEAD_BOB_FREQUENCY`, `JUMP_VELOCITY`, `GRAVITY` (all `number`). Consumed by Task 3 (`CameraManager.tsx`, `Experience.tsx`).

No test — this is pure constant data, matching the existing precedent of `src/engine/constants/design-tokens.ts` (no test file).

- [ ] **Step 1: Create the constants file**

Create `src/engine/constants/player.ts`:
```ts
export const EYE_HEIGHT = 1.6;
export const BASE_SPEED = 4;
export const SPRINT_MULTIPLIER = 1.8;
export const MOVEMENT_RESPONSIVENESS = 8;
export const HEAD_BOB_AMPLITUDE = 0.05;
export const HEAD_BOB_FREQUENCY = 10;
export const JUMP_VELOCITY = 5;
export const GRAVITY = 18;
```

These are starting values for the manual feel-check in Task 3/4, not final —
adjust them there if movement doesn't feel right, and note any change in
that task's report.

- [ ] **Step 2: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/engine/constants/player.ts
git commit -m "Add player movement tuning constants"
```

---

### Task 2: Pure movement math functions

**Files:**
- Create: `src/lib/movement.ts`
- Test: `src/lib/movement.test.ts`

**Interfaces:**
- Produces: `smoothVelocity(current: number, target: number, delta: number, responsiveness: number): number`, `headBobOffset(distanceTraveled: number, amplitude: number, frequency: number): number`, `applyGravity(velocityY: number, delta: number, gravity: number): number`. Consumed by Task 3 (`CameraManager.tsx`).

- [ ] **Step 1: Write the failing tests for `smoothVelocity`**

Create `src/lib/movement.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { applyGravity, headBobOffset, smoothVelocity } from './movement';

describe('smoothVelocity', () => {
  it('returns target unchanged when current already equals target', () => {
    expect(smoothVelocity(5, 5, 0.016, 8)).toBe(5);
  });

  it('moves partway toward target in a single step, not all the way', () => {
    const next = smoothVelocity(0, 10, 0.016, 8);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });

  it('converges toward target over many repeated steps', () => {
    let value = 0;
    for (let i = 0; i < 200; i++) {
      value = smoothVelocity(value, 10, 0.016, 8);
    }
    expect(value).toBeCloseTo(10, 1);
  });

  it('converges faster with higher responsiveness', () => {
    const slow = smoothVelocity(0, 10, 0.016, 2);
    const fast = smoothVelocity(0, 10, 0.016, 16);
    expect(fast).toBeGreaterThan(slow);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/movement.test.ts`
Expected: FAIL — `Cannot find module './movement'`.

- [ ] **Step 3: Implement `smoothVelocity`**

Create `src/lib/movement.ts`:
```ts
export function smoothVelocity(
  current: number,
  target: number,
  delta: number,
  responsiveness: number,
): number {
  const t = 1 - Math.exp(-responsiveness * delta);
  return current + (target - current) * t;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/movement.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing tests for `headBobOffset`**

Add to `src/lib/movement.test.ts`:
```ts
describe('headBobOffset', () => {
  it('is zero at zero distance traveled', () => {
    expect(headBobOffset(0, 0.05, 10)).toBe(0);
  });

  it('stays within [-amplitude, amplitude]', () => {
    for (let d = 0; d < 10; d += 0.1) {
      const offset = headBobOffset(d, 0.05, 10);
      expect(offset).toBeGreaterThanOrEqual(-0.05);
      expect(offset).toBeLessThanOrEqual(0.05);
    }
  });

  it('scales linearly with amplitude', () => {
    const small = headBobOffset(0.1, 0.05, 10);
    const large = headBobOffset(0.1, 0.1, 10);
    expect(Math.abs(large)).toBeCloseTo(Math.abs(small) * 2, 5);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- src/lib/movement.test.ts`
Expected: FAIL — `headBobOffset is not defined` (or a TypeScript error, since `movement.ts` doesn't export it yet).

- [ ] **Step 7: Implement `headBobOffset`**

Add to `src/lib/movement.ts`:
```ts
export function headBobOffset(
  distanceTraveled: number,
  amplitude: number,
  frequency: number,
): number {
  return Math.sin(distanceTraveled * frequency) * amplitude;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test -- src/lib/movement.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 9: Write the failing tests for `applyGravity`**

Add to `src/lib/movement.test.ts`:
```ts
describe('applyGravity', () => {
  it('reduces velocity over time (gravity pulls downward)', () => {
    expect(applyGravity(5, 0.1, 20)).toBeCloseTo(3, 5);
  });

  it('keeps making velocity more negative when already falling', () => {
    expect(applyGravity(-5, 0.1, 20)).toBeCloseTo(-7, 5);
  });

  it('is a no-op when delta is zero', () => {
    expect(applyGravity(5, 0, 20)).toBe(5);
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm run test -- src/lib/movement.test.ts`
Expected: FAIL — `applyGravity is not defined`.

- [ ] **Step 11: Implement `applyGravity`**

Add to `src/lib/movement.ts`:
```ts
export function applyGravity(velocityY: number, delta: number, gravity: number): number {
  return velocityY - gravity * delta;
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm run test -- src/lib/movement.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 13: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add src/lib/movement.ts src/lib/movement.test.ts
git commit -m "Add pure movement math: smoothVelocity, headBobOffset, applyGravity"
```

---

### Task 3: Wire movement math into CameraManager

**Files:**
- Modify: `src/engine/managers/CameraManager.tsx`
- Modify: `src/components/canvas/Experience.tsx`

**Interfaces:**
- Consumes: `smoothVelocity`, `headBobOffset`, `applyGravity` (`@/lib/movement`); `EYE_HEIGHT`, `BASE_SPEED`, `SPRINT_MULTIPLIER`, `MOVEMENT_RESPONSIVENESS`, `HEAD_BOB_AMPLITUDE`, `HEAD_BOB_FREQUENCY`, `JUMP_VELOCITY`, `GRAVITY` (`@/engine/constants/player`); `useUIStore` (`@/engine/state/useUIStore`, has `reducedMotion: boolean`); `useKeyboardControls` (`@/engine/hooks/useKeyboardControls`, has `keys.jump: boolean` in addition to the movement keys already consumed in Phase 1).
- Produces: same public interface as before — default-exported `CameraManager()` with no props, rendering `<PointerLockControls>`. No interface changes for consumers.

No unit test — camera math requires a live `useThree()` context from a mounted `Canvas`; verified manually in Task 4, matching the established convention (unchanged from Phase 1).

- [ ] **Step 1: Replace `CameraManager.tsx`**

Replace the full contents of `src/engine/managers/CameraManager.tsx`:
```tsx
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

    camera.position.y = baseY.current + bob;
  });

  return <PointerLockControls ref={controlsRef} />;
}
```

- [ ] **Step 2: Point `Experience.tsx`'s initial camera position at `EYE_HEIGHT`**

In `src/components/canvas/Experience.tsx`, add the import:
```tsx
import { EYE_HEIGHT } from '@/engine/constants/player';
```

Then replace the hardcoded `1.6` in the `camera` prop:
```tsx
      camera={{ fov: 75, position: [0, EYE_HEIGHT, 5] }}
```
(This replaces the existing `camera={{ fov: 75, position: [0, 1.6, 5] }}` line — keep every other prop on `<Canvas>` unchanged.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual feel-check in the browser**

Start the dev server (`npm run dev`), open the app, click into the canvas, and using the Claude Browser tool (or real keyboard if testing locally):
1. Hold `W` — confirm movement ramps up smoothly over a few frames rather than snapping instantly to full speed (inertia working).
2. Release `W` — confirm it decelerates smoothly rather than stopping instantly.
3. Hold `Shift` while moving — confirm the speed increase eases in rather than snapping.
4. Watch the camera while walking — confirm a subtle vertical bob is visible.
5. Press `Space` — confirm the camera rises and falls back to the same height it started at, and that holding `Space` down doesn't cause continuous re-jumping.
6. If any of this feels off (too floaty, too snappy, bob too strong/weak, jump too high/low), adjust the constants in `src/engine/constants/player.ts` and re-check — note any changes made in this task's report.

- [ ] **Step 5: Commit**

```bash
git add src/engine/managers/CameraManager.tsx src/components/canvas/Experience.tsx
# If constants were tuned during the feel-check, include that file too:
# git add src/engine/constants/player.ts
git commit -m "Wire movement smoothing, head-bob, and jump into CameraManager"
```

---

### Task 4: Full verification pass

**Files:** none created; this task only runs and observes (and possibly amends Task 1's constants if Task 3's feel-check flagged a tuning change that wasn't already committed).

- [ ] **Step 1: Run the full automated check suite**

Run: `npm run test`
Expected: all tests pass, including the 10 new tests from Task 2, with no regressions in the existing Phase 1 suite.

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 2: Final manual verification**

Using the Claude Browser tool: navigate to the running dev server, take a screenshot to confirm the scene still renders correctly (HUD, placeholder room), then repeat the WASD/sprint/jump checks from Task 3 Step 4 one more time against the final committed constants to confirm nothing regressed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Verify Phase 2 camera feel end-to-end"
```

(If nothing changed since Task 3's commit, this step is a no-op — skip the commit if `git status` is clean.)
