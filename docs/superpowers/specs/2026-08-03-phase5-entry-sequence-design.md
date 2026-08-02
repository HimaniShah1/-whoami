# Phase 5: Entry Sequence — Design

## Context

Phase 5 of "Backend Odyssey," following Phase 4 (World Shell & Traversal,
merged to `main`). Per `SKILLS.md`'s Future Roadmap, Phase 5 is "Entry
sequence (Load Balancer → API Gateway → Auth), terminal pattern
established." This is the first phase to give any room real, bespoke
content instead of `RoomTemplate`'s generic placeholder shell, and the
first to build the reusable "walk up, press E, text prints" terminal
interaction pattern that later phases (About Me, hidden terminals, Contact
Gateway) will reuse.

**Note on process:** this phase was scoped and designed autonomously (the
project owner explicitly delegated all decisions before going offline) —
there was no interactive brainstorming Q&A. Every non-obvious call below is
recorded with its reasoning so it can be revisited later if it turns out
wrong, exactly as the brainstorming skill would have captured from a live
conversation.

## Scope Decisions

- **Three rooms get bespoke content this phase: `load-balancer`,
  `api-gateway`, `auth-service`.** Each replaces its current Phase 4
  wrapper (`PlaceholderRoom.tsx` for `load-balancer`; thin `RoomTemplate`
  wrappers for the other two) with its own file under `scenes/world/`,
  still using the shared portal/floor/lighting plumbing (see `RoomShell`
  below) but with distinct primitive-only geometry and one `Terminal`
  interactable each. No external 3D models or textures — `SKILLS.md`'s
  Asset Strategy hasn't introduced an asset pipeline yet, and three rooms'
  worth of primitive set-dressing is enough to make the entry sequence feel
  distinct without a scope explosion.
- **Terminal content is infrastructure narrative, not biography.** Each
  terminal teaches one real backend concept tied to its room (load
  balancing, gateway routing/rate-limiting, authn vs. authz) in a
  systems-log voice that leans into the game's premise (the visitor *is*
  the HTTP request passing through). It does not invent specific personal
  history, employers, or projects — that's `about-me`/`experience-service`
  content in later phases, which need the project owner's real information
  and are explicitly out of scope here.
- **One terminal per room, not multiple.** Keeps the interaction surface
  small enough to fully verify (proximity, key-edge-trigger, reveal
  timeline, ARIA mirroring, close/reopen) across three instances without
  the combinatorial cost of multiple terminals per room. Later phases can
  add more if a room's content warrants it — the `Terminal` component
  itself has no assumption baked in that limits a room to one.
- **Terminals are read-only reveals, not free-text input.** `SKILLS.md`'s
  Coding Standards note that "terminal command input" gets Zod validation
  "added from Phase 6 and Phase 12" — i.e. typed input is explicitly a
  later-phase concern (About Me's `cat about.md` style commands, the
  Contact Gateway's POST form). Phase 5's terminals print fixed content;
  no text entry, no Zod dependency introduced here.
- **Interaction model: walk into range → an in-scene "[E] Interact" prompt
  appears → press E → a screen-corner panel reveals the terminal's lines
  with a GSAP typewriter-style timeline and a blinking cursor, matching the
  boot sequence's established cadence → press E again (on the same
  terminal) or walk into a *different* terminal's range closes/replaces it.**
  Walking out of range while a terminal is open does **not** auto-close it —
  a visitor should be able to walk away mid-read without losing their
  place, matching "the visitor is never dead-ended" backend-UX spirit. The
  panel is a small, corner-anchored overlay (not a full-screen modal) so it
  never blocks movement or pointer lock; WASD/mouse-look keep working while
  it's open. This deliberately mirrors the `Portal` → `RoomTransition`
  split from Phase 4: an in-scene R3F trigger component reads proximity and
  input, and a single top-level DOM overlay owns the actual panel,
  timeline, and ARIA region.
- **`RoomShell` extraction.** Phase 4's whole-branch review flagged that
  `PlaceholderRoom.tsx` and `RoomTemplate.tsx` duplicate identical
  floor/lighting geometry, and `SKILLS.md`'s own Three.js/R3F Patterns rule
  says to extract shared geometry into `scenes/world/shared/` "once a
  second room needs them" — with 11 rooms already sharing it, this was
  already overdue. Phase 5's three new bespoke room files need the same
  floor/lighting/portal baseline `RoomTemplate` already builds, which makes
  this the natural moment to fix it: extract `RoomShell` (ambient + point
  light, floor `RigidBody`, forward/back `Portal`s derived from
  `ROOM_REGISTRY`, and an optional floating name label) accepting
  `children` for room-specific geometry. `RoomTemplate` becomes a one-line
  wrapper (`<RoomShell roomId={roomId} />`); the three bespoke rooms use
  `<RoomShell roomId="..." showLabel={false}>...bespoke geometry +
  Terminal...</RoomShell>`.
- **Floating name label is disabled (`showLabel={false}`) for bespoke
  rooms.** `Hud.tsx` already shows the current room's name at all times
  (`{room.name.toUpperCase()}`, top-right) per the Backend-Inspired UX
  Principles' "HUD frames the visitor... at all times" rule — an in-scene
  floating label would be redundant clutter once a room has real set
  dressing to look at. Generic (not-yet-built) rooms keep the label, since
  it's their only naming cue today.
- **No changes to `ROOM_REGISTRY`, portal geometry, or the traversal
  system.** Phase 4's `Portal`/proximity/spawn-transform math is untouched;
  bespoke rooms place their forward/back portals at the exact same local
  offsets `RoomShell` already computes, so crossing into/out of these three
  rooms behaves identically to Phase 4.

## Architecture

- **`src/scenes/world/shared/RoomShell.tsx`** (extracted from
  `RoomTemplate.tsx`) — `{ roomId: RoomId; showLabel?: boolean; children?:
  ReactNode }`. Owns: ambient + point light, the 20×20 floor `RigidBody`,
  forward/back `Portal`s (same derivation `RoomTemplate` already has:
  `room.connections[0]?.roomId` and `getIncomingRoomId(roomId)`), and the
  `Html` name label gated by `showLabel` (default `true`, so
  `RoomTemplate`'s existing callers are unaffected). Renders `children`
  inside the same `<group>`, after the floor, so bespoke geometry and the
  room's `Terminal` composite naturally on top of it.
- **`src/scenes/world/shared/RoomTemplate.tsx`** — becomes:
  ```tsx
  import RoomShell from './RoomShell';
  import type { RoomId } from '@/types/rooms';

  interface RoomTemplateProps {
    roomId: RoomId;
  }

  export default function RoomTemplate({ roomId }: RoomTemplateProps) {
    return <RoomShell roomId={roomId} />;
  }
  ```
  Every existing generic-room wrapper file (`AboutMeRoom.tsx`, etc.) is
  unchanged — they still render `<RoomTemplate roomId="..." />`.
- **`src/scenes/world/shared/TerminalPanel.tsx`** — presentational only
  (DOM), sibling to `TerminalOutput.tsx` (boot sequence) but standalone: no
  progress bar (that was boot-specific), just the revealed lines and a
  blinking cursor. Props: `{ title: string; visibleLines: string[]; done:
  boolean; reducedMotion: boolean }`.
- **`src/scenes/world/shared/Terminal.tsx`** — the in-scene R3F trigger,
  analogous to `Portal.tsx`. Props: `{ id: string; title: string; lines:
  string[]; position: [number, number, number] }`.
  - `useProximity(position, TERMINAL_INTERACT_RADIUS)` for range (same
    hook Phase 4 built; `TERMINAL_INTERACT_RADIUS = 2`, independent of
    `Portal`'s `PORTAL_TRIGGER_RADIUS`).
  - `useKeyboardControls()` for the `interact` key, edge-triggered inside
    its own `useFrame` (identical pattern to `CameraManager`'s
    `wasJumpPressed` handling — a `wasInteractPressedRef`, so a held key
    doesn't fire repeatedly). `useKeyboardControls` attaches its own
    independent `window` listeners per call, so `Terminal` calling it
    alongside `CameraManager`'s own call is safe — verified by reading the
    hook: no shared/global state, just per-call `window.addEventListener`.
  - On the rising edge of `interact` while `inRange`, emits `EventBus`'s
    new `terminal:trigger` event with `{ id, title, lines }`. `Terminal`
    itself holds no open/closed state — see Data Flow below for why a
    single stateless emit is sufficient.
  - Renders an in-scene `Html` "[E] Interact" prompt, visible only while
    `inRange`, positioned at `position` (offset up slightly so it doesn't
    clip through the terminal geometry). Colocated inside that same `Html`
    block is a visually-hidden (`sr-only`) `<span aria-live="polite">`
    that mirrors the prompt's availability for screen readers per
    `SKILLS.md`'s Accessibility Rules — present only while `inRange`, so a
    screen reader announces it once on approach and the live region goes
    quiet again on leaving (no repeated announcements every frame, since
    React only touches the DOM node when the rendered text actually
    changes).
- **`src/components/canvas/TerminalOverlay.tsx`** — the DOM-level owner,
  analogous to `RoomTransition.tsx`. Subscribes to `EventBus`'s
  `terminal:trigger`. On receipt:
  - If the incoming `id` matches the currently-open terminal's `id`: close
    it (clear state, kill any running reveal timeline).
  - Otherwise: replace whatever's open (if anything) with the new one and
    start a fresh GSAP reveal timeline over `lines`, following the boot
    sequence's per-line `.call()` (reveal) + `.to()` (this phase has no
    progress bar to drive, so the `.to()` step is just the inter-line
    delay) cadence, respecting `reducedMotion` via the same
    collapsed-duration approach `BootSequence`/`RoomTransition` already
    use. Holds the running timeline in a ref and `.kill()`s it on unmount
    or replacement, matching the fix already applied to `RoomTransition`
    in Phase 4's whole-branch review.
  - Renders `TerminalPanel` inside a fixed, corner-anchored container
    (bottom-left, to stay clear of `Hud`'s top corners and
    `RoomTransition`'s centered fade text) with `pointer-events-none` (pure
    read-only display, nothing to click) and a z-index below
    `RoomTransition`'s `z-40` fade overlay (`z-30`, matching
    `RoomShell`'s label `zIndexRange` precedent from Phase 4) so a portal
    crossing's fade still visually takes over a terminal that happens to
    be open.
- **`src/engine/managers/EventBus.ts`** gains one event:
  `'terminal:trigger': { id: string; title: string; lines: string[] }`.
- **`src/components/AppRoot.tsx`** mounts `<TerminalOverlay />` alongside
  `<Experience />`, `<Hud />`, `<RoomTransition />` in the final returned
  fragment.
- **File naming:** the existing Phase 4 files
  `ApiGatewayRoom.tsx` and `AuthServiceRoom.tsx` are *modified in place*
  (not renamed) to hold bespoke content instead of a `RoomTemplate` call;
  `PlaceholderRoom.tsx` is deleted and replaced by a new
  `LoadBalancerRoom.tsx`, matching the "one file per room, named after the
  room" convention `SKILLS.md`'s Scene Organization section already
  states — `load-balancer` no longer needs a name that predates it having
  real content. `SceneManager`'s `ROOM_LOADERS['load-balancer']` entry
  updates its import path accordingly.

Each bespoke room's structure:
```tsx
<RoomShell roomId="load-balancer" showLabel={false}>
  {/* room-specific primitive geometry */}
  <Terminal id="load-balancer-term" title="lb-notes.md" lines={LOAD_BALANCER_LINES}
            position={[0, 1.6, 0]} />
</RoomShell>
```
(exact geometry per room specified in the implementation plan; the terminal
sits near room-center, `z≈0`, clear of both portals at `z=±8` so their
trigger radii — 1.5 for portals, 2 for terminals — never overlap even at
the closest approach, 8 units apart).

## Data Flow

```
Player enters Terminal's proximity radius (useProximity)
                    │
      "[E] Interact" Html prompt + sr-only live-region text appear
                    │
        Player presses E (rising edge, inRange still true)
                    │
        Terminal emits EventBus 'terminal:trigger' { id, title, lines }
                    │
                    ▼
     TerminalOverlay: is `id` === currently-open id?
        │ yes                              │ no
        ▼                                  ▼
   close (kill timeline,            replace state, start new GSAP
   clear panel)                     reveal timeline over `lines`
                                            │
                                  TerminalPanel renders revealed
                                  lines + blinking cursor, bottom-left,
                                  z-30, below RoomTransition's z-40
```

`Hud`, `RoomTransition`, and the room-traversal system are untouched by
this flow — a terminal being open has no effect on `ttl`/`latencyMs`/
`currentRoomId`, and a portal crossing while a terminal is open simply
fades over it (the terminal's DOM state persists underneath, matching "no
auto-close on room exit" — though in practice, once `enterRoom` swaps
`SceneManager`'s active room, the *triggering* `Terminal` instance
unmounts; `TerminalOverlay`'s own state is independent of that unmount and
keeps showing the panel's last content until the player interacts with a
new terminal or the same one again, which is an acceptable, honest
reflection of "you can keep reading while you walk into the next room").

## Error Handling

No new failure states are introduced. If a bespoke room's dynamic
`import()` fails, the existing `RoomErrorBoundary` (unchanged from Phase 1)
still applies exactly as it does for every other room — nothing about
`Terminal`/`TerminalOverlay` changes that path. `TerminalOverlay` itself
has no failure mode to handle (it doesn't fetch anything or call any
store action beyond its own local timeline state).

## Testing

- `src/scenes/world/shared/RoomShell.tsx`, `Terminal.tsx`,
  `TerminalPanel.tsx`, `src/components/canvas/TerminalOverlay.tsx`,
  the three bespoke room files — manually verified only (R3F/GSAP/DOM
  components with proximity, keyboard, and timeline side effects),
  matching every precedent set in Phases 3-4 (`BootSequence`,
  `RoomTransition`, `Portal`).
- No new pure functions are introduced this phase (unlike Phase 4's
  `isWithinRadius`/`getIncomingRoomId`) — the interact-key edge-trigger
  reuses `CameraManager`'s already-established inline `useFrame` + ref
  pattern rather than being extracted into a new testable unit, since it's
  used in exactly one place (`Terminal.tsx`) and extracting a
  one-consumer pure helper would be premature abstraction.
- `src/engine/managers/EventBus.test.ts` is not extended for the same
  reason Phase 4 didn't extend it for `portal:trigger`/`camera:reset`:
  `mitt`'s generic dispatch is already proven, and TypeScript enforces the
  new payload shape at compile time.

## Out of Scope (explicitly)

- Any content for `about-me`, `experience-service`, or any room past
  `auth-service` — those stay on `RoomTemplate`'s generic shell until their
  own phase.
- Typed/free-text terminal input and its Zod validation — Phase 6
  (`about.md` "cat" commands) and Phase 12 (Contact Gateway's POST form)
  per `SKILLS.md`'s Coding Standards.
- Sound cues for terminal open/close — Phase 14's audio pass, per
  `SKILLS.md`'s Sound Strategy (already true for Phase 4's portals too).
- External 3D models/textures for these rooms — primitive geometry only,
  matching every room built so far.
- Any change to `ROOM_REGISTRY`, `Portal`, portal spawn geometry, or the
  traversal/fade system built in Phase 4.
