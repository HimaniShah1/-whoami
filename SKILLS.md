# SKILLS.md — Backend Odyssey Project Handbook

This is the living internal handbook for "Backend Odyssey": an immersive
first-person 3D portfolio where the visitor plays an HTTP request traveling
through a fictional but believable backend infrastructure. Every architectural
decision that later work should respect is recorded here. Update this file
whenever a phase changes or extends an established pattern — do not let it
drift out of date.

## Project Vision

Not a portfolio website — an experience that happens to contain a portfolio.
The visitor is an HTTP request that enters through a load balancer, is
authenticated, and travels deeper into the system (about me → experience →
projects → skills → database → monitoring → deployment → contact gateway).
Reaching the Contact Gateway and submitting a message is the "win state" —
the request escapes the backend. Every room should teach the visitor
something real about backend engineering, not just look like it does.

## Architecture

- **Next.js App Router** hosts a single client-rendered experience. There is
  no server-rendered content beyond the shell — this is a client-side 3D
  application.
- **`AppRoot`** (`src/components/AppRoot.tsx`) is the single entry point: it
  detects WebGL support and `prefers-reduced-motion`, then renders either the
  3D `Experience` + `Hud`, the static `WebGLUnavailable` fallback, or
  `ConnectionLost` if the GPU context dies mid-session. It also gates entry
  behind `BootSequence` (Phase 3) on a once-per-session basis, backed by
  `sessionStorage` (`src/lib/session.ts`), so the boot log only plays once per
  browser session rather than on every mount.
- **`Experience`** (`src/components/canvas/Experience.tsx`) owns the R3F
  `Canvas` and composes `PhysicsProvider` → `CameraManager` → `SceneManager`.
  It also attaches the `webglcontextlost` listener and reports it upward via
  an `onContextLost` prop rather than owning the fallback UI itself.
- **`SceneManager`** (`src/engine/managers/SceneManager.tsx`) is a registry
  (`RoomId → lazy component`) that lazily loads and renders only the active
  room, wrapped in `RoomErrorBoundary`. New rooms are added here, one line
  per room, as each phase builds them.
- **State** is split into two Zustand stores by concern, not merged into one:
  `useGameStore` (world/progress — current room, visited rooms, request
  identity, easter eggs) and `useUIStore` (UI-only — mute, volume, reduced
  motion, active overlay). Merging them would cause UI-only changes to
  re-render 3D-relevant consumers and vice versa.
- **`EventBus`** (`src/engine/managers/EventBus.ts`, built on `mitt`) is for
  cross-cutting notifications that multiple unrelated systems care about
  (`room:entered`, `room:unlocked`, `terminal:command`, `packet:delivered`).
  It is not a replacement for the stores — state lives in Zustand; the bus is
  for "something happened, react if you care."
- **`AudioManager`** (`src/engine/managers/AudioManager.ts`) is a singleton
  with a real `registerAmbient`/`registerSfx`/`playAmbient`/`stopAmbient`/
  `playSfx` API, but no sounds are registered until later phases start
  calling `registerAmbient`/`registerSfx` with real files.

## Folder Structure

```
src/
  app/                  # Next.js App Router shell only — no business logic
  components/
    canvas/             # Non-room R3F/DOM components that live alongside the Canvas
    hud/                # 2D HUD overlay
    ui/                 # shadcn-based overlays (forms, modals) — added from Phase 12
    boot/               # Boot sequence — added in Phase 3
  scenes/
    world/              # One file per room, registered in SceneManager
  engine/
    state/              # Zustand stores
    managers/           # Cross-cutting singletons: EventBus, SceneManager, CameraManager, AudioManager, RoomErrorBoundary
    hooks/               # Reusable hooks (useKeyboardControls, useProximity, ...)
    physics/             # Physics provider/abstractions
    constants/           # Design tokens, room registry
  types/                 # Shared TypeScript types
  lib/                   # Framework-agnostic pure utilities (cn, webgl, reduced-motion, session)
public/
  models/ textures/ audio/ fonts/
```

## Design System

### Color Palette

| Token | Hex | Use |
|---|---|---|
| `background` | `#0a0e14` | Canvas background, page background |
| `backgroundElevated` | `#12161f` | Floors, panels, elevated surfaces |
| `primary` | `#4fd1ff` | Active network/data elements, key lighting |
| `primaryMuted` | `#e6f7ff` | HUD text, ambient light tint |
| `statusHealthy` | `#3ddc84` | Healthy status LEDs/metrics |
| `statusWarning` | `#ffb454` | Warning status LEDs/metrics |
| `statusError` | `#ff5f56` | Error states, error boundaries, connection-lost UI |
| `fog` | `#0a0e14` | Always matches `background` to avoid visible geometry pop-in |
| `textMuted` | `#8fa3b8` | Secondary/muted body text on dark surfaces |
| `rackFrame` | `#1b2230` | Server rack / hardware frame material color |

Source of truth is `src/engine/constants/design-tokens.ts` — never hardcode
these hex values in JSX/TSX; import `colors`. Tailwind CSS itself can't
reference a runtime JS object, so `src/app/globals.css`'s `@theme` block
mirrors the same hex values as `--color-*` CSS variables (`bg-background`,
`text-primary-muted`, etc.) for use in Tailwind classes — when a token's hex
value changes, update both files together.

### Typography

Monospace everywhere (`JetBrains Mono` / `IBM Plex Mono` fallback chain,
defined as `fonts.mono`). This is deliberate: the whole UI reads as
engineering tooling, not a marketing site. No decorative sans-serif
headlines, ever.

## Component Philosophy

- One clear responsibility per file. A room file owns its geometry/lighting/
  interactions; it does not own global state mutation logic beyond calling
  store actions.
- Presentational HUD/DOM components (`Hud`, `WebGLUnavailable`,
  `ConnectionLost`) contain no business logic — they read from stores and
  render.
- Manager files (`CameraManager`, `SceneManager`, `PhysicsProvider`,
  `AudioManager`, `RoomErrorBoundary`) are the only places allowed to reach
  into third-party R3F/physics/audio APIs directly; rooms consume them, not
  the raw libraries, wherever a manager abstraction already exists.

## Three.js / React Three Fiber Patterns

- Rooms are plain functions returning a `<group>` of lights + geometry +
  `RigidBody` colliders — no class components (the one exception is
  `RoomErrorBoundary`, which must be a class because React error boundaries
  require the `getDerivedStateFromError` lifecycle method).
- Reusable geometry/material combinations that recur across rooms should be
  extracted into their own component under `scenes/world/shared/` once a
  second room needs them. Established in Phase 4: `Portal` (the walk-through
  room-to-room interactable) and `RoomTemplate` (the generic floor/lighting/
  label/portals shell used by every room except the bespoke `load-balancer`)
  both live there.
- `SceneManager`'s registry is the only place `React.lazy` is called for
  rooms; lazy components are created once at module scope, never inside a
  render function (recreating a lazy component every render causes remount/
  resuspend loops).
- Every room rendered by `SceneManager` is wrapped in `RoomErrorBoundary`, so
  a broken room degrades to a themed "503 Service Unavailable" panel instead
  of crashing the whole experience.

## Animation Conventions

- Per-frame animation logic lives in `useFrame` callbacks inside the
  component that owns the animated object, not in a global animation loop.
- `useUIStore.reducedMotion` must be checked by any animation that isn't
  essential to gameplay comprehension (camera head-bob/inertia, decorative
  particle motion); essential feedback (a lit-up interactable, a status LED)
  still animates, just without the purely decorative motion layered on top.
- GSAP is for multi-step cinematic timelines — do not reach for it for simple
  per-frame movement, which `useFrame` handles more simply. The boot sequence
  (Phase 3) established the pattern: a single `gsap.timeline()` with one
  `.call()` (reveal a line) + one `.to()` (advance progress) pair per line,
  followed by a trailing hold. Skip is implemented via `timeline.progress(1)`,
  which fires all intervening callbacks — `timeline.seek()` would NOT, since
  it suppresses events by default, so future phases copying this pattern
  should reach for `progress(1)`, not `seek()`.

## State Management Conventions

- `useGameStore` and `useUIStore` stay separate — do not merge them.
- Select individual fields from Zustand stores (`useGameStore((s) =>
  s.currentRoomId)`), not object literals (`useGameStore((s) => ({...}))`),
  since the latter creates a new object every render and defeats Zustand's
  re-render optimization.
- Cross-cutting side effects (audio cues, achievement toasts) subscribe to
  `EventBus`, not to store changes directly, so they stay decoupled from
  which store happens to own the underlying state.
- `requestId` remains a static placeholder generated once on module load.
  `ttl` and `latencyMs`, static placeholders through Phase 3, became dynamic
  in Phase 4: `enterRoom` decrements `ttl` by 1 per successful hop (floored
  at 0) and sets `latencyMs` to a randomized spike, which `RoomTransition`
  eases back down to a resting baseline via `setLatency` after the fade
  completes.

## Coding Standards

- TypeScript strict mode; `@typescript-eslint/no-explicit-any` is an error.
  Use `unknown` + narrowing instead of `any`.
- Components: PascalCase, default export — no exceptions, including small
  presentational components.
- Hooks/utils: camelCase, named exports only; hooks prefixed `use`.
- Files: kebab-case, except component files which match their PascalCase
  component name.
- Any externally-sourced or user-provided data (terminal command input,
  contact form input, added from Phase 6 and Phase 12 respectively) is
  validated with Zod before use.

## Accessibility Rules

- `prefers-reduced-motion` is detected at boot (`src/lib/reduced-motion.ts`)
  and stored in `useUIStore.reducedMotion`; respect it per the Animation
  Conventions above.
- Arrow keys work as an alias for WASD from Phase 1 onward.
- Interactive prompts ("Press E to interact", added from Phase 5's Entry
  sequence, where the terminal pattern is first established) must also be
  mirrored into an ARIA live region for screen readers. Phase 4's
  room-to-room portals are walk-through triggers, not E-press interactions —
  this rule doesn't apply to them.
- Be honest about limits: a spatial 3D experience is not fully navigable
  non-visually. The `WebGLUnavailable` fallback (also shown to users who
  disable WebGL) is the accessible path of last resort, not a claim that the
  3D world itself is screen-reader-complete.

## Performance Rules

- Rooms load lazily via `SceneManager`'s registry — never import all rooms
  eagerly into `Experience`.
- Prefer instanced meshes for any repeated geometry (server racks, cables,
  status lights) once a room needs more than a handful of repeated objects —
  not yet needed; every room through Phase 4 has only a handful of primitives
  each (floor, one or two portals, a light or two).
- Physics colliders are `type="fixed"` for static geometry; only moving
  objects (packets, robots, once built) get dynamic rigid bodies.

## Naming Conventions

See Coding Standards above — this section exists so future contributors
find "naming" under its own heading; the rules are not duplicated here.

## Camera Strategy

First-person via drei's `PointerLockControls`, not third-person. No rigged
avatar is needed, it matches the genre convention for environmental-
storytelling walking sims, and it keeps focus on the infrastructure rather
than a character model. `CameraManager` (`src/engine/managers/
CameraManager.tsx`) owns pointer lock + movement. Phase 1 ships rough,
functional WASD movement; inertia and head-bob are added in Phase 2 — do not
consider their absence a bug before then.

## Lighting Strategy

Dark industrial baseline: low ambient light tinted with `primaryMuted`, a
single strong `primary`-colored point light per room as the key light, fog
matched to the background color to hide pop-in at the fog-clipped distance.
Warm LED accent lights and volumetric beams are layered in per-room starting
Phase 4, once rooms have real geometry worth lighting dramatically. Avoid
excessive bloom — the brief explicitly calls for a believable datacenter, not
neon overload.

## Asset Strategy

Phase 1 uses only primitive geometry (`boxGeometry`) — no external 3D models
yet. `public/models/`, `public/textures/`, `public/audio/`, and
`public/fonts/` exist as the landing spots for real assets starting Phase 3
(fonts for the boot terminal) and Phase 4 onward (models/textures for real
rooms). Compress textures and prefer `.glb` over `.gltf` + separate assets
once real models are introduced.

## Sound Strategy

`howler` is installed and `AudioManager` (`src/engine/managers/
AudioManager.ts`) has a real registration/playback API, but no sounds are
registered yet — that starts as soon as a phase needs a specific cue (Phase
4 onward for interaction SFX) and is fully realized in the Phase 14 audio
pass. Do not add ad hoc `Audio()`/`Howl()` calls in room components; always
go through `audioManager`.

## Physics Guidelines

`@react-three/rapier`'s `<Physics>` wraps the whole `Experience` tree via
`PhysicsProvider`. Static room geometry uses `RigidBody type="fixed"
colliders="cuboid"` (or a more precise collider shape once room geometry
stops being simple boxes). Debug wireframes are only shown in development
(`process.env.NODE_ENV === 'development'`).

**The player now has a real physics body.** `CameraManager` mounts an
invisible `kinematicPosition` `RigidBody` with a `CapsuleCollider`, and
drives it each frame through a Rapier `KinematicCharacterController`
(`world.createCharacterController`). `camera.position` is still set every
frame, but now from the physics body's collision-resolved translation
rather than accumulated directly. The capsule's dimensions are derived from
`EYE_HEIGHT`, not independently tuned: its total height equals `EYE_HEIGHT`,
so the eyes sit at the capsule's top, reached via `PLAYER_EYE_OFFSET`
(`EYE_HEIGHT / 2`) — a fixed, derived constant, not a separately tunable
one. This means fixed
colliders — including the locked-portal collider added in Phase 4 — now
genuinely block the player via real collision resolution, not just
visually. No autostep or snap-to-ground is enabled (every room floor is
flat). One consequence worth noting: rooms have no perimeter walls, so
real collision-based grounding means walking off a room's floor edge can
cause an actual fall (previously impossible under the old height-only
clamp) — a void-fall safety net in `CameraManager` catches this by
snapping the player back to `(0, EYE_HEIGHT, 0)` if they fall below a
threshold, relying on every room's floor being centered at its local
origin.

## Scene Organization

One file per room under `scenes/world/`, registered by `RoomId` in
`SceneManager`'s `ROOM_LOADERS` map. As of Phase 4, every `RoomId` has a
loader: `load-balancer` uses its own bespoke `PlaceholderRoom`, and the
other 10 are thin wrapper files (e.g. `ApiGatewayRoom.tsx`) that each render
the shared `RoomTemplate` with their own room id — real bespoke content
replaces a wrapper's generic template one room/cluster at a time starting
Phase 5, without touching `SceneManager` again. Every registered room is
automatically wrapped in `RoomErrorBoundary` by `SceneManager` — rooms do
not need to add their own error handling.

## Reusable Interaction Patterns

Established in later phases, recorded here as they're built:
- **Terminal interaction** (Phase 5): walk up, press E, text prints with a
  blinking cursor. Built once during the Entry sequence (Load Balancer → API
  Gateway → Auth), reused for About Me (Phase 6), hidden terminals, and the
  Contact Gateway's POST-request form.
- **Proximity trigger** (`useProximity`, added Phase 4): generic hook for
  "player is within N units of point X" — powers interact prompts and future
  room preloading. `src/lib/proximity.ts`'s `isWithinRadius` is the pure,
  unit-tested distance check underneath it; `useProximity` itself is
  R3F-context-dependent and manually verified only.
- **Room-to-room portals** (`Portal`/`RoomTransition`, Phase 4): crossing a
  portal's proximity radius (not an E-press — reserved for the terminal
  pattern above) emits `EventBus`'s `portal:trigger`, which `RoomTransition`
  turns into a GSAP fade-out → `enterRoom` + `camera:reset` → fade-in
  sequence. Portals are locked-aware (`useGameStore.isUnlocked`) and
  bidirectional, derived from `ROOM_REGISTRY`'s forward `connections` via
  `getIncomingRoomId` — no separate back-connection data is stored.
- **Boot Sequence** (`src/components/boot/`, Phase 3): the established split
  for cinematic/timeline-driven UI is `bootScript.ts` (pure content
  generation), `TerminalOutput.tsx` (presentation), and `BootSequence.tsx`
  (GSAP orchestration) — reuse this split for future timeline-driven overlays.
  `RoomTransition` (Phase 4) follows the same GSAP-timeline convention:
  hold the running timeline in a ref and `.kill()` it on unmount, matching
  `BootSequence`'s cleanup.

## Future Roadmap

1. Foundation & tooling (this phase)
2. Player & camera feel pass (inertia, head-bob)
3. Boot sequence
4. World shell & traversal (room-to-room portals, unlock progression)
5. Entry sequence (Load Balancer → API Gateway → Auth), terminal pattern established
6. About Me terminal
7. Experience service rooms
8. Projects cluster (3 explorable project environments)
9. Skills dashboard
10. Database layer & monitoring center
11. Deployment pipeline
12. Contact gateway (finale) + resume/LinkedIn satellites
13. Hidden content & easter eggs
14. Audio pass
15. Performance & accessibility polish

## Things to Avoid

- Fantasy or generic cyberpunk aesthetics, neon overload, excessive bloom.
- A giant navigation bar, "scroll down" affordances, hero sections, or cards
  floating in space — this is a spatial experience, not a scrolling page.
- Merging `useGameStore` and `useUIStore`.
- Selecting Zustand state with object-literal selectors (see State Management
  Conventions).
- Installing a dependency before a phase actually needs it.
- Recreating `React.lazy` components inside a render function.
- Ad hoc audio calls that bypass `audioManager`.

## Design Principles

Every visual and interaction decision is judged by "does this best
communicate backend engineering?", not "does this look cool?". When the two
conflict, backend-engineering clarity wins.

## Backend-Inspired UX Principles

- Navigation is spatial and physical (walking through infrastructure), never
  a menu bar — but progression is still legible via the room-unlock system
  (`useGameStore.isUnlocked`) so visitors always know what's next.
- Feedback uses backend vocabulary: a failed interaction is a themed "503
  Service Unavailable" placeholder (`RoomErrorBoundary`), not a generic
  broken-image icon; a dead GPU context is "CONNECTION LOST", not a blank
  screen.
- The HUD frames the visitor as the payload of an HTTP request (request id,
  protocol, TTL, latency, status) at all times — it is the one piece of
  persistent UI, and it stays minimal and non-distracting.
