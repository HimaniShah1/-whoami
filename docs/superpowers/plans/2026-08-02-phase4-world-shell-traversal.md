# Phase 4: World Shell & Traversal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing 11-room `ROOM_REGISTRY` chain walkable — the visitor crosses a portal by walking through it, arrives in the next (or previous) room via a fade transition, and the HUD's `ttl`/`latencyMs` react to each hop.

**Architecture:** A pure `isWithinRadius` check feeds a `useProximity` R3F hook, consumed by a shared `Portal` component that emits an `EventBus` event on crossing. A GSAP-driven `RoomTransition` overlay (matching the Phase 3 boot-sequence pattern) listens for that event, fades out, swaps `SceneManager`'s active room via `useGameStore.enterRoom`, resets the camera via a second `EventBus` event, and fades back in. All 11 rooms get a registered `SceneManager` loader — `load-balancer` keeps its existing bespoke component plus a new forward `Portal`; the other 10 are thin per-room wrapper files around one shared `RoomTemplate`.

**Tech Stack:** React Three Fiber, `@react-three/rapier`, GSAP (already installed), Zustand (`useGameStore`, `useUIStore`), `mitt`-based `EventBus`, Vitest.

## Global Constraints

- TypeScript strict mode; `@typescript-eslint/no-explicit-any` is an error. Use `unknown` + narrowing instead of `any`.
- Components: PascalCase, default export, no exceptions. Hooks/utils: camelCase, named exports only.
- Zustand state selected via individual field selectors, never object-literal selectors.
- Tailwind color classes come from the existing theme tokens in `src/app/globals.css`'s `@theme` block (`bg-background`, `text-primary-muted`, `text-status-error`, etc.) — do not hardcode hex values in DOM/CSS. Three.js material colors import from `src/engine/constants/design-tokens.ts`'s `colors` object — do not hardcode hex values there either.
- This project requires Node >= 22 (`.nvmrc` pins `22.22.3`); every Bash command invoking `npm`/`npx`/`node` must chain the nvm switch in the same command: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && <command>` — shell state does not persist between separate tool calls.
- This codebase has hit real, newer React-Compiler-aware ESLint rules (`react-hooks/set-state-in-effect`, `react-hooks/immutability`, `react-hooks/exhaustive-deps`, `react-hooks/static-components`) in every phase so far. If `npm run lint` flags a new error on code that matches an existing pattern in the file being edited, add a scoped `eslint-disable-next-line <rule>` with a one-line justification, matching the file's existing precedent — do not restructure working logic to satisfy an overly aggressive static-analysis rule.
- Pure functions and presentational/state-only units get unit tests. GSAP-timeline-driven and `useFrame`/`useThree`-dependent components are manually verified only, matching the established convention (`CameraManager.tsx`, `BootSequence.tsx`) — do not attempt to unit-test them.
- Every task ends with `npx tsc --noEmit` passing and, where applicable, `npm run test` passing, before committing.

---

### Task 1: Add `portal:trigger` and `camera:reset` events to EventBus

**Files:**
- Modify: `src/engine/managers/EventBus.ts`

**Interfaces:**
- Produces: `AppEvents['portal:trigger']: { targetRoomId: RoomId; spawnPosition: [number, number, number]; spawnFacingYaw: number }` and `AppEvents['camera:reset']: { position: [number, number, number]; facingYaw: number }`. Consumed by Task 6 (`Portal.tsx`, emits `portal:trigger`), Task 7 (`RoomTransition.tsx`, listens `portal:trigger`, emits `camera:reset`), Task 8 (`CameraManager.tsx`, listens `camera:reset`).

No new test — `EventBus.test.ts` already proves `mitt`'s generic dispatch works for arbitrary event names/payloads (via `room:entered` and `terminal:command`); TypeScript enforces the new payload shapes at compile time, so a third redundant delivery test wouldn't add real coverage.

- [ ] **Step 1: Add the two event types**

Modify `src/engine/managers/EventBus.ts` — replace the full file:
```ts
import mitt from 'mitt';
import type { RoomId } from '@/types/rooms';

export type AppEvents = {
  'room:entered': { roomId: RoomId };
  'room:unlocked': { roomId: RoomId };
  'terminal:command': { command: string };
  'packet:delivered': { fromRoomId: RoomId; toRoomId: RoomId };
  'portal:trigger': {
    targetRoomId: RoomId;
    spawnPosition: [number, number, number];
    spawnFacingYaw: number;
  };
  'camera:reset': { position: [number, number, number]; facingYaw: number };
};

export const eventBus = mitt<AppEvents>();
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
git commit -m "Add portal:trigger and camera:reset events to EventBus"
```

---

### Task 2: `getIncomingRoomId` helper on the room registry

**Files:**
- Modify: `src/engine/constants/rooms.ts`
- Modify: `src/engine/constants/rooms.test.ts`

**Interfaces:**
- Produces: `getIncomingRoomId(id: RoomId): RoomId | null`. Consumed by Task 9 (`RoomTemplate.tsx`) to find which room's forward connection points at a given room, i.e. where its "back" portal should lead.

- [ ] **Step 1: Write the failing tests**

Add to the end of `src/engine/constants/rooms.test.ts`:
```ts
describe('getIncomingRoomId', () => {
  it('returns the room whose connections point at the given room', () => {
    expect(getIncomingRoomId('api-gateway')).toBe('load-balancer');
    expect(getIncomingRoomId('contact-gateway')).toBe('deployment-pipeline');
  });

  it('returns null for a room nothing connects to', () => {
    expect(getIncomingRoomId('load-balancer')).toBeNull();
  });
});
```

Update the import at the top of `src/engine/constants/rooms.test.ts`:
```ts
import { getIncomingRoomId, getRoomById, isRoomUnlocked, ROOM_REGISTRY } from './rooms';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/engine/constants/rooms.test.ts`
Expected: FAIL — `getIncomingRoomId is not a function` (or TS error if run through `tsc` first; the test runner will still report the failure).

- [ ] **Step 3: Implement `getIncomingRoomId`**

Add to the end of `src/engine/constants/rooms.ts`:
```ts
export function getIncomingRoomId(id: RoomId): RoomId | null {
  const entries = Object.values(ROOM_REGISTRY) as RoomDefinition[];
  const source = entries.find((room) => room.connections.some((connection) => connection.roomId === id));
  return source ? source.id : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/engine/constants/rooms.test.ts`
Expected: PASS (all tests in the file, including the 2 new ones).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add src/engine/constants/rooms.ts src/engine/constants/rooms.test.ts
git commit -m "Add getIncomingRoomId to derive back-portal targets"
```

---

### Task 3: Dynamic ttl/latency on room entry

**Files:**
- Modify: `src/engine/state/useGameStore.ts`
- Modify: `src/engine/state/useGameStore.test.ts`

**Interfaces:**
- Produces: `setLatency(ms: number): void` added to the `GameState` interface. `enterRoom` now also decrements `ttl` (floored at 0) and randomizes `latencyMs` on every successful entry. Consumed by Task 7 (`RoomTransition.tsx`, calls `setLatency` in its settle-down tween).

- [ ] **Step 1: Write the failing tests**

Add to `src/engine/state/useGameStore.test.ts`, inside the existing `describe('useGameStore', ...)` block (after the `isUnlocked` test, before `collectEasterEgg`):
```ts
  it('decrements ttl by 1 on a successful entry', () => {
    const ttlBefore = useGameStore.getState().ttl;
    useGameStore.getState().enterRoom('api-gateway');
    expect(useGameStore.getState().ttl).toBe(ttlBefore - 1);
  });

  it('does not change ttl or latencyMs on a refused (locked) entry', () => {
    const before = useGameStore.getState();
    useGameStore.getState().enterRoom('auth-service');
    const after = useGameStore.getState();
    expect(after.ttl).toBe(before.ttl);
    expect(after.latencyMs).toBe(before.latencyMs);
  });

  it('floors ttl at 0 instead of going negative', () => {
    useGameStore.setState({ ttl: 0 });
    useGameStore.getState().enterRoom('api-gateway');
    expect(useGameStore.getState().ttl).toBe(0);
  });

  it('sets latencyMs to a spiked value within the expected range on entry', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    useGameStore.getState().enterRoom('api-gateway');
    expect(useGameStore.getState().latencyMs).toBe(150);
    randomSpy.mockRestore();
  });

  it('setLatency sets the given value directly', () => {
    useGameStore.getState().setLatency(42);
    expect(useGameStore.getState().latencyMs).toBe(42);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/engine/state/useGameStore.test.ts`
Expected: FAIL — `ttl` unchanged after `enterRoom` (still equals `ttlBefore`), and `setLatency is not a function`.

- [ ] **Step 3: Implement the store changes**

Replace the full contents of `src/engine/state/useGameStore.ts`:
```ts
import { create } from 'zustand';
import type { RoomId } from '@/types/rooms';
import type { RequestProtocol, RequestStatus } from '@/types/game';
import { isRoomUnlocked } from '@/engine/constants/rooms';
import { eventBus } from '@/engine/managers/EventBus';

const TTL_DECREMENT_PER_HOP = 1;
const LATENCY_SPIKE_MIN_MS = 80;
const LATENCY_SPIKE_MAX_MS = 220;

interface GameState {
  requestId: string;
  protocol: RequestProtocol;
  ttl: number;
  latencyMs: number;
  status: RequestStatus;
  currentRoomId: RoomId;
  visitedRooms: Set<RoomId>;
  collectedEasterEggs: Set<string>;
  enterRoom: (roomId: RoomId) => void;
  isUnlocked: (roomId: RoomId) => boolean;
  collectEasterEgg: (id: string) => void;
  setLatency: (ms: number) => void;
}

function generateRequestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`;
}

function randomLatencySpike(): number {
  return Math.round(LATENCY_SPIKE_MIN_MS + Math.random() * (LATENCY_SPIKE_MAX_MS - LATENCY_SPIKE_MIN_MS));
}

export const useGameStore = create<GameState>((set, get) => ({
  requestId: generateRequestId(),
  protocol: 'HTTP/2',
  ttl: 64,
  latencyMs: 0,
  status: 'pending',
  currentRoomId: 'load-balancer',
  visitedRooms: new Set<RoomId>(['load-balancer']),
  collectedEasterEggs: new Set<string>(),
  enterRoom: (roomId) => {
    const { visitedRooms, ttl } = get();
    if (!isRoomUnlocked(roomId, visitedRooms)) return;
    const nextVisited = new Set(visitedRooms);
    const wasUnvisited = !nextVisited.has(roomId);
    nextVisited.add(roomId);
    set({
      currentRoomId: roomId,
      visitedRooms: nextVisited,
      ttl: Math.max(0, ttl - TTL_DECREMENT_PER_HOP),
      latencyMs: randomLatencySpike(),
    });
    eventBus.emit('room:entered', { roomId });
    if (wasUnvisited) {
      eventBus.emit('room:unlocked', { roomId });
    }
  },
  isUnlocked: (roomId) => isRoomUnlocked(roomId, get().visitedRooms),
  collectEasterEgg: (id) =>
    set((state) => ({
      collectedEasterEggs: new Set(state.collectedEasterEggs).add(id),
    })),
  setLatency: (ms) => set({ latencyMs: ms }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/engine/state/useGameStore.test.ts`
Expected: PASS (all tests, including the 5 new ones).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add src/engine/state/useGameStore.ts src/engine/state/useGameStore.test.ts
git commit -m "Make ttl and latencyMs react to room traversal"
```

---

### Task 4: `isWithinRadius` pure proximity check

**Files:**
- Create: `src/lib/proximity.ts`
- Test: `src/lib/proximity.test.ts`

**Interfaces:**
- Produces: `isWithinRadius(a: Point3, b: Point3, radius: number): boolean`, where `Point3 = { x: number; y: number; z: number }` is also exported. Consumed by Task 5 (`useProximity.ts`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/proximity.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { isWithinRadius } from './proximity';

describe('isWithinRadius', () => {
  it('is true when points are closer than the radius', () => {
    expect(isWithinRadius({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 2)).toBe(true);
  });

  it('is false when points are farther than the radius', () => {
    expect(isWithinRadius({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, 2)).toBe(false);
  });

  it('is true exactly at the radius boundary', () => {
    expect(isWithinRadius({ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, 2)).toBe(true);
  });

  it('accounts for all three axes, not just the horizontal plane', () => {
    expect(isWithinRadius({ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: 0 }, 2)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/proximity.test.ts`
Expected: FAIL — `Cannot find module './proximity'`.

- [ ] **Step 3: Implement `proximity.ts`**

Create `src/lib/proximity.ts`:
```ts
export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export function isWithinRadius(a: Point3, b: Point3, radius: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/proximity.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add src/lib/proximity.ts src/lib/proximity.test.ts
git commit -m "Add isWithinRadius pure proximity check"
```

---

### Task 5: `useProximity` R3F hook

**Files:**
- Create: `src/engine/hooks/useProximity.ts`

**Interfaces:**
- Consumes: `isWithinRadius` (Task 4).
- Produces: `useProximity(point: [number, number, number], radius: number): boolean`. Consumed by Task 6 (`Portal.tsx`).

No unit test — depends on `useFrame`/`useThree` from an R3F `Canvas` context, same manually-verified bucket as `CameraManager.tsx` (verified in Task 12).

- [ ] **Step 1: Implement `useProximity.ts`**

Create `src/engine/hooks/useProximity.ts`:
```ts
'use client';

import { useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { isWithinRadius } from '@/lib/proximity';

export function useProximity(point: [number, number, number], radius: number): boolean {
  const { camera } = useThree();
  const [inRange, setInRange] = useState(false);

  useFrame(() => {
    const target = { x: point[0], y: point[1], z: point[2] };
    const next = isWithinRadius(camera.position, target, radius);
    if (next !== inRange) {
      setInRange(next);
    }
  });

  return inRange;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. If `react-hooks/exhaustive-deps` or similar flags the `useFrame` callback reading `inRange`/`point`/`radius` from the enclosing scope, this matches `CameraManager.tsx`'s existing precedent of an unmemoized `useFrame` callback recreated fresh each render — no suppression should be needed, but if one is, follow the Global Constraints guidance.

- [ ] **Step 4: Commit**

```bash
git add src/engine/hooks/useProximity.ts
git commit -m "Add useProximity hook for distance-based triggers"
```

---

### Task 6: `Portal` shared component

**Files:**
- Create: `src/scenes/world/shared/Portal.tsx`

**Interfaces:**
- Consumes: `useProximity` (Task 5), `useGameStore.isUnlocked` (existing), `eventBus`/`AppEvents['portal:trigger']` (Task 1), `EYE_HEIGHT` (`src/engine/constants/player.ts`, existing), `colors` (`src/engine/constants/design-tokens.ts`, existing).
- Produces: default-exported `Portal({ targetRoomId: RoomId; direction: 'forward' | 'back' })`. `SPAWN_TRANSFORM` is an internal (non-exported) lookup used only within this file. Consumed by Task 9 (`RoomTemplate.tsx`) and Task 10 (`PlaceholderRoom.tsx`).

No unit test — R3F component combining `RigidBody`, `useProximity`, and `EventBus` side effects; manually verified only (Task 12), matching `CameraManager.tsx`/`RoomErrorBoundary.tsx`'s bucket for imperative R3F components.

Every generic room shares one standardized local layout so portal placement and spawn points are consistent without per-room authoring: a 20×20 floor centered at local origin, a "back" portal (entry from the previous room) near `z = +8`, and a "forward" portal (exit to the next room) near `z = -8`.

- [ ] **Step 1: Implement `Portal.tsx`**

Create `src/scenes/world/shared/Portal.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { RigidBody } from '@react-three/rapier';
import type { RoomId } from '@/types/rooms';
import { useGameStore } from '@/engine/state/useGameStore';
import { useProximity } from '@/engine/hooks/useProximity';
import { colors } from '@/engine/constants/design-tokens';
import { eventBus } from '@/engine/managers/EventBus';
import { EYE_HEIGHT } from '@/engine/constants/player';

const ROOM_FLOOR_HALF_SIZE = 10;
const PORTAL_Z_OFFSET = 8;
const PORTAL_TRIGGER_RADIUS = 1.5;
const SPAWN_INSET = 2;

type PortalDirection = 'forward' | 'back';

const PORTAL_LOCAL_POSITION: Record<PortalDirection, [number, number, number]> = {
  forward: [0, EYE_HEIGHT, -PORTAL_Z_OFFSET],
  back: [0, EYE_HEIGHT, PORTAL_Z_OFFSET],
};

const SPAWN_TRANSFORM: Record<PortalDirection, { position: [number, number, number]; yaw: number }> = {
  forward: { position: [0, EYE_HEIGHT, ROOM_FLOOR_HALF_SIZE - SPAWN_INSET], yaw: 0 },
  back: { position: [0, EYE_HEIGHT, -(ROOM_FLOOR_HALF_SIZE - SPAWN_INSET)], yaw: Math.PI },
};

interface PortalProps {
  targetRoomId: RoomId;
  direction: PortalDirection;
}

export default function Portal({ targetRoomId, direction }: PortalProps) {
  const unlocked = useGameStore((state) => state.isUnlocked(targetRoomId));
  const position = PORTAL_LOCAL_POSITION[direction];
  const inRange = useProximity(position, PORTAL_TRIGGER_RADIUS);

  useEffect(() => {
    if (!unlocked || !inRange) return;
    const spawn = SPAWN_TRANSFORM[direction];
    eventBus.emit('portal:trigger', {
      targetRoomId,
      spawnPosition: spawn.position,
      spawnFacingYaw: spawn.yaw,
    });
  }, [inRange, unlocked, targetRoomId, direction]);

  const color = unlocked ? colors.primary : colors.statusError;

  return (
    <group position={position}>
      <mesh>
        <torusGeometry args={[1.2, 0.08, 8, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={unlocked ? 0.6 : 0.2}
        />
      </mesh>
      {!unlocked && (
        <RigidBody type="fixed" colliders="cuboid">
          <mesh>
            <boxGeometry args={[2.4, 3, 0.3]} />
            <meshStandardMaterial color={color} transparent opacity={0.35} />
          </mesh>
        </RigidBody>
      )}
    </group>
  );
}
```

Note: this component only emits `portal:trigger`. It does not itself decrement `ttl`, spike `latencyMs`, or call `enterRoom` — that all happens inside `RoomTransition` (Task 7) at the right point in its fade timeline, so the store update and the visual room swap stay in sync.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. If `react-hooks/exhaustive-deps` flags the `useEffect` dependency array, it's already exhaustive (`inRange`, `unlocked`, `targetRoomId`, `direction`) — double check before adding any suppression.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/world/shared/Portal.tsx
git commit -m "Add shared Portal component with locked/unlocked states"
```

---

### Task 7: `RoomTransition` fade orchestrator

**Files:**
- Create: `src/components/canvas/RoomTransition.tsx`

**Interfaces:**
- Consumes: `eventBus`/`AppEvents['portal:trigger']`/`AppEvents['camera:reset']` (Task 1), `useGameStore` (`enterRoom`, `setLatency`, `latencyMs` — Task 3), `useUIStore.reducedMotion` (existing), `getRoomById` (existing), `gsap` (installed).
- Produces: default-exported `RoomTransition()` (no props). Consumed by Task 11 (`AppRoot.tsx`).

No unit test — GSAP-driven imperative timeline component, same bucket as `BootSequence.tsx`; manually verified in Task 12.

- [ ] **Step 1: Implement `RoomTransition.tsx`**

Create `src/components/canvas/RoomTransition.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { RoomId } from '@/types/rooms';
import { eventBus, type AppEvents } from '@/engine/managers/EventBus';
import { useGameStore } from '@/engine/state/useGameStore';
import { useUIStore } from '@/engine/state/useUIStore';
import { getRoomById } from '@/engine/constants/rooms';

const FADE_DURATION_SECONDS = 0.35;
const LATENCY_SETTLE_DURATION_SECONDS = 0.8;
const LATENCY_REST_MS = 24;
const REDUCED_MOTION_DURATION_SECONDS = 0.001;

export default function RoomTransition() {
  const reducedMotion = useUIStore((state) => state.reducedMotion);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const [targetRoomId, setTargetRoomId] = useState<RoomId | null>(null);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const handleTrigger = (payload: AppEvents['portal:trigger']) => {
      const fadeDuration = reducedMotionRef.current
        ? REDUCED_MOTION_DURATION_SECONDS
        : FADE_DURATION_SECONDS;
      const settleDuration = reducedMotionRef.current
        ? REDUCED_MOTION_DURATION_SECONDS
        : LATENCY_SETTLE_DURATION_SECONDS;

      setTargetRoomId(payload.targetRoomId);
      const opacityState = { value: 0 };
      const latencyState = { value: 0 };

      const timeline = gsap.timeline({
        onComplete: () => setTargetRoomId(null),
      });

      timeline.to(opacityState, {
        value: 1,
        duration: fadeDuration,
        onUpdate: () => setOpacity(opacityState.value),
      });
      timeline.call(() => {
        useGameStore.getState().enterRoom(payload.targetRoomId);
        latencyState.value = useGameStore.getState().latencyMs;
        eventBus.emit('camera:reset', {
          position: payload.spawnPosition,
          facingYaw: payload.spawnFacingYaw,
        });
      });
      timeline.to(opacityState, {
        value: 0,
        duration: fadeDuration,
        onUpdate: () => setOpacity(opacityState.value),
      });
      timeline.to(latencyState, {
        value: LATENCY_REST_MS,
        duration: settleDuration,
        onUpdate: () => useGameStore.getState().setLatency(Math.round(latencyState.value)),
      });
    };

    eventBus.on('portal:trigger', handleTrigger);
    return () => eventBus.off('portal:trigger', handleTrigger);
  }, []);

  if (!targetRoomId) return null;
  const room = getRoomById(targetRoomId);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-background font-mono text-sm text-primary-muted"
      style={{ opacity }}
    >
      <div>Routing to {room.name}...</div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. If `react-hooks/set-state-in-effect` flags `setTargetRoomId`/`setOpacity` calls inside the GSAP callbacks (they're called from `.call()`/`.to()`'s `onUpdate`, not as direct effect-body statements — the same pattern `BootSequence.tsx` already uses without a suppression), follow the Global Constraints guidance rather than restructuring.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/RoomTransition.tsx
git commit -m "Add GSAP-driven RoomTransition fade orchestrator"
```

---

### Task 8: `CameraManager` resets on `camera:reset`

**Files:**
- Modify: `src/engine/managers/CameraManager.tsx`

**Interfaces:**
- Consumes: `eventBus`/`AppEvents['camera:reset']` (Task 1).
- Produces: no change to `CameraManager`'s external interface (still default-exported, prop-less).

No unit test — same manually-verified bucket as the rest of this file (verified in Task 12).

- [ ] **Step 1: Add the `camera:reset` subscription**

In `src/engine/managers/CameraManager.tsx`, add the import at the top (alongside the existing imports):
```ts
import { eventBus, type AppEvents } from '@/engine/managers/EventBus';
```

Add a new `useEffect` inside the component body, after the existing `useRef` declarations and before the `useFrame` call:
```tsx
  useEffect(() => {
    const handleReset = ({ position, facingYaw }: AppEvents['camera:reset']) => {
      camera.position.set(position[0], position[1], position[2]);
      camera.rotation.set(0, facingYaw, 0);
      baseY.current = position[1];
      velocity.current.x = 0;
      velocity.current.z = 0;
      verticalVelocity.current = 0;
      isGrounded.current = true;
      distanceTraveled.current = 0;
      bobWeight.current = 0;
    };
    eventBus.on('camera:reset', handleReset);
    return () => eventBus.off('camera:reset', handleReset);
  }, [camera]);
```

Add `useEffect` to the existing `react` import at the top of the file (currently `import { useRef, type ComponentRef } from 'react';`):
```ts
import { useEffect, useRef, type ComponentRef } from 'react';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. If `react-hooks/immutability` flags the `camera.position.set(...)`/`camera.rotation.set(...)` calls, this is the same class of intentional Three.js-object mutation already suppressed elsewhere in this exact file (see the existing comment above the `useFrame` callback) — add a scoped `eslint-disable-next-line react-hooks/immutability` above each flagged line with a comment pointing back to that existing explanation, matching the file's own precedent, rather than inventing new justification text.

- [ ] **Step 4: Commit**

```bash
git add src/engine/managers/CameraManager.tsx
git commit -m "Reset camera position and movement state on camera:reset"
```

---

### Task 9: `RoomTemplate` shared generic room

**Files:**
- Create: `src/scenes/world/shared/RoomTemplate.tsx`

**Interfaces:**
- Consumes: `getRoomById`, `getIncomingRoomId` (Task 2), default-exported `Portal` (Task 6), `colors` (existing).
- Produces: default-exported `RoomTemplate({ roomId: RoomId })`. Consumed by Task 10 (the 10 per-room wrapper files).

No unit test — R3F component; manually verified in Task 12.

- [ ] **Step 1: Implement `RoomTemplate.tsx`**

Create `src/scenes/world/shared/RoomTemplate.tsx`:
```tsx
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import type { RoomId } from '@/types/rooms';
import { getIncomingRoomId, getRoomById } from '@/engine/constants/rooms';
import { colors } from '@/engine/constants/design-tokens';
import Portal from './Portal';

interface RoomTemplateProps {
  roomId: RoomId;
}

export default function RoomTemplate({ roomId }: RoomTemplateProps) {
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

      <Html position={[0, 3, 0]} center>
        <div className="pointer-events-none whitespace-nowrap font-mono text-xs text-primary-muted">
          {room.name.toUpperCase()}
        </div>
      </Html>

      {forwardTargetId && <Portal targetRoomId={forwardTargetId} direction="forward" />}
      {backTargetId && <Portal targetRoomId={backTargetId} direction="back" />}
    </group>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/world/shared/RoomTemplate.tsx
git commit -m "Add shared RoomTemplate for generic placeholder rooms"
```

---

### Task 10: Register all 11 rooms in SceneManager

**Files:**
- Create: `src/scenes/world/ApiGatewayRoom.tsx`
- Create: `src/scenes/world/AuthServiceRoom.tsx`
- Create: `src/scenes/world/AboutMeRoom.tsx`
- Create: `src/scenes/world/ExperienceServiceRoom.tsx`
- Create: `src/scenes/world/ProjectsClusterRoom.tsx`
- Create: `src/scenes/world/SkillsDashboardRoom.tsx`
- Create: `src/scenes/world/DatabaseLayerRoom.tsx`
- Create: `src/scenes/world/MonitoringCenterRoom.tsx`
- Create: `src/scenes/world/DeploymentPipelineRoom.tsx`
- Create: `src/scenes/world/ContactGatewayRoom.tsx`
- Modify: `src/scenes/world/PlaceholderRoom.tsx`
- Modify: `src/engine/managers/SceneManager.tsx`

**Interfaces:**
- Consumes: default-exported `RoomTemplate` (Task 9), default-exported `Portal` (Task 6).
- Produces: one default-exported, prop-less room component per file, each registered under its `RoomId` in `SceneManager`'s `ROOM_LOADERS`.

No unit test — thin R3F wrapper components and a registry map; manually verified in Task 12 (this is exactly what `RoomErrorBoundary`'s existing test coverage and the manual browser walkthrough are for).

- [ ] **Step 1: Create the 10 per-room wrapper files**

Each file follows the same shape — only the room id string changes. Create all 10:

`src/scenes/world/ApiGatewayRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function ApiGatewayRoom() {
  return <RoomTemplate roomId="api-gateway" />;
}
```

`src/scenes/world/AuthServiceRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function AuthServiceRoom() {
  return <RoomTemplate roomId="auth-service" />;
}
```

`src/scenes/world/AboutMeRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function AboutMeRoom() {
  return <RoomTemplate roomId="about-me" />;
}
```

`src/scenes/world/ExperienceServiceRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function ExperienceServiceRoom() {
  return <RoomTemplate roomId="experience-service" />;
}
```

`src/scenes/world/ProjectsClusterRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function ProjectsClusterRoom() {
  return <RoomTemplate roomId="projects-cluster" />;
}
```

`src/scenes/world/SkillsDashboardRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function SkillsDashboardRoom() {
  return <RoomTemplate roomId="skills-dashboard" />;
}
```

`src/scenes/world/DatabaseLayerRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function DatabaseLayerRoom() {
  return <RoomTemplate roomId="database-layer" />;
}
```

`src/scenes/world/MonitoringCenterRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function MonitoringCenterRoom() {
  return <RoomTemplate roomId="monitoring-center" />;
}
```

`src/scenes/world/DeploymentPipelineRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function DeploymentPipelineRoom() {
  return <RoomTemplate roomId="deployment-pipeline" />;
}
```

`src/scenes/world/ContactGatewayRoom.tsx`:
```tsx
import RoomTemplate from './shared/RoomTemplate';

export default function ContactGatewayRoom() {
  return <RoomTemplate roomId="contact-gateway" />;
}
```

- [ ] **Step 2: Add a forward portal to the existing `PlaceholderRoom`**

Replace the full contents of `src/scenes/world/PlaceholderRoom.tsx`:
```tsx
import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import Portal from './shared/Portal';

export default function PlaceholderRoom() {
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

      <RigidBody type="fixed" colliders="cuboid" position={[0, 1, -5]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 3, 2.4]} />
          <meshStandardMaterial color={colors.rackFrame} metalness={0.4} roughness={0.6} />
        </mesh>
      </RigidBody>

      <Portal targetRoomId="api-gateway" direction="forward" />
    </group>
  );
}
```

- [ ] **Step 3: Register every room in `SceneManager`**

Replace the full contents of `src/engine/managers/SceneManager.tsx`:
```tsx
'use client';

import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react';
import type { RoomId } from '@/types/rooms';
import RoomErrorBoundary from './RoomErrorBoundary';

const ROOM_LOADERS: Record<RoomId, () => Promise<{ default: ComponentType }>> = {
  'load-balancer': () => import('@/scenes/world/PlaceholderRoom'),
  'api-gateway': () => import('@/scenes/world/ApiGatewayRoom'),
  'auth-service': () => import('@/scenes/world/AuthServiceRoom'),
  'about-me': () => import('@/scenes/world/AboutMeRoom'),
  'experience-service': () => import('@/scenes/world/ExperienceServiceRoom'),
  'projects-cluster': () => import('@/scenes/world/ProjectsClusterRoom'),
  'skills-dashboard': () => import('@/scenes/world/SkillsDashboardRoom'),
  'database-layer': () => import('@/scenes/world/DatabaseLayerRoom'),
  'monitoring-center': () => import('@/scenes/world/MonitoringCenterRoom'),
  'deployment-pipeline': () => import('@/scenes/world/DeploymentPipelineRoom'),
  'contact-gateway': () => import('@/scenes/world/ContactGatewayRoom'),
};

interface SceneManagerProps {
  activeRoomId: RoomId;
}

export default function SceneManager({ activeRoomId }: SceneManagerProps) {
  const [retryCount, setRetryCount] = useState(0);

  // Recreated only when the active room or retryCount changes, never on every
  // render: React.lazy caches its dynamic import() promise forever on a given
  // lazy component instance, so recovering from a failed chunk load requires a
  // fresh lazy() call (and therefore a fresh import() promise), not just
  // resetting the error boundary's local state. retryCount is intentionally
  // in the dependency list purely to force recomputation on retry even though
  // it isn't read inside the factory itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const RoomComponent = useMemo(() => lazy(ROOM_LOADERS[activeRoomId]), [activeRoomId, retryCount]);

  return (
    <Suspense fallback={null}>
      <RoomErrorBoundary
        key={`${activeRoomId}:${retryCount}`}
        onRetry={() => setRetryCount((count) => count + 1)}
      >
        {/* eslint-disable-next-line react-hooks/static-components -- intentional:
            a fresh lazy() component is created on retry so a stale cached
            import() rejection isn't replayed; see the useMemo comment above. */}
        <RoomComponent />
      </RoomErrorBoundary>
    </Suspense>
  );
}
```

Note: `ROOM_LOADERS` is now a full `Record<RoomId, ...>` instead of `Partial<Record<RoomId, ...>>`, since every room has a loader — this removes the need for the old `if (!loader) return null;`/`if (!RoomComponent) return null;` guards, which are now unreachable dead code under the stricter type.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/world/ApiGatewayRoom.tsx src/scenes/world/AuthServiceRoom.tsx \
  src/scenes/world/AboutMeRoom.tsx src/scenes/world/ExperienceServiceRoom.tsx \
  src/scenes/world/ProjectsClusterRoom.tsx src/scenes/world/SkillsDashboardRoom.tsx \
  src/scenes/world/DatabaseLayerRoom.tsx src/scenes/world/MonitoringCenterRoom.tsx \
  src/scenes/world/DeploymentPipelineRoom.tsx src/scenes/world/ContactGatewayRoom.tsx \
  src/scenes/world/PlaceholderRoom.tsx src/engine/managers/SceneManager.tsx
git commit -m "Register all 11 rooms with generic placeholder geometry and portals"
```

---

### Task 11: Wire `RoomTransition` into `AppRoot`

**Files:**
- Modify: `src/components/AppRoot.tsx`

**Interfaces:**
- Consumes: default-exported `RoomTransition` (Task 7).
- Produces: no change to `AppRoot`'s own external interface.

No unit test — `AppRoot` mounts the live boot/Canvas/HUD tree, verified manually in Task 12, matching the established convention.

- [ ] **Step 1: Read the current file**

Read `src/components/AppRoot.tsx` in full before editing — confirm it still matches the structure from the Phase 3 wiring (if it has diverged, adapt this step's replacement to preserve any changes found rather than blindly overwriting).

- [ ] **Step 2: Add `RoomTransition` alongside `Experience`/`Hud`**

In `src/components/AppRoot.tsx`, add the import:
```ts
import RoomTransition from '@/components/canvas/RoomTransition';
```

Change the final returned fragment from:
```tsx
  return (
    <>
      <Experience onContextLost={() => setContextLost(true)} />
      <Hud />
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
    </>
  );
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppRoot.tsx
git commit -m "Wire RoomTransition into AppRoot"
```

---

### Task 12: Full verification pass

**Files:** none created; this task only runs and observes.

- [ ] **Step 1: Run the full automated check suite**

Run: `npm run test`
Expected: every test file created/extended across Tasks 1-3 passes (`EventBus.test.ts`, `rooms.test.ts`, `useGameStore.test.ts`, `proximity.test.ts`), plus all existing tests from Phases 1-3, with no regressions.

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: production build succeeds (this exercises every dynamic `import()` path added in Task 10, catching typos in the `ROOM_LOADERS` map or wrapper file paths that `tsc`/`vitest` alone wouldn't).

- [ ] **Step 2: Manual browser walkthrough**

Start the dev server and open it in the browser preview. Walk through:
1. Skip or complete the boot sequence; confirm `Experience`/`Hud` mount into `load-balancer` as before.
2. Walk forward toward the new portal in `load-balancer`; confirm the `RoomTransition` overlay fades in with "Routing to API Gateway...", the room swaps, and the camera lands facing into `api-gateway` at its back-portal spawn point.
3. Confirm the HUD's `TTL` value decreased by 1 and `LATENCY` visibly spikes then eases down to its resting value after the fade completes.
4. Walk to `api-gateway`'s back portal; confirm walking through it returns to `load-balancer`, spawning near its forward portal facing back toward the entrance.
5. Continue forward through 2-3 more rooms in the chain (e.g. into `auth-service`, `about-me`) to confirm the standardized `RoomTemplate` layout, name label, and portals render correctly for generic rooms, not just the bespoke `load-balancer`.
6. Open browser devtools and confirm no console errors during any transition.

Note any visual or physics issues (portal clipping into the floor, spawn point facing the wrong way, collider gaps) and fix them before proceeding — this is the step most likely to surface issues that type-checking and unit tests can't catch, per this project's established manual-verification convention for R3F/GSAP work.

- [ ] **Step 3: Confirm no uncommitted changes remain**

Run: `git status`
Expected: clean working tree (everything from Steps 1-2 was either already committed in earlier tasks, or Step 2's fixes have been committed here).

If Step 2 required fixes, commit them:
```bash
git add -A
git commit -m "Fix issues found during Phase 4 manual verification"
```
