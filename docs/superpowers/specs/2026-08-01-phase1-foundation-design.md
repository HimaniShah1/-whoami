# Phase 1: Foundation & Tooling — Design

## Context

This is Phase 1 of a 15-phase build of "Backend Odyssey," an immersive 3D
interactive portfolio where the visitor plays an HTTP request traveling
through a fictional backend infrastructure (load balancer → API gateway →
auth → content rooms → contact gateway). Full vision lives in the project's
root instructions; this spec covers only the foundation phase — no gameplay
content yet.

**Goal of this phase:** stand up the architectural skeleton so every later
phase has a stable place to plug into. Deliverable is a running app with an
empty first-person-camera-capable 3D scene (one placeholder room), the core
manager/store abstractions wired up (even where they're near no-ops today),
and `SKILLS.md` v1 committed as the project handbook.

## Tech Stack

- Next.js (latest, App Router) + TypeScript (strict mode, no `any`)
- React Three Fiber + Three.js + @react-three/drei
- @react-three/rapier for physics
- Zustand for state
- Tailwind CSS for 2D UI chrome; shadcn/ui only for overlay components (forms, modals)
- Framer Motion for 2D UI transitions; GSAP reserved for complex 3D/timeline animation later
- Vitest for unit tests of pure logic
- ESLint + Prettier

## Folder Structure

```
portfolio/
  SKILLS.md
  docs/superpowers/specs/
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
    components/
      canvas/        # R3F <Canvas> wrapper + providers
      hud/            # HUD overlay (request id, latency, ttl, status)
      ui/             # shadcn-based overlays (forms, modals)
      boot/           # boot sequence (built out in Phase 3)
    scenes/
      world/          # room components (added from Phase 4 onward)
    engine/
      state/
        useGameStore.ts
        useUIStore.ts
      managers/
        SceneManager.tsx
        CameraManager.tsx
        AudioManager.ts
        EventBus.ts
      hooks/
        useKeyboardControls.ts
        useProximity.ts
      physics/
        PhysicsProvider.tsx
      constants/
        rooms.ts
        design-tokens.ts
    types/
      game.ts
      rooms.ts
    lib/
      utils.ts
  public/
    models/
    textures/
    audio/
    fonts/
```

## Design System (v1 tokens)

- **Palette:** near-black infrastructure backgrounds (`#0a0e14`–`#12161f`),
  cool blue-white primary accents (`#4fd1ff`, `#e6f7ff`) for active/network
  elements, status LEDs in amber (`#ffb454` warning), green (`#3ddc84`
  healthy), red (`#ff5f56` error). Fog color matches background to avoid
  visible pop-in.
- **Typography:** monospace everywhere (IBM Plex Mono or JetBrains Mono) —
  terminal text, HUD, labels. This is "engineering software," not a
  marketing site; no decorative sans-serif headlines.
- **Lighting mood:** dark industrial, subtle blue/white key lighting, warm
  LED accents, soft fog, restrained bloom (full lighting pass is a later
  phase; this phase only sets the baseline scene lighting rig).

## Core Abstractions

1. **EventBus** — lightweight pub/sub (`mitt`) for decoupled cross-cutting
   events (`room:entered`, `terminal:command`, `packet:delivered`) so scenes,
   audio, and HUD can react without direct coupling to each other.
2. **useGameStore** (Zustand) — `requestId`, `currentRoomId`, `unlockedRooms:
   Set<RoomId>`, `ttl`, `latencyMs`, `protocol`, `status`, `visitedRooms`,
   `collectedEasterEggs`. This is "world/progress" state.
3. **useUIStore** (Zustand) — `audioMuted`, `volume`, `reducedMotion`,
   `activeOverlay: 'contact' | 'resume' | null`. Kept separate from game
   state so UI-only changes don't trigger scene re-renders.
4. **SceneManager** — registry mapping `roomId → { component, position,
   connections, unlockRequirement }`; lazy-loads room components via
   `React.lazy`/Suspense based on player proximity, not all at once.
5. **CameraManager** — wraps drei's `PointerLockControls` for first-person
   view, layering in movement inertia and subtle head-bob on top (tuned in
   Phase 2). Exposes read-only camera state for the HUD.
6. **AudioManager** — thin wrapper (Howler.js) with two channels: ambient
   loop layer and one-shot SFX layer, both gated by `useUIStore`'s mute/volume.
7. **PhysicsProvider** — wraps `@react-three/rapier`'s `<Physics>` at the
   canvas root; per-room colliders are added by each room component later.

## Camera & Perspective Decision

**First-person**, not third-person. Reasoning: no rigged/animated character
model needed (avoids a large asset-production burden for a portfolio site),
it's the genre convention for environmental-storytelling walking sims
(Portal, SOMA, The Stanley Parable), and it keeps visual focus on the
infrastructure itself rather than an avatar. Implemented via drei's
`PointerLockControls` + a custom rigidbody-driven movement controller
(built out fully in Phase 2).

## Error Handling

- **WebGL context loss:** global listener shows a themed fallback overlay
  ("Connection Lost — Reload") rather than a blank screen.
- **Asset load failure per room:** each lazy-loaded room is wrapped in an
  `ErrorBoundary` that renders a themed "503 Service Unavailable" placeholder
  with a retry action — reinforces the backend metaphor instead of breaking it.
- **No-WebGL / very low-end device:** detected at boot; visitor is routed to
  a static fallback page describing the experience with direct links to
  resume, LinkedIn, and a plain contact form. This is also the accessibility
  floor for anyone who can't/shouldn't use the 3D experience.

## Accessibility (foundation-level; full pass is Phase 15)

- `prefers-reduced-motion` is detected at boot and stored in `useUIStore`;
  `CameraManager` disables head-bob/inertia when set, and shared animation
  utilities shorten/skip transitions.
- Arrow keys work as an alias for WASD from the start.
- Interactive prompts ("Press E to interact") are mirrored into an
  ARIA live region for screen readers, acknowledging plainly in `SKILLS.md`
  that a spatial 3D experience has real, honest limits for non-visual users
  — the static fallback page is the accessible path of last resort, not a
  pretense that the 3D world itself is fully screen-reader navigable.

## Testing Strategy

- TypeScript strict mode is the primary correctness gate — no `any`.
- Vitest unit tests for pure logic only: store transitions, `EventBus`,
  room-unlock logic, TTL/latency countdown math. R3F rendering itself is
  verified manually via dev server + browser, not unit-tested.
- Each phase's implementation is checked against its golden path in a
  running browser before being marked complete (per project convention).

## Coding Standards (for `SKILLS.md`)

- Components: PascalCase, default export (Next.js convention for special
  files like `page.tsx`/`layout.tsx` requires default export anyway, so this
  is applied consistently to all components for uniformity).
- Hooks/utils: camelCase, named exports only, hooks prefixed `use`.
- Files: kebab-case except component files, which match their PascalCase
  component name.
- No `any`; use `unknown` + narrowing. Any externally-sourced or
  user-provided data (terminal command parsing, contact form input) is
  validated with Zod.

## Phase 1 Deliverable (what "done" means)

- Running Next.js app; visiting `/` shows a black canvas that boots directly
  into a single placeholder-lit room (a box "server rack" primitive) with a
  working first-person pointer-lock camera (rough movement is fine — full
  feel tuning is Phase 2).
- All manager/store files exist and are wired into the app, even if several
  are near no-ops right now (e.g., `AudioManager` has no sounds loaded yet).
- `SKILLS.md` v1 committed, covering at minimum: project vision, folder
  structure, design tokens, component philosophy, naming conventions, and
  the abstractions listed above.
- `git` repo initialized, this spec and the resulting code committed.
