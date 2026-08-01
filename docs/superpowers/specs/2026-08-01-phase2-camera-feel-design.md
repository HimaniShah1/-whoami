# Phase 2: Player & Camera Feel — Design

## Context

This is Phase 2 of "Backend Odyssey," following directly on from Phase 1
(Foundation & Tooling), which shipped a working first-person camera with
rough, un-smoothed WASD movement (`src/engine/managers/CameraManager.tsx`),
a keyboard-input hook (`src/engine/hooks/useKeyboardControls.ts`), and a UI
store with a `reducedMotion` flag (`src/engine/state/useUIStore.ts`).

**Goal of this phase:** replace the rough movement with proper game feel —
smoothed (inertia-based) horizontal movement, head-bob while walking, and a
simple jump — without touching anything outside the camera/movement system.
Mouse-look (rotation) is explicitly untouched: `PointerLockControls` already
maps mouse delta to rotation 1:1, which is correct FPS behavior, and adding
smoothing there would make aiming feel laggy rather than better.

## Scope Decisions

Two scope questions were resolved before this design:

- **No collision detection this phase.** Movement stays camera-position-based
  (no Rapier character controller). The only thing to collide with right now
  is one placeholder box that Phase 4 replaces anyway — collision is deferred
  to Phase 4, when real room geometry exists to build and test it against.
- **Jump is in scope**, implemented as a simple kinematic rise-and-fall arc
  that returns to the fixed `EYE_HEIGHT` on the flat placeholder floor. This
  gets replaced by a proper Rapier-driven jump once a real character
  controller exists in Phase 4; the simple version is enough to feel-test
  jump timing now.

## Architecture

**Extract pure movement math into `src/lib/movement.ts`; keep
`CameraManager.tsx` as a thin per-frame orchestrator.** This follows the
project's existing convention (`src/lib/` holds framework-agnostic,
unit-tested pure utilities; R3F rendering itself is verified manually) —
smoothing curves, a bob sine wave, and gravity integration are exactly the
kind of logic that should be pure functions with unit tests, not buried
inside a `useFrame` callback.

Three pure functions in `src/lib/movement.ts`:

- `smoothVelocity(current: number, target: number, delta: number, responsiveness: number): number`
  — exponential-decay smoothing toward a target value. This single function
  is the entire "inertia" mechanic: called once for the X component and once
  for the Z component of velocity each frame. It also transparently produces
  a smooth sprint transition — sprint just changes the target speed that
  `smoothVelocity` eases toward, so no separate sprint-transition logic is
  needed anywhere.
- `headBobOffset(distanceTraveled: number, amplitude: number, frequency: number): number`
  — returns a sinusoidal vertical offset as a function of horizontal distance
  traveled (not wall-clock time, so bob frequency is tied to how far you've
  walked, not how long you've been holding a key). Returns `0` at
  `distanceTraveled = 0`.
- `applyGravity(velocityY: number, delta: number, gravity: number): number`
  — one-step velocity integration under constant gravity. Trivial in
  isolation; tested mainly to pin the sign convention (gravity is negative
  acceleration) so `CameraManager`'s jump logic composes with it correctly.

**`CameraManager.tsx`** becomes the orchestrator:

1. Reads `useKeyboardControls()` and computes a target horizontal velocity
   from input direction × (walk or sprint speed).
2. Smooths current velocity toward that target via `smoothVelocity` (X and Z
   independently) and applies the result to `camera.position` scaled by
   `delta`.
3. Accumulates horizontal distance traveled while grounded and moving;
   computes head-bob via `headBobOffset` and applies it as an additional
   small offset on top of the base eye height — **unless**
   `useUIStore.reducedMotion` is `true`, in which case bob is zeroed. The
   velocity smoothing/inertia itself is **not** gated by `reducedMotion`: per
   `SKILLS.md`'s existing Animation Conventions, "essential feedback still
   animates, just without purely decorative motion" — inertia is core
   movement feedback, head-bob is the purely decorative layer.
4. Tracks jump state locally (`isGrounded`, `velocityY`) with edge-detection
   on the jump key so a held Space doesn't multi-jump — this is a
   `CameraManager`-local concern; `useKeyboardControls`'s boolean
   held-key-state contract is unchanged. On a rising edge while grounded,
   sets `velocityY` to `JUMP_VELOCITY`. Each frame, integrates `velocityY`
   via `applyGravity` and applies `velocityY * delta` to `camera.position.y`;
   when the result would go at or below `EYE_HEIGHT`, clamps to
   `EYE_HEIGHT`, zeroes `velocityY`, and sets `isGrounded = true`.

## Constants

New file `src/engine/constants/player.ts`, consolidating values currently
either hardcoded inline (`BASE_SPEED`/`SPRINT_MULTIPLIER` in
`CameraManager.tsx`) or duplicated as a bare magic number
(`EYE_HEIGHT` — currently `1.6`, hardcoded separately in
`Experience.tsx`'s initial camera position):

```
EYE_HEIGHT
BASE_SPEED
SPRINT_MULTIPLIER
MOVEMENT_RESPONSIVENESS   // smoothing rate for smoothVelocity; higher = snappier
HEAD_BOB_AMPLITUDE
HEAD_BOB_FREQUENCY
JUMP_VELOCITY
GRAVITY
```

These are starting values, tuned by playtesting during implementation and
adjusted by feel — game feel can't be fully specified in a design doc. The
implementation plan calls out a manual feel-check step; the first numbers
committed aren't treated as final if they don't feel right.

`Experience.tsx`'s initial camera position is updated to import
`EYE_HEIGHT` from this file instead of hardcoding `1.6`, so there is exactly
one source of truth for eye height.

## Data Flow

```
useKeyboardControls (existing)
        │
        ▼
CameraManager.useFrame
  ├─ target velocity (X, Z)  →  smoothVelocity  →  camera.position (X, Z)
  ├─ distance traveled       →  headBobOffset    →  camera.position.y (+bob)
  └─ jump edge-detect        →  applyGravity     →  camera.position.y (+jump)
                                                       (clamped to EYE_HEIGHT)
useUIStore.reducedMotion  →  gates head-bob only
```

No new state enters `useGameStore` or `useUIStore` — all movement state
(velocity, distance traveled, jump state) is local `useRef` state inside
`CameraManager`, matching the existing pattern (Phase 1's `CameraManager`
already used local refs for movement vectors).

## Error Handling

No new error surfaces. No I/O, no external data, no new failure modes beyond
what Phase 1 already established for this component (camera math requires a
live `useThree()` context, unchanged).

## Testing

- `src/lib/movement.test.ts` (new): unit tests for all three pure functions
  — `smoothVelocity` converges toward target over repeated steps without
  overshooting and returns `current` unchanged when `target === current`;
  `headBobOffset` returns `0` at zero distance and stays within
  `[-amplitude, amplitude]`; `applyGravity` reduces `velocityY` over time
  with the correct sign.
- `CameraManager.tsx` remains manually-verified-only (no unit test), matching
  the established convention — this is unchanged from Phase 1, not a new
  exception.

## Out of Scope (explicitly)

- Collision detection / Rapier character controller (Phase 4)
- Mouse-look smoothing/damping (not planned — would degrade aiming feel)
- Interact key (E) — no target exists yet (Phase 4+)
- FOV kick on sprint or any other decorative-only game-feel addition not
  explicitly requested
