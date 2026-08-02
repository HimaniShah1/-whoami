# Phase 5: Entry Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `load-balancer`, `api-gateway`, and `auth-service` bespoke
content, and build the reusable "walk up, press E, text prints" terminal
interaction pattern those three rooms are the first to use.

**Architecture:** Extract `RoomShell` (floor/lighting/portals baseline,
already duplicated between `PlaceholderRoom` and `RoomTemplate`) so both
generic and bespoke rooms share it. Add a `Terminal`/`TerminalOverlay` pair
that mirrors Phase 4's `Portal`/`RoomTransition` split: an in-scene R3F
trigger reads proximity + the `interact` key and emits one `EventBus`
event; a single top-level DOM component owns the actual reveal panel, GSAP
timeline, and ARIA live region.

**Tech Stack:** React Three Fiber, `@react-three/rapier`, GSAP, Zustand,
`mitt`-based EventBus, Vitest + React Testing Library.

## Global Constraints

- TypeScript strict mode; `@typescript-eslint/no-explicit-any` is an error.
- Components: PascalCase, default export, no exceptions. Hooks/utils:
  camelCase, named exports only.
- Three.js material colors import from `src/engine/constants/design-tokens.ts`'s
  `colors` object — never hardcode hex values in JSX/TSX.
- This project requires Node >= 22 (`.nvmrc` pins `22.22.3`) — every shell
  command touching `npm`/`npx`/`node` must chain `source ~/.nvm/nvm.sh &&
  nvm use 22.22.3 && <command>` in the same call, since shell state does
  not persist between tool calls.
- This codebase has real React-Compiler-aware ESLint rules
  (`react-hooks/set-state-in-effect`, `react-hooks/immutability`,
  `react-hooks/exhaustive-deps`, `react-hooks/static-components`,
  `react-hooks/refs`) that fire on legitimate patterns this codebase
  relies on — prefer a root-cause fix over suppression when one exists,
  otherwise add a scoped `eslint-disable` with justification matching
  existing precedent in the file being edited (e.g. `RoomTransition.tsx`'s
  `reducedMotionRef` sync-via-effect pattern for `react-hooks/refs`).
- Pure functions and RTL-testable presentational components get unit
  tests. GSAP-timeline-driven and `useFrame`/`useThree`/proximity/keyboard
  -dependent R3F components are manually verified only, matching the
  established convention (`CameraManager.tsx`, `BootSequence.tsx`,
  `Portal.tsx`, `RoomTransition.tsx`) — do not attempt to unit-test them.
- Every task ends with `npx tsc --noEmit` passing and, where applicable,
  `npm run test`/`npm run lint` passing, before committing.

---

### Task 1: Add `terminal:trigger` event to EventBus

**Files:**
- Modify: `src/engine/managers/EventBus.ts`

**Interfaces:**
- Produces: `AppEvents['terminal:trigger']: { id: string; title: string;
  lines: string[] }`. Consumed by Task 4 (`Terminal.tsx`, emits it) and
  Task 5 (`TerminalOverlay.tsx`, listens for it).

No new test — `EventBus.test.ts` already proves `mitt`'s generic dispatch
works for arbitrary event names/payloads; TypeScript enforces the new
payload shape at compile time.

- [ ] **Step 1: Add the event type**

Modify `src/engine/managers/EventBus.ts` — add one entry to `AppEvents`
(the file currently has `room:entered`, `room:unlocked`, `terminal:command`,
`packet:delivered`, `portal:trigger`, `camera:reset`; add this as a new
entry, keeping all existing ones untouched):
```ts
  'terminal:trigger': { id: string; title: string; lines: string[] };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run existing tests**

Run: `npm run test -- src/engine/managers/EventBus.test.ts`
Expected: PASS (2 tests, unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/engine/managers/EventBus.ts
git commit -m "Add terminal:trigger event to EventBus"
```

---

### Task 2: Extract `RoomShell` from `RoomTemplate`

**Files:**
- Create: `src/scenes/world/shared/RoomShell.tsx`
- Modify: `src/scenes/world/shared/RoomTemplate.tsx`

**Interfaces:**
- Consumes: `getRoomById`, `getIncomingRoomId` (existing), default-exported
  `Portal` (existing), `colors` (existing).
- Produces: default-exported `RoomShell({ roomId: RoomId; showLabel?:
  boolean; children?: ReactNode })` (`showLabel` defaults to `true`).
  Consumed by Task 3 (`RoomTemplate.tsx`, this task) and Tasks 7-9 (the
  three bespoke room files).

No unit test — R3F component, same manually-verified bucket as its
predecessor `RoomTemplate.tsx`.

- [ ] **Step 1: Read the current `RoomTemplate.tsx`**

Read `src/scenes/world/shared/RoomTemplate.tsx` in full before editing —
confirm it still matches the structure below (built in Phase 4; if it has
diverged, adapt this task to preserve any changes found).

- [ ] **Step 2: Create `RoomShell.tsx`**

Create `src/scenes/world/shared/RoomShell.tsx` (this is `RoomTemplate.tsx`'s
current body, generalized with `showLabel` and `children`):
```tsx
import type { ReactNode } from 'react';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import type { RoomId } from '@/types/rooms';
import { getIncomingRoomId, getRoomById } from '@/engine/constants/rooms';
import { colors } from '@/engine/constants/design-tokens';
import Portal from './Portal';

interface RoomShellProps {
  roomId: RoomId;
  showLabel?: boolean;
  children?: ReactNode;
}

export default function RoomShell({ roomId, showLabel = true, children }: RoomShellProps) {
  const room = getRoomById(roomId);
  const forwardTargetId = room.connections[0]?.roomId ?? null;
  const backTargetId = getIncomingRoomId(roomId);

  return (
    <group>
      <ambientLight intensity={0.15} color={colors.primaryMuted} />
      <pointLight position={[0, 4, 0]} intensity={8} color={colors.primary} distance={20} />

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[20, 1, 20]} />
          <meshStandardMaterial color={colors.backgroundElevated} />
        </mesh>
      </RigidBody>

      {showLabel && (
        <Html position={[0, 3, 0]} center zIndexRange={[30, 0]}>
          <div className="pointer-events-none whitespace-nowrap font-mono text-xs text-primary-muted">
            {room.name.toUpperCase()}
          </div>
        </Html>
      )}

      {forwardTargetId && <Portal targetRoomId={forwardTargetId} direction="forward" />}
      {backTargetId && <Portal targetRoomId={backTargetId} direction="back" />}

      {children}
    </group>
  );
}
```

- [ ] **Step 3: Replace `RoomTemplate.tsx` with a thin wrapper**

Replace the full contents of `src/scenes/world/shared/RoomTemplate.tsx`:
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

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass (this is a pure refactor — no room
wrapper file changes, so `SceneManager`'s registered generic rooms
render identically through the new `RoomShell` indirection).

- [ ] **Step 6: Commit**

```bash
git add src/scenes/world/shared/RoomShell.tsx src/scenes/world/shared/RoomTemplate.tsx
git commit -m "Extract RoomShell from RoomTemplate for reuse by bespoke rooms"
```

---

### Task 3: `TerminalPanel` presentational component

**Files:**
- Create: `src/components/canvas/TerminalPanel.tsx`
- Test: `src/components/canvas/TerminalPanel.test.tsx`

**Interfaces:**
- Produces: default-exported `TerminalPanel({ title: string; visibleLines:
  string[]; done: boolean; reducedMotion: boolean })`. Consumed by Task 5
  (`TerminalOverlay.tsx`).

This is pure presentational DOM (no R3F/GSAP dependency) — it gets an RTL
unit test, matching its sibling `src/components/boot/TerminalOutput.tsx`
(`TerminalOutput.test.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `src/components/canvas/TerminalPanel.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TerminalPanel from './TerminalPanel';

describe('TerminalPanel', () => {
  it('renders the title and each visible line', () => {
    render(
      <TerminalPanel
        title="lb-notes.md"
        visibleLines={['line one', 'line two']}
        done={false}
        reducedMotion={false}
      />,
    );
    expect(screen.getByText('lb-notes.md')).toBeInTheDocument();
    expect(screen.getByText('line one')).toBeInTheDocument();
    expect(screen.getByText('line two')).toBeInTheDocument();
  });

  it('shows the cursor while not done', () => {
    render(<TerminalPanel title="t" visibleLines={[]} done={false} reducedMotion={false} />);
    expect(screen.getByText('_')).toBeInTheDocument();
  });

  it('hides the cursor once done', () => {
    render(<TerminalPanel title="t" visibleLines={[]} done reducedMotion={false} />);
    expect(screen.queryByText('_')).not.toBeInTheDocument();
  });

  it('applies the pulse animation to the cursor unless reducedMotion is set', () => {
    const { rerender } = render(
      <TerminalPanel title="t" visibleLines={[]} done={false} reducedMotion={false} />,
    );
    expect(screen.getByText('_')).toHaveClass('animate-pulse');

    rerender(<TerminalPanel title="t" visibleLines={[]} done={false} reducedMotion />);
    expect(screen.getByText('_')).not.toHaveClass('animate-pulse');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/canvas/TerminalPanel.test.tsx`
Expected: FAIL — `Cannot find module './TerminalPanel'`.

- [ ] **Step 3: Implement `TerminalPanel.tsx`**

Create `src/components/canvas/TerminalPanel.tsx`:
```tsx
interface TerminalPanelProps {
  title: string;
  visibleLines: string[];
  done: boolean;
  reducedMotion: boolean;
}

export default function TerminalPanel({ title, visibleLines, done, reducedMotion }: TerminalPanelProps) {
  return (
    <div className="w-full max-w-sm rounded border border-primary/30 bg-background-elevated p-3 font-mono text-xs text-primary-muted">
      <div className="mb-2 text-primary">{title}</div>
      {visibleLines.map((line, index) => (
        <div key={index}>{line || ' '}</div>
      ))}
      {!done && (
        <span aria-hidden="true" className={reducedMotion ? '' : 'animate-pulse'}>
          _
        </span>
      )}
    </div>
  );
}
```

Note: `line || ' '` renders a non-breaking space for blank lines
(used as paragraph breaks in the terminal content) so an empty `<div>`
still takes up a visible line of vertical space instead of collapsing —
React would otherwise render an empty string as nothing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/canvas/TerminalPanel.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/canvas/TerminalPanel.tsx src/components/canvas/TerminalPanel.test.tsx
git commit -m "Add TerminalPanel presentational component"
```

---

### Task 4: `Terminal` shared in-scene trigger component

**Files:**
- Create: `src/scenes/world/shared/Terminal.tsx`

**Interfaces:**
- Consumes: `useProximity` (`src/engine/hooks/useProximity.ts`, Phase 4),
  `useKeyboardControls` (`src/engine/hooks/useKeyboardControls.ts`,
  existing — returns `RefObject<KeyboardState>` with an `interact: boolean`
  field for the E key; calling it a second time alongside
  `CameraManager`'s own call is safe, since it attaches its own
  independent `window` listeners per call with no shared state), `colors`
  (existing), `eventBus`/`AppEvents['terminal:trigger']` (Task 1).
- Produces: default-exported `Terminal({ id: string; title: string; lines:
  string[]; position: [number, number, number] })`. Consumed by Tasks 8-10
  (the three bespoke room files).

No unit test — R3F component combining `RigidBody`, `useProximity`,
`useKeyboardControls`, and `EventBus` side effects; manually verified only
(Task 10), matching `Portal.tsx`'s bucket.

- [ ] **Step 1: Implement `Terminal.tsx`**

Create `src/scenes/world/shared/Terminal.tsx`:
```tsx
'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import { useProximity } from '@/engine/hooks/useProximity';
import { useKeyboardControls } from '@/engine/hooks/useKeyboardControls';
import { colors } from '@/engine/constants/design-tokens';
import { eventBus } from '@/engine/managers/EventBus';

const TERMINAL_INTERACT_RADIUS = 2;

interface TerminalProps {
  id: string;
  title: string;
  lines: string[];
  position: [number, number, number];
}

export default function Terminal({ id, title, lines, position }: TerminalProps) {
  const inRange = useProximity(position, TERMINAL_INTERACT_RADIUS);
  const keyboard = useKeyboardControls();
  const wasInteractPressedRef = useRef(false);

  useFrame(() => {
    const interactPressed = keyboard.current.interact;
    if (inRange && interactPressed && !wasInteractPressedRef.current) {
      eventBus.emit('terminal:trigger', { id, title, lines });
    }
    wasInteractPressedRef.current = interactPressed;
  });

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow>
          <boxGeometry args={[0.8, 1.2, 0.15]} />
          <meshStandardMaterial
            color={colors.rackFrame}
            emissive={colors.primary}
            emissiveIntensity={0.3}
          />
        </mesh>
      </RigidBody>
      {inRange && (
        <Html position={[0, 0.9, 0]} center zIndexRange={[30, 0]}>
          <div className="pointer-events-none whitespace-nowrap font-mono text-xs text-primary">
            [E] Interact
          </div>
          <span role="status" aria-live="polite" className="sr-only">
            {title} nearby — press E to interact
          </span>
        </Html>
      )}
    </group>
  );
}
```

Note: the `[E] Interact` prompt and its `sr-only` ARIA live-region mirror
are colocated in the same conditionally-rendered `Html` block, satisfying
`SKILLS.md`'s Accessibility Rule that interactive prompts must be mirrored
into an ARIA live region — the live region only gains content while
`inRange` is true, so a screen reader announces it once on approach and
falls silent again on leaving.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. The `useFrame` callback's dependency-free closure over
`inRange`/`id`/`title`/`lines` matches the established unmemoized-per-render
pattern already used in `CameraManager.tsx` and `Portal.tsx` — no
suppression should be needed.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/world/shared/Terminal.tsx
git commit -m "Add shared Terminal in-scene trigger component"
```

---

### Task 5: `TerminalOverlay` DOM orchestrator

**Files:**
- Create: `src/components/canvas/TerminalOverlay.tsx`

**Interfaces:**
- Consumes: `eventBus`/`AppEvents['terminal:trigger']` (Task 1),
  `useUIStore.reducedMotion` (existing), default-exported `TerminalPanel`
  (Task 3), `gsap` (installed).
- Produces: default-exported `TerminalOverlay()` (no props). Consumed by
  Task 6 (`AppRoot.tsx`).

No unit test — GSAP-timeline-driven component, same bucket as
`RoomTransition.tsx`; manually verified in Task 10.

- [ ] **Step 1: Implement `TerminalOverlay.tsx`**

Create `src/components/canvas/TerminalOverlay.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { eventBus, type AppEvents } from '@/engine/managers/EventBus';
import { useUIStore } from '@/engine/state/useUIStore';
import TerminalPanel from './TerminalPanel';

const LINE_DURATION_SECONDS = 0.4;
const REDUCED_MOTION_DURATION_SECONDS = 0.001;

export default function TerminalOverlay() {
  const reducedMotion = useUIStore((state) => state.reducedMotion);
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const [openId, setOpenId] = useState<string | null>(null);
  const openIdRef = useRef<string | null>(null);
  useEffect(() => {
    openIdRef.current = openId;
  }, [openId]);

  const [title, setTitle] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [done, setDone] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const handleTrigger = (payload: AppEvents['terminal:trigger']) => {
      timelineRef.current?.kill();

      if (openIdRef.current === payload.id) {
        setOpenId(null);
        return;
      }

      setOpenId(payload.id);
      setTitle(payload.title);
      setLines(payload.lines);
      setVisibleCount(0);
      setDone(false);

      const stepDuration = reducedMotionRef.current
        ? REDUCED_MOTION_DURATION_SECONDS
        : LINE_DURATION_SECONDS;

      const timeline = gsap.timeline({
        onComplete: () => setDone(true),
      });
      timelineRef.current = timeline;

      payload.lines.forEach((_, index) => {
        timeline.call(() => setVisibleCount(index + 1));
        timeline.to({}, { duration: stepDuration });
      });
    };

    eventBus.on('terminal:trigger', handleTrigger);
    return () => {
      eventBus.off('terminal:trigger', handleTrigger);
      timelineRef.current?.kill();
    };
  }, []);

  if (!openId) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-30">
      <TerminalPanel
        title={title}
        visibleLines={lines.slice(0, visibleCount)}
        done={done}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
```

Note: `openIdRef` (kept in sync via its own effect) rather than reading
`openId` directly inside `handleTrigger` is what lets `handleTrigger` stay
registered once with `[]` deps instead of re-subscribing to `EventBus` on
every open/close — the same ref-sync-via-effect pattern
`RoomTransition.tsx` uses for `reducedMotionRef`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. If `react-hooks/set-state-in-effect` flags the
`setVisibleCount`/`setDone` calls inside the GSAP `.call()`/`onComplete`
callbacks, this is the same pattern `BootSequence.tsx` and
`RoomTransition.tsx` already use without a suppression — check those files'
actual current lint status before adding one here.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/TerminalOverlay.tsx
git commit -m "Add GSAP-driven TerminalOverlay reveal orchestrator"
```

---

### Task 6: Wire `TerminalOverlay` into `AppRoot`

**Files:**
- Modify: `src/components/AppRoot.tsx`

**Interfaces:**
- Consumes: default-exported `TerminalOverlay` (Task 5).
- Produces: no change to `AppRoot`'s own external interface.

No unit test — `AppRoot` mounts the live Canvas/HUD tree, manually verified
in Task 10.

- [ ] **Step 1: Read the current file**

Read `src/components/AppRoot.tsx` in full before editing — confirm it still
matches the structure from Phase 4's `RoomTransition` wiring (if it has
diverged, adapt this step to preserve any changes found).

- [ ] **Step 2: Add `TerminalOverlay` alongside the existing overlays**

Add the import:
```ts
import TerminalOverlay from '@/components/canvas/TerminalOverlay';
```

Change the final returned fragment from:
```tsx
  return (
    <>
      <Experience onContextLost={() => setContextLost(true)} />
      <Hud />
      <RoomTransition />
    </>
  );
```
to:
```tsx
  return (
    <>
      <Experience onContextLost={() => setContextLost(true)} />
      <Hud />
      <RoomTransition />
      <TerminalOverlay />
    </>
  );
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppRoot.tsx
git commit -m "Wire TerminalOverlay into AppRoot"
```

---

### Task 7: Bespoke `LoadBalancerRoom`

**Files:**
- Create: `src/scenes/world/LoadBalancerRoom.tsx`
- Delete: `src/scenes/world/PlaceholderRoom.tsx`
- Modify: `src/engine/managers/SceneManager.tsx`

**Interfaces:**
- Consumes: default-exported `RoomShell` (Task 2), default-exported
  `Terminal` (Task 4).
- Produces: default-exported `LoadBalancerRoom()`. Registered under
  `'load-balancer'` in `SceneManager`'s `ROOM_LOADERS`, replacing the
  `PlaceholderRoom` entry.

No unit test — R3F component, manually verified in Task 10.

- [ ] **Step 1: Create `LoadBalancerRoom.tsx`**

Create `src/scenes/world/LoadBalancerRoom.tsx`:
```tsx
import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import RoomShell from './shared/RoomShell';
import Terminal from './shared/Terminal';

const LOAD_BALANCER_LINES = [
  'cat lb-notes.md',
  '',
  "Every request starts here. The load balancer's only job is deciding",
  'which backend instance handles it — get this wrong and one server',
  'melts down while three others sit idle.',
  '',
  'Round robin is the simple default: rotate through instances in order.',
  'Fine when every instance is equally warm and every request costs',
  'about the same.',
  '',
  'Least-connections tracks in-flight requests per instance and routes',
  'to whichever is least busy right now — better when request cost',
  'varies.',
  '',
  'Health checks matter more than the algorithm: an instance that\'s "up"',
  "but slow to respond is worse than one that's honestly down. This one",
  'pings each backend on an interval and pulls anything that fails.',
  '',
  "This request — that's you — just got assigned to a healthy instance.",
  'Next stop: the API Gateway.',
];

const RACK_POSITIONS: [number, number, number][] = [
  [-2.5, 1, -3.5],
  [0, 1, -4],
  [2.5, 1, -3.5],
];

export default function LoadBalancerRoom() {
  return (
    <RoomShell roomId="load-balancer" showLabel={false}>
      {RACK_POSITIONS.map((position, index) => (
        <RigidBody key={index} type="fixed" colliders="cuboid" position={position}>
          <mesh castShadow>
            <boxGeometry args={[1.2, 3, 2.4]} />
            <meshStandardMaterial color={colors.rackFrame} metalness={0.4} roughness={0.6} />
          </mesh>
        </RigidBody>
      ))}
      <Terminal
        id="load-balancer-term"
        title="lb-notes.md"
        lines={LOAD_BALANCER_LINES}
        position={[0, 1.6, 0]}
      />
    </RoomShell>
  );
}
```

Note on geometry safety: the room's only portal is forward, at local
`z = -8` (`load-balancer` has no back portal — `getIncomingRoomId` returns
`null` for it). The nearest rack face is at `z = -4 - 1.2 = -5.2`, well
clear of the portal's `1.5`-unit trigger radius (which only reaches
`z = -6.5`). The terminal sits at room center (`z = 0`), `8` units from the
portal and `~5` units from the initial world spawn (`[0, EYE_HEIGHT, 5]` in
`Experience.tsx`) — both far outside its own `2`-unit interact radius, so
nothing triggers on load.

- [ ] **Step 2: Delete `PlaceholderRoom.tsx`**

```bash
git rm src/scenes/world/PlaceholderRoom.tsx
```

- [ ] **Step 3: Update `SceneManager`'s loader entry**

In `src/engine/managers/SceneManager.tsx`, change the `'load-balancer'`
entry in `ROOM_LOADERS` from:
```ts
  'load-balancer': () => import('@/scenes/world/PlaceholderRoom'),
```
to:
```ts
  'load-balancer': () => import('@/scenes/world/LoadBalancerRoom'),
```
Leave every other entry in `ROOM_LOADERS` unchanged.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit` (this will catch a stale import path if Step 3 was
missed).
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/world/LoadBalancerRoom.tsx src/engine/managers/SceneManager.tsx
git commit -m "Give load-balancer bespoke content: server racks and lb-notes.md terminal"
```

---

### Task 8: Bespoke `ApiGatewayRoom`

**Files:**
- Modify: `src/scenes/world/ApiGatewayRoom.tsx`

**Interfaces:**
- Consumes: default-exported `RoomShell` (Task 2), default-exported
  `Terminal` (Task 4).
- Produces: default-exported `ApiGatewayRoom()` — unchanged export shape,
  only its internal content changes from a `RoomTemplate` call to bespoke
  geometry.

No unit test — R3F component, manually verified in Task 10.

- [ ] **Step 1: Replace `ApiGatewayRoom.tsx`**

Replace the full contents of `src/scenes/world/ApiGatewayRoom.tsx`:
```tsx
import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import RoomShell from './shared/RoomShell';
import Terminal from './shared/Terminal';

const API_GATEWAY_LINES = [
  'cat gateway-notes.md',
  '',
  'Past the load balancer, every request funnels through one gateway',
  'before it touches anything real. Three jobs happen here.',
  '',
  'Routing: match the request path to the right internal service.',
  'Nobody calling this API needs to know there are a dozen',
  'microservices behind it.',
  '',
  'Rate limiting: cap how many requests a client can make per window.',
  "Not punishment — it's what keeps one noisy client from taking the",
  'whole system down for everyone else.',
  '',
  'Auth is checked next, but not solved here — this gateway just',
  'forwards the request onward with its credentials attached.',
  "Verifying them is somebody else's job.",
  '',
  'Next stop: Authentication.',
];

const PILLAR_POSITIONS: [number, number, number][] = [
  [-2.5, 1.5, 0],
  [2.5, 1.5, 0],
];

export default function ApiGatewayRoom() {
  return (
    <RoomShell roomId="api-gateway" showLabel={false}>
      {PILLAR_POSITIONS.map((position, index) => (
        <RigidBody key={index} type="fixed" colliders="cuboid" position={position}>
          <mesh castShadow>
            <boxGeometry args={[0.6, 3, 0.6]} />
            <meshStandardMaterial color={colors.rackFrame} metalness={0.5} roughness={0.5} />
          </mesh>
        </RigidBody>
      ))}
      <Terminal
        id="api-gateway-term"
        title="gateway-notes.md"
        lines={API_GATEWAY_LINES}
        position={[0, 1.6, 0]}
      />
    </RoomShell>
  );
}
```

Note on geometry safety: `api-gateway` has a back portal (from
`load-balancer`) at local `z = +8` and a forward portal (to
`auth-service`) at local `z = -8`. The pillars flank the terminal at
`x = ±2.5, z = 0` — an archway the player walks straight through along the
`z` axis, not blocking either portal approach. The terminal at room center
is `8` units from both portals and `6` units from both spawn points
(`z = +6` entering from the back portal, `z = -6` entering from the
forward portal), both well outside its `2`-unit interact radius.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/world/ApiGatewayRoom.tsx
git commit -m "Give api-gateway bespoke content: archway pillars and gateway-notes.md terminal"
```

---

### Task 9: Bespoke `AuthServiceRoom`

**Files:**
- Modify: `src/scenes/world/AuthServiceRoom.tsx`

**Interfaces:**
- Consumes: default-exported `RoomShell` (Task 2), default-exported
  `Terminal` (Task 4).
- Produces: default-exported `AuthServiceRoom()` — unchanged export shape.

No unit test — R3F component, manually verified in Task 10.

- [ ] **Step 1: Replace `AuthServiceRoom.tsx`**

Replace the full contents of `src/scenes/world/AuthServiceRoom.tsx`:
```tsx
import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import RoomShell from './shared/RoomShell';
import Terminal from './shared/Terminal';

const AUTH_SERVICE_LINES = [
  'cat auth-notes.md',
  '',
  'This is where "who are you" gets answered before "what are you',
  'allowed to do" even gets asked.',
  '',
  'Authentication confirms identity — a valid token, a signed session,',
  'a password that matched. Authorization is a separate question: now',
  'that we know who you are, what are you allowed to touch? Conflating',
  'the two is a classic security bug.',
  '',
  'A JWT is just a signed claim: "this user is who they say they are,',
  'as of this timestamp, according to someone we trust." No database',
  'round-trip needed to verify it — just check the signature.',
  '',
  'Once this request is authenticated, it\'s allowed past the gate and',
  'into the parts of the system that actually do the work.',
];

const PANEL_POSITIONS: { position: [number, number, number]; rotationY: number }[] = [
  { position: [-2.2, 1.5, -2.2], rotationY: Math.PI / 6 },
  { position: [2.2, 1.5, -2.2], rotationY: -Math.PI / 6 },
];

export default function AuthServiceRoom() {
  return (
    <RoomShell roomId="auth-service" showLabel={false}>
      {PANEL_POSITIONS.map(({ position, rotationY }, index) => (
        <RigidBody key={index} type="fixed" colliders="cuboid" position={position} rotation={[0, rotationY, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.2, 3, 2]} />
            <meshStandardMaterial color={colors.backgroundElevated} metalness={0.6} roughness={0.3} />
          </mesh>
        </RigidBody>
      ))}
      <Terminal
        id="auth-service-term"
        title="auth-notes.md"
        lines={AUTH_SERVICE_LINES}
        position={[0, 1.6, 0]}
      />
    </RoomShell>
  );
}
```

Note on geometry safety: `auth-service` has a back portal (from
`api-gateway`) at `z = +8` and a forward portal (to `about-me`) at
`z = -8`. The two angled panels sit at `x = ±2.2, z = -2.2` — distance from
room center `√(2.2² + 2.2²) ≈ 3.1` units, clear of the terminal's `2`-unit
radius — suggesting open vault-checkpoint doors without blocking the direct
path between either portal and the terminal at room center.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/world/AuthServiceRoom.tsx
git commit -m "Give auth-service bespoke content: vault-checkpoint panels and auth-notes.md terminal"
```

---

### Task 10: Full verification pass

**Files:** none created; this task only runs and observes.

- [ ] **Step 1: Run the full automated check suite**

Run: `npm run test`
Expected: every test file created/extended across Tasks 1-3 passes, plus
all existing tests from Phases 1-4, with no regressions.

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: production build succeeds (exercises every dynamic `import()`
path, including the changed `load-balancer` entry from Task 7).

- [ ] **Step 2: Manual browser walkthrough**

Start the dev server and open it in the browser preview. Walk through:
1. Skip or complete the boot sequence; confirm `load-balancer` now shows
   three server racks instead of the old single-rack placeholder.
2. Walk up to the `lb-notes.md` terminal at room center; confirm the
   "[E] Interact" prompt appears only within ~2 units, and disappears when
   you back away.
3. Press E; confirm the bottom-left panel reveals the terminal's lines one
   at a time with a blinking cursor, and the cursor disappears once all
   lines are shown.
4. Press E again on the same terminal; confirm the panel closes.
5. Cross the forward portal into `api-gateway`; confirm the archway
   pillars render and the room's `gateway-notes.md` terminal works the
   same way. Confirm walking back through the back portal into
   `load-balancer` still works (Phase 4's traversal is unaffected).
6. Continue into `auth-service`; confirm the vault-panel geometry and
   `auth-notes.md` terminal both work, and that portal traversal onward
   into the still-generic `about-me` room still functions.
7. Open browser devtools; confirm no console errors throughout.
8. Resize to check the terminal panel and "[E] Interact" prompt aren't
   grossly misplaced at a narrower viewport (no specific breakpoint
   requirement — just confirm nothing is unreadable or fully off-screen).

Note any visual, physics, or geometry issues (a panel blocking a walking
path, a terminal triggering from too far away, a rack poking through the
floor) and fix them before proceeding — this is the step most likely to
surface issues static checks can't catch, per this project's established
manual-verification convention.

- [ ] **Step 3: Confirm no uncommitted changes remain**

Run: `git status`
Expected: clean working tree (everything from Steps 1-2 was either already
committed in earlier tasks, or Step 2's fixes have been committed here).

If Step 2 required fixes, commit them:
```bash
git add -A
git commit -m "Fix issues found during Phase 5 manual verification"
```
