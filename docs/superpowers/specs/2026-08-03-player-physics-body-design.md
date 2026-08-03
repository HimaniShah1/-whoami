# Player Physics Body — Design

## Context

`CameraManager` (`src/engine/managers/CameraManager.tsx`) moves the
first-person camera by writing `camera.position`/`camera.rotation` directly
each frame, with hand-rolled gravity (`applyGravity`) and a hardcoded
ground clamp (`baseY <= EYE_HEIGHT`). There is no Rapier `RigidBody` or
character controller for the player. As documented in `SKILLS.md`'s Physics
Guidelines, this means no fixed collider in the scene — including the
locked-portal blocking collider added in Phase 4's `Portal.tsx` — can
physically stop the player, since nothing in the scene can collide with a
camera that isn't itself a physics body. This is currently masked (not an
active bug) because `ROOM_REGISTRY`'s `requiresVisited` chain is strictly
linear, so a locked portal is never actually reachable in normal play — but
`SKILLS.md` flags this as needing a fix before any phase introduces a
genuinely reachable locked room (Phase 8's branching Projects cluster,
Phase 13's hidden content).

**Goal:** give the player a real Rapier physics body so `CameraManager`'s
movement is resolved through physics, and fixed colliders (locked portals,
room floors, future walls) genuinely block it — while preserving the exact
movement feel tuned in Phase 2 (inertia, gravity/jump arc, head-bob).

## Scope Decisions

Resolved before this design:

- **Preserve exact Phase 2 feel.** `smoothVelocity`, `applyGravity`,
  `headBobOffset` (`src/lib/movement.ts`) and the tuning constants in
  `src/engine/constants/player.ts` (`BASE_SPEED`, `GRAVITY`, `JUMP_VELOCITY`,
  etc.) are unchanged. Only the mechanism that turns "desired displacement"
  into "actual position" changes — from a direct write to a
  physics-resolved move.
- **Mechanism: Rapier's `KinematicCharacterController`**, created via
  `useRapier().world.createCharacterController(offset)`. This is the
  purpose-built tool for FPS-style player movement: each frame, feed it a
  desired displacement and it returns a collision/slide-corrected
  displacement, which is then applied to a `kinematicPosition` `RigidBody`.
  Rejected alternatives: a kinematic body with hand-rolled collision
  response (reimplements sliding/collision-correction the controller
  already provides, for no benefit), and a dynamic `RigidBody` driven by
  forces/impulses (fights the feel-preservation goal — dynamic bodies can
  be pushed by contacts, can tunnel without CCD tuning, and don't cleanly
  reproduce the current smoothed-inertia/instant-jump-arc feel).
- **Grounded detection moves from a hardcoded height check to real
  collision.** Today, `isGrounded` is set whenever `baseY <= EYE_HEIGHT`, a
  pure Y-coordinate check independent of X/Z. Going forward it's set from
  `controller.computedGrounded()` — an actual per-frame collision query
  against the floor collider. This is the mechanism this whole change
  exists to introduce; the numeric feel (gravity accel, jump velocity)
  doesn't change, only how "am I standing on something" is determined.
- **Capsule dimensions are derived, not separately tuned.** The player
  capsule's total height is set equal to `EYE_HEIGHT` (1.6m), with eyes at
  the very top of the capsule. This means the existing `EYE_HEIGHT`
  constant, unchanged, is still exactly the grounded eye position with no
  new offset constant to hand-tune — see Architecture for the exact numbers.
- **New failure mode, addressed with a minimal safety net, not perimeter
  walls.** Today's height-only ground clamp means a player who walks past a
  room's floor edge just keeps "standing" at `EYE_HEIGHT` indefinitely —
  they can never actually fall, since grounding never checked X/Z. With
  real collision-based grounding, walking off a room's floor (every room's
  floor is a 20×20 box per `RoomTemplate.tsx`, so this requires
  deliberately walking ~10m off-center) will let the player fall through
  the void indefinitely, with no way back — a genuine softlock this change
  introduces. Adding perimeter walls to every room is out of scope here (it
  belongs to the bespoke per-room geometry work of Phase 5+, per
  `SKILLS.md`'s roadmap). Instead, `CameraManager` gains a cheap void-fall
  safety net: if the player's Y position drops below a threshold, they're
  snapped back to `(0, EYE_HEIGHT, 0)` facing forward — a position every
  room's floor (centered at local origin, per Phase 4's design) guarantees
  is safe.
- **No autostep or snap-to-ground.** Every room floor is a single flat
  cuboid with no steps or slopes today, so `enableAutostep`/
  `enableSnapToGround` are left at their disabled defaults. Revisit if a
  future phase introduces non-flat terrain or stairs.

## Architecture

- **`src/engine/constants/player.ts`** gains:
  - `PLAYER_CAPSULE_RADIUS = 0.3` (meters).
  - `PLAYER_CAPSULE_HALF_HEIGHT = EYE_HEIGHT / 2 - PLAYER_CAPSULE_RADIUS`
    (= 0.5m). This makes the capsule's total height
    (`2 * (halfHeight + radius)`) exactly equal `EYE_HEIGHT`: standing on a
    floor at `y = 0`, the capsule's center sits at `EYE_HEIGHT / 2` and its
    top — where the eyes are — sits at `EYE_HEIGHT`, matching today's
    grounded camera height with no new tuning.
  - `CHARACTER_CONTROLLER_OFFSET = 0.01` (meters) — Rapier's recommended
    small stability gap between the character and its surroundings.
  - `VOID_FALL_RESET_Y = -20` (meters) — the fallback threshold below which
    the player is snapped back to room-center.
- **`src/engine/managers/CameraManager.tsx`** (the component being
  changed):
  - Renders a `RigidBody` (`ref`, `type="kinematicPosition"`,
    `colliders={false}`, `enabledRotations={[false, false, false]}`)
    containing a `CapsuleCollider args={[PLAYER_CAPSULE_HALF_HEIGHT,
    PLAYER_CAPSULE_RADIUS]}`, as a sibling of the existing
    `PointerLockControls`. This body is invisible (no mesh) and only exists
    to carry the collider; `PointerLockControls` still owns look-rotation
    exactly as today, untouched by this change.
  - On mount (`useEffect`), creates the character controller via
    `useRapier().world.createCharacterController(CHARACTER_CONTROLLER_OFFSET)`
    and stores it in a ref; on unmount, calls
    `world.removeCharacterController(controller)`.
  - The `baseY` ref is removed — the `RigidBody`'s own translation is now
    the single source of truth for vertical position (no more parallel
    "logical height" tracked separately from where the collider actually
    is).
  - Per-frame (`useFrame`), the sequence mirrors today's exactly, with step
    4 changed from a height clamp to a physics query:
    1. Compute desired horizontal displacement `(dx, dz)` from
       `smoothVelocity` — unchanged.
    2. Jump check against `isGrounded.current` (still holding *last*
       frame's result, same as today) — unchanged.
    3. Integrate `verticalVelocity` via `applyGravity` to get desired `dy`
       — unchanged.
    4. Call `controller.computeColliderMovement(capsuleRef.current, {x:
       dx, y: dy, z: dz})`; read back `controller.computedMovement()`
       (the corrected displacement) and `controller.computedGrounded()`.
    5. Apply the corrected displacement to the `RigidBody` via
       `setNextKinematicTranslation(currentTranslation + corrected)`.
    6. Update `isGrounded.current` from `computedGrounded()`; if grounded,
       zero `verticalVelocity.current` (same reset today's clamp branch
       did), so next frame's gravity integration and jump check see the
       fresh state.
    7. Head-bob computation is unchanged (still driven by horizontal speed
       and `isGrounded`).
    8. `camera.position` is set from the `RigidBody`'s resolved translation
       (`translation().y + EYE_HEIGHT / 2 + bob` for Y; X/Z copied
       directly), replacing the old direct-write step.
    9. If `camera.position.y < VOID_FALL_RESET_Y`, run the same reset
       routine as the `camera:reset` handler below, targeting `(0,
       EYE_HEIGHT, 0)` with yaw `0`.
  - The `camera:reset` handler (`EventBus`'s `camera:reset`, used by
    `RoomTransition` on portal crossings) additionally teleports the
    `RigidBody` via `setTranslation({x, y: y - EYE_HEIGHT / 2, z}, true)`
    so the physics body and camera stay in sync after an instant teleport
    (`setNextKinematicTranslation` is for incremental per-frame movement
    only, not teleports). The reset routine is extracted once into a
    shared internal function since it now has two callers (the event
    handler and the void-fall guard).
- **`src/scenes/world/shared/Portal.tsx`, `RoomTemplate.tsx`,
  `PhysicsProvider.tsx`: unchanged.** Their fixed colliders already exist;
  they start genuinely blocking the player as soon as the player is a real
  physics body. Debug wireframes for the new player capsule appear
  automatically under the existing `debug={NODE_ENV === 'development'}`
  flag on `PhysicsProvider`'s `<Physics>` — no new debug-rendering code
  needed.

## Data Flow

```
CameraManager useFrame, each tick
        │
        ▼
1. desired (dx, dz) from smoothVelocity (unchanged)
2. jump check against last frame's isGrounded (unchanged)
3. desired dy from applyGravity + jump velocity (unchanged)
        │
        ▼
4. controller.computeColliderMovement(capsule, {dx, dy, dz})
   → resolves against fixed colliders (floors, locked portals)
        │
        ▼
5. corrected = controller.computedMovement()
   grounded  = controller.computedGrounded()
        │
        ▼
6. RigidBody.setNextKinematicTranslation(current + corrected)
   isGrounded.current = grounded (zero verticalVelocity if true)
        │
        ▼
7. camera.position ← RigidBody.translation() + eye offset + head-bob
        │
        ▼
8. if camera.position.y < VOID_FALL_RESET_Y → reset to (0, EYE_HEIGHT, 0)

(separately) EventBus 'camera:reset' (portal crossing)
        │
        ▼
   RigidBody.setTranslation(target - eye offset)   [teleport, not a step]
   camera.position/rotation set directly, refs reset — same as today
```

## Error Handling

- `CameraManager` only mounts inside `PhysicsProvider`'s `<Physics>` tree
  (via `Experience`), so `useRapier().world` is guaranteed non-null when
  the controller-creation effect runs — no defensive null-checking beyond
  what the library's own context guarantees.
- The character controller is created once and freed via
  `world.removeCharacterController` on unmount, matching Rapier's
  world-owned resource lifecycle (avoids leaking a native controller
  instance across `CameraManager` remounts, e.g. React fast-refresh in
  development).
- No new user-facing error states: locked portals were already physically
  blocked in intent (Phase 4); this change makes that intent actually true.
  The void-fall safety net turns a would-be permanent softlock into a
  silent recovery, not a visible error.

## Testing

- `src/lib/movement.ts`'s existing unit tests are untouched and still
  valid — the pure functions they cover don't change.
- `CameraManager` remains R3F-imperative, physics-driven code — manually
  verified only, consistent with its existing convention (and the known
  sandboxed-browser-pane limitations already documented for this project:
  Pointer Lock fails there, so verify WASD movement/collision rather than
  mouse-look).
- Manual verification plan:
  - Walking into a room's floor edge and any existing fixed collider
    (e.g. the always-rendered floor) no longer clips — confirms the
    character controller is actually resolving collisions, not just
    present.
  - Temporarily forcing a locked-portal state (e.g. via
    `useGameStore.getState()` in devtools, resetting `visitedRooms` so a
    room's forward portal renders locked) and walking into it: the player
    is physically stopped rather than passing through.
  - Crossing an actually-unlocked portal still triggers `RoomTransition`
    exactly as before (regression check — proximity trigger logic is
    unchanged, but now runs alongside a physics body that must not
    interfere with it).
  - Deliberately walking off a room's floor edge: player falls, then is
    recovered to room-center rather than falling forever.
  - Jump arc, sprint speed, and head-bob look and feel unchanged from
    before this change (spot-check against Phase 2's tuned feel).

## Out of Scope (explicitly)

- Perimeter walls or any other new room geometry — the void-fall safety
  net addresses the softlock risk without expanding this change into
  room-content work that belongs to Phase 5+.
- Autostep/snap-to-ground/slope handling — no room has steps or slopes
  today.
- Any change to `Portal.tsx`, `RoomTemplate.tsx`, or `PhysicsProvider.tsx`
  — their existing fixed colliders need no changes to start working
  correctly.
- Retuning `BASE_SPEED`, `GRAVITY`, `JUMP_VELOCITY`, or any other Phase 2
  feel constant.
- Mouse-look/`PointerLockControls` behavior — untouched, orthogonal to
  this change.
