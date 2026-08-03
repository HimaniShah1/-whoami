# Phase 6: About Me Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `about-me` bespoke content — a pedestal-supported terminal
holding the (deliberately, honestly incomplete — see spec) `about.md`.

**Architecture:** Pure content-consumer of Phase 5's `RoomShell`/`Terminal`
— no new shared infrastructure. One file changes.

**Tech Stack:** React Three Fiber, `@react-three/rapier`.

## Global Constraints

- TypeScript strict mode; `@typescript-eslint/no-explicit-any` is an error.
- Components: PascalCase, default export, no exceptions.
- Three.js material colors import from `src/engine/constants/design-tokens.ts`'s
  `colors` object — never hardcode hex values.
- This project requires Node >= 22 (`.nvmrc` pins `22.22.3`) — every shell
  command touching `npm`/`npx`/`node` must chain `source ~/.nvm/nvm.sh &&
  nvm use 22.22.3 && <command>` in the same call, since shell state does
  not persist between tool calls.
- No unit test for this task — R3F component composing already-tested
  shared components (`RoomShell`, `Terminal`), matching every Phase 5
  bespoke room's manually-verified bucket.
- **The `about.md` content is intentionally not a real biography.** The
  design spec (`docs/superpowers/specs/2026-08-03-phase6-about-me-design.md`)
  explains why: the site owner's real bio isn't available in this
  environment, and inventing one would misrepresent a real person.
  Reproduce the exact three-line content given in Task 1 verbatim — do not
  embellish, extend, or "improve" it into something that reads as a real
  biography.

---

### Task 1: Bespoke `AboutMeRoom`

**Files:**
- Modify: `src/scenes/world/AboutMeRoom.tsx`

**Interfaces:**
- Consumes: default-exported `RoomShell` (`src/scenes/world/shared/RoomShell.tsx`,
  Phase 5), default-exported `Terminal` (`src/scenes/world/shared/Terminal.tsx`,
  Phase 5), `colors` (`src/engine/constants/design-tokens.ts`, existing).
- Produces: default-exported `AboutMeRoom()` — unchanged export shape from
  the current thin wrapper; `SceneManager.tsx`'s `ROOM_LOADERS['about-me']`
  entry already points at this file and needs no change.

No unit test — R3F component, manually-verified bucket.

- [ ] **Step 1: Read the current file**

Read `src/scenes/world/AboutMeRoom.tsx` in full before editing — confirm it
still matches the thin-wrapper shape from Phase 4/5
(`return <RoomTemplate roomId="about-me" />;`). If it has diverged, adapt
this step to preserve any changes found.

- [ ] **Step 2: Replace `AboutMeRoom.tsx`**

Replace the full contents of `src/scenes/world/AboutMeRoom.tsx`:
```tsx
import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import RoomShell from './shared/RoomShell';
import Terminal from './shared/Terminal';

const ABOUT_ME_LINES = [
  'cat about.md',
  '',
  'Himani Shah',
  'himanishah202@gmail.com',
  '',
  '[bio pending — the rest of this file is mine to write]',
];

export default function AboutMeRoom() {
  return (
    <RoomShell roomId="about-me" showLabel={false}>
      <RigidBody type="fixed" colliders="cuboid" position={[0, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 1, 0.6]} />
          <meshStandardMaterial color={colors.rackFrame} metalness={0.4} roughness={0.6} />
        </mesh>
      </RigidBody>
      <Terminal
        id="about-me-term"
        title="about.md"
        lines={ABOUT_ME_LINES}
        position={[0, 1.6, 0]}
      />
    </RoomShell>
  );
}
```

Note on geometry: the pedestal (`[0.6, 1, 0.6]` centered at `y=0.5`) spans
floor level (`y=0`, `RoomShell`'s floor top surface) up to `y=1.0`, which is
exactly where `Terminal`'s own kiosk mesh (`[0.8, 1.2, 0.15]` centered at
`position.y=1.6`, so spanning `y=[1.0, 2.2]`) begins — the pedestal visually
supports the terminal instead of it floating unsupported, addressing the
Minor finding from Phase 5's whole-branch review. Both share `x=0, z=0`, so
this introduces no new proximity-radius geometry to verify beyond what
Phase 4/5 already proved for the standard room template (terminal and
portals are exactly as far apart as every other Phase 5 room).

Reproduce `ABOUT_ME_LINES` exactly as given above — this is the intentional,
honest placeholder content the design spec calls for, not a real biography
to be filled in by the implementer.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/world/AboutMeRoom.tsx
git commit -m "Give about-me bespoke content: pedestal-supported about.md terminal"
```

---

### Task 2: Full verification pass

**Files:** none created; this task only runs and observes.

- [ ] **Step 1: Run the full automated check suite**

Run: `npm run test`
Expected: all existing tests pass, no regressions (this task adds no new
tests).

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 2: Confirm no uncommitted changes remain**

Run: `git status`
Expected: clean working tree.
