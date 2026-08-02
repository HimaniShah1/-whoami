# Phase 4: World Shell & Traversal — Design

## Context

This is Phase 4 of "Backend Odyssey," following Phase 1 (Foundation), Phase 2
(Player & Camera Feel), and Phase 3 (Boot Sequence). Phase 1 already laid the
data-model groundwork this phase builds on: `ROOM_REGISTRY`
(`src/engine/constants/rooms.ts`) defines all 11 rooms with names,
descriptions, absolute positions, forward `connections`, and
`requiresVisited` prerequisites; `useGameStore` already has `currentRoomId`,
`visitedRooms`, `enterRoom(roomId)` (which no-ops if the target isn't
unlocked and emits `room:entered`/`room:unlocked` via `EventBus`), and
`isUnlocked(roomId)`. `SceneManager` already renders exactly one active room
at a time, lazily loaded via `React.lazy`, wrapped in `RoomErrorBoundary` —
but today only `load-balancer` has a registered loader (`PlaceholderRoom`).

**Goal of this phase:** make the existing 11-room chain actually walkable.
The visitor can walk up to a portal, cross it, and arrive in the next room
(or back into the previous one), with the HUD's `ttl`/`latencyMs` reacting
to each hop. This phase is the traversal *mechanism* — every room gets
generic placeholder geometry so the whole spine is provably walkable
end-to-end, but bespoke per-room content (narrative, unique geometry,
terminal interactions) is deferred to Phase 5 onward, one room/cluster at a
time, per `SKILLS.md`'s Future Roadmap.

## Scope Decisions

Resolved before this design:

- **Discrete scene-swap, not one continuous world.** `SceneManager`'s
  existing "one active room, lazily loaded" design is kept as-is —
  performance rules already prohibit eagerly loading all rooms. Crossing a
  portal triggers `enterRoom(nextId)`, `SceneManager` unmounts the current
  room and mounts the next, and the camera resets to that room's spawn
  point. `ROOM_REGISTRY`'s absolute `position`/`connections[].position`
  fields remain as narrative/logical metadata (useful for a future minimap)
  but are not read as literal shared world-space coordinates by this phase.
- **Walk-through proximity trigger, not "Press E."** Crossing into a
  portal's trigger radius fires the transition automatically — no keypress.
  This keeps the diegetic "walk up, press E, terminal prints text" pattern
  (`src/engine/hooks/useKeyboardControls.ts` already tracks an `interact`
  key for this, unused until then) reserved for Phase 6's About Me terminal
  and later reuses, so the two interaction styles stay visually and
  behaviorally distinct.
- **Bidirectional portals.** Every room gets a "back" portal in addition to
  its forward one(s), derived from `ROOM_REGISTRY`'s existing forward
  `connections` (a room's back portal targets whichever room's
  `connections` lists it) — no changes to the `RoomDefinition` schema
  itself. `load-balancer` has no back portal (nothing points to it);
  `contact-gateway` has no forward portal (its `connections` is already
  empty — reaching it and submitting the contact form is the win state, not
  further walking).
- **All 11 rooms get generic placeholder geometry this phase.** Every
  `RoomId` in `ROOM_REGISTRY` gets a `SceneManager` loader so the full
  `load-balancer → contact-gateway` chain is walkable and the unlock
  progression is exercised end-to-end, not just its first hop.
  `load-balancer` keeps its existing bespoke `PlaceholderRoom`; the other 10
  get a shared generic room component.
- **`ttl`/`latencyMs` become dynamic, driven by hops.** Per `SKILLS.md`'s
  State Management Conventions, these were static placeholders through
  Phase 3. Each successful `enterRoom` call now decrements `ttl` by 1
  (floored at 0; no failure-state behavior is wired to `ttl` reaching 0 in
  this phase) and sets `latencyMs` to a randomized "spike" value, which then
  eases back down to a resting baseline after the transition completes.
- **Fade-to-background transition with a terminal-style status line.**
  Reuses the mono-font terminal aesthetic already established by the boot
  sequence (Phase 3) rather than inventing new visual language, and hides
  any pop-in from the lazy `import()`.
- **`Portal` is locked-aware from day one.** It reads `isUnlocked` and
  renders a distinct locked appearance with a physically blocking collider,
  even though today's strictly linear `requiresVisited` chain means a
  locked portal is never actually reachable by normal play (every forward
  portal always leads to a room whose sole prerequisite — the room you're
  standing in — is already visited). This is cheap given `isUnlocked`
  already exists, matches the "always know what's next" UX principle in
  `SKILLS.md`, and avoids revisiting `Portal`'s API when a future branching
  cluster (e.g. Projects) needs real locked-state handling.

**Correction to `SKILLS.md`:** its Reusable Interaction Patterns section
currently lists "Terminal interaction (Phase 4/6)" and its Accessibility
Rules section says interactive "Press E" prompts are "added from Phase 4."
Given portals are walk-through rather than E-press, Phase 4 has no consumer
for the terminal/E-interact pattern — that work is genuinely Phase 6 (About
Me) only. `SKILLS.md` will be corrected to say Phase 6 when this phase
lands, rather than building a terminal component with no caller yet.

## Architecture

- **`src/lib/proximity.ts`** — pure function `isWithinRadius(a: Vector3Like,
  b: Vector3Like, radius: number): boolean`. No React, no Three.js class
  dependency (accepts plain `{x, y, z}`-shaped objects so it doesn't need a
  `THREE.Vector3` at the boundary). Fully unit-tested, following the same
  split as `src/lib/movement.ts`'s `applyGravity`/`smoothVelocity`.
- **`src/engine/hooks/useProximity.ts`** — `useProximity(point: [number,
  number, number], radius: number): boolean`. Wires `isWithinRadius` to
  `useFrame`/`useThree().camera.position`, returning a boolean that updates
  every frame. R3F-context-dependent, so manually verified only — same
  bucket as `CameraManager`. Generic enough to be reused by Phase 6's
  terminal proximity prompts later, per `SKILLS.md`'s existing note.
- **`src/scenes/world/shared/Portal.tsx`** — the shared interactable
  archway. Props: `targetRoomId: RoomId`, `direction: 'forward' | 'back'`,
  `position`/orientation for its local placement within the room. Reads
  `isUnlocked(targetRoomId)` from `useGameStore`.
  - **Unlocked:** renders a passable archway (primitive geometry, `primary`-
    colored accent lighting, matching Lighting Strategy). `useProximity` at
    a small trigger radius; on first becoming `true` (guarded by a ref so it
    fires once per approach, not every frame while inside the radius),
    emits a `portal:trigger` event on `EventBus` with `{ targetRoomId,
    spawnPosition, spawnFacingYaw }`.
  - **Locked:** renders a dimmed/red-tinted variant (`statusError`-adjacent
    treatment) and adds a `RigidBody type="fixed" colliders="cuboid"` across
    the archway so it's physically impassable, not just visually different.
    No proximity trigger attached.
- **`src/components/canvas/RoomTransition.tsx`** — DOM overlay, orchestrator
  for the transition. Subscribes to `EventBus`'s `portal:trigger`. Owns a
  GSAP timeline, following the same split established by the boot sequence
  (`bootScript.ts`/`TerminalOutput.tsx`/`BootSequence.tsx`): fade the
  overlay to `bg-background` with a centered status line ("Routing to
  {targetRoom.name}...") → at full opacity, call
  `useGameStore.getState().enterRoom(targetRoomId)` (this is also what
  decrements `ttl` and spikes `latencyMs`) and emit `camera:reset` on
  `EventBus` with the portal-supplied spawn transform → fade the overlay
  back out → a trailing GSAP tween eases `latencyMs` from its spiked value
  down to a resting baseline via repeated `setLatency` calls, visible
  ticking down on the HUD after the new room is revealed. Under
  `reducedMotion`, the same collapsed-duration approach established by
  `BootSequence` applies (near-instant fade, same code path) rather than a
  structurally different skip.
- **`CameraManager`** gains a subscription to `EventBus`'s `camera:reset`
  event: on receipt, imperatively sets `camera.position` (and yaw) to the
  given spawn transform and resets its internal movement refs (`velocity`,
  `baseY`, `distanceTraveled`, `verticalVelocity`) so momentum, gravity
  state, and head-bob phase from the previous room don't leak into the new
  one.
- **`useGameStore`** changes: `enterRoom` additionally decrements `ttl` by 1
  (floored at 0) and sets `latencyMs` to a randomized spike value on every
  successful entry (including re-entry into an already-visited room, since
  every hop is a real network hop). New `setLatency(ms: number): void`
  action, called by `RoomTransition`'s settle-down tween.
- **`SceneManager`**: `ROOM_LOADERS` gains an entry for all 11 `RoomId`s.
  `load-balancer` keeps its existing `PlaceholderRoom` loader unchanged. The
  other 10 rooms get a new shared generic room component (name TBD in the
  implementation plan, e.g. `GenericRoom.tsx`) reusing the same
  floor/rack-primitive geometry `PlaceholderRoom` already establishes,
  parameterized by the room's `name`/`description` (rendered as a small
  floating label matching the mono-font/HUD aesthetic) and composed with its
  `Portal`(s) — a forward portal if `connections` is non-empty, a back
  portal if some other room's `connections` points to it. Every generic room
  uses a standardized local layout (floor centered at local origin, back
  portal near the entry side, forward portal at the far side) so that
  spawn-point placement is consistent across all 10 without per-room
  authoring; exact local coordinates are an implementation-plan detail, not
  this design's.

## Data Flow

```
Player crosses a Portal's proximity radius (useProximity, forward-guarded)
                        │
                        ▼
        Portal emits EventBus 'portal:trigger'
        { targetRoomId, spawnPosition, spawnFacingYaw }
                        │
                        ▼
              RoomTransition GSAP timeline
                        │
              1. fade to bg-background + status line
                        │
              2. useGameStore.enterRoom(targetRoomId)
                 → decrements ttl, spikes latencyMs
                 → SceneManager unmounts old room,
                   lazy-loads + mounts new room
              2b. EventBus 'camera:reset' emitted
                 → CameraManager resets position/refs
                        │
              3. fade back in
                        │
              4. trailing tween eases latencyMs down
                 via setLatency (visible on Hud)
```

`Hud.tsx` needs no structural changes — it already reads `ttl`, `latencyMs`,
and `currentRoomId`'s derived room name reactively from `useGameStore`, so
it reflects every step above automatically.

## Error Handling

- Locked portals are physically blocked by a collider, so there's no
  invalid transition to recover from — `enterRoom` itself already no-ops if
  somehow called on a locked room, as a second line of defense.
- If a target room's lazy `import()` fails mid-transition, the existing
  `RoomErrorBoundary` (already wrapping every `SceneManager`-rendered room)
  shows its themed "503 Service Unavailable" panel once the fade-in reveals
  it — no new error handling is introduced by this phase.
- If the same room's `import()` fails and the player retries via
  `RoomErrorBoundary`'s existing retry affordance, no special-casing is
  needed for the transition overlay — the overlay has already faded back
  out by the time the boundary's fallback would show.

## Testing

- `src/lib/proximity.test.ts` — unit tests for `isWithinRadius` (inside
  radius, outside radius, boundary/exact-radius case).
- `src/engine/state/useGameStore.test.ts` — extended: `ttl` decrements by 1
  on a successful `enterRoom`, does not decrement on a refused (locked)
  entry, `ttl` floors at 0 rather than going negative, `latencyMs` changes
  to a non-zero value on entry, `setLatency` sets the given value directly.
- `src/scenes/world/shared/Portal.tsx`, `src/components/canvas/
  RoomTransition.tsx`, `src/engine/hooks/useProximity.ts`, the
  `CameraManager` `camera:reset` handling, and the generic room component —
  manually verified only (R3F/GSAP-driven imperative code), consistent with
  the project's established convention for `CameraManager`/`BootSequence`.

## Out of Scope (explicitly)

- Bespoke, narratively real content for rooms 2 through 11 (room-specific
  geometry, story beats, interactions) — built one room/cluster at a time
  starting Phase 5.
- The "Press E to interact" / diegetic terminal pattern — genuinely Phase 6
  (About Me), per the `SKILLS.md` correction above.
- Any failure state tied to `ttl` reaching 0 — this phase only makes `ttl`
  decrement; what happens at 0 is undecided and deferred.
- A minimap or any UI visualization of `ROOM_REGISTRY`'s absolute
  positions — those fields stay narrative metadata this phase.
- Portal/transition sound cues — deferred to the Phase 14 audio pass per
  `SKILLS.md`'s Sound Strategy.
- Changes to `ROOM_REGISTRY`'s schema (e.g. adding explicit back-connection
  data) — back portals are derived at render time from existing forward
  `connections`, not stored redundantly.
