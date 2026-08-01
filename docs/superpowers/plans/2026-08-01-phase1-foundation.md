# Phase 1: Foundation & Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the architectural skeleton of "Backend Odyssey" — a Next.js + React Three Fiber app with a working first-person pointer-lock camera inside one placeholder-lit room, the core manager/store abstractions wired end-to-end (including graceful degradation for missing WebGL and lost rendering contexts), and `SKILLS.md` v1 committed as the project handbook.

**Architecture:** A Next.js App Router shell renders a single client component (`AppRoot`) that detects WebGL support and reduced-motion preference, then mounts an R3F `Canvas` (`Experience`) wrapping a physics provider, a first-person camera/movement controller, and a `SceneManager` that lazily loads the active room from a static room registry, wrapping each room in an error boundary. Two Zustand stores (`useGameStore` for world/progress state, `useUIStore` for UI-only state) plus a `mitt` event bus (`EventBus`) decouple cross-cutting concerns. A minimal HUD overlay reads directly from `useGameStore`. An `AudioManager` singleton is scaffolded now with a real but currently-empty sound registry, ready for Phase 14.

**Tech Stack:** Next.js (App Router) + TypeScript (strict), React Three Fiber + Three.js + @react-three/drei + @react-three/rapier, Zustand, mitt, Howler.js, Tailwind CSS, Vitest + @testing-library/react + jsdom.

## Global Constraints

- TypeScript strict mode; no `any` anywhere (enforced via `@typescript-eslint/no-explicit-any: error`).
- Typography is monospace everywhere in UI/HUD/terminal surfaces (no decorative sans-serif).
- Color tokens: background `#0a0e14`, elevated `#12161f`, primary `#4fd1ff`, primary-muted `#e6f7ff`, status healthy `#3ddc84`, warning `#ffb454`, error `#ff5f56`, fog matches background.
- Camera is first-person via drei `PointerLockControls`; no third-person avatar.
- Components: PascalCase, default export, no exceptions. Hooks/utils: camelCase, named exports only, hooks prefixed `use`. Files: kebab-case except component files, which match their PascalCase component name.
- R3F/Three.js rendering is verified manually in a running browser, not unit-tested; pure logic (stores, EventBus, room registry, hooks with DOM-only side effects, WebGL/reduced-motion detection, presentational non-3D components, error-boundary static logic) is unit-tested with Vitest.
- Only install dependencies a phase actually uses (YAGNI). `shadcn/ui`, `framer-motion`, `gsap`, `react-hook-form`, `zod`, `lucide-react` are deferred to the phases that first need them (Phase 12 for the contact form, etc.) and are **not** installed in this phase.
- Every task ends with `npx tsc --noEmit` passing and, where applicable, `npm run test` passing, before committing.

---

### Task 1: Project scaffold, tooling, and `cn` utility

**Files:**
- Create: entire Next.js scaffold via `create-next-app` (package.json, tsconfig.json, next.config.ts, tailwind config, app/layout.tsx, app/page.tsx, app/globals.css, eslint config)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.prettierrc`
- Create: `src/lib/utils.ts`
- Test: `src/lib/utils.test.ts`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` — used by every later component that needs conditional Tailwind classes.

- [ ] **Step 1: Scaffold the Next.js app**

Run:
```bash
npx --yes create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
Expected: command completes, `package.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `tsconfig.json` exist. `docs/` and `.git/` are left untouched (both are in create-next-app's safe-to-ignore list for non-empty directories).

- [ ] **Step 2: Verify strict TypeScript is on**

Open `tsconfig.json` and confirm `"strict": true` is set under `compilerOptions` (create-next-app sets this by default). Add `"noUncheckedIndexedAccess": true` to the same block.

- [ ] **Step 3: Install runtime and dev dependencies**

Run:
```bash
npm install three @react-three/fiber @react-three/drei @react-three/rapier zustand mitt howler clsx tailwind-merge
npm install -D @types/three @types/howler vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react prettier eslint-config-prettier
```
Expected: both commands exit 0, `package.json` `dependencies`/`devDependencies` updated.

- [ ] **Step 4: Enforce no-`any` in ESLint**

Edit `eslint.config.mjs` (or `.eslintrc.json`, whichever `create-next-app` generated) to add a rule entry:
```js
rules: {
  '@typescript-eslint/no-explicit-any': 'error',
}
```
(Add this inside the existing config object/array in whatever format the generated file uses — flat config array or legacy `.eslintrc.json` `rules` key.)

- [ ] **Step 5: Add Prettier config**

Create `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 90
}
```

- [ ] **Step 6: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Add npm scripts**

Edit `package.json` `scripts` to add:
```json
"test": "vitest run",
"test:watch": "vitest",
"format": "prettier --write ."
```

- [ ] **Step 8: Write the failing test for `cn`**

Create `src/lib/utils.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins truthy class values and drops falsy ones', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('lets later Tailwind classes win over conflicting earlier ones', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npm run test -- src/lib/utils.test.ts`
Expected: FAIL — `Cannot find module './utils'` or similar (file doesn't exist yet).

- [ ] **Step 10: Implement `cn`**

Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npm run test -- src/lib/utils.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 12: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add -A
git commit -m "Scaffold Next.js app with strict TS, Vitest, and cn utility"
```

---

### Task 2: Types, design tokens, and room registry

**Files:**
- Create: `src/types/rooms.ts`
- Create: `src/types/game.ts`
- Create: `src/engine/constants/design-tokens.ts`
- Create: `src/engine/constants/rooms.ts`
- Test: `src/engine/constants/rooms.test.ts`

**Interfaces:**
- Consumes: nothing (foundational types).
- Produces: `RoomId`, `RoomDefinition`, `RoomConnection` types; `RequestStatus`, `RequestProtocol`, `RequestIdentity` types; `colors`, `fonts` token objects; `ROOM_REGISTRY: Record<RoomId, RoomDefinition>`, `getRoomById(id: RoomId): RoomDefinition`, `isRoomUnlocked(id: RoomId, visited: ReadonlySet<RoomId>): boolean`. All consumed by Task 4 (stores), Task 10 (`SceneManager`), Task 12 (`Hud`).

- [ ] **Step 1: Create room and game types**

Create `src/types/rooms.ts`:
```ts
export type RoomId =
  | 'load-balancer'
  | 'api-gateway'
  | 'auth-service'
  | 'about-me'
  | 'experience-service'
  | 'projects-cluster'
  | 'skills-dashboard'
  | 'database-layer'
  | 'monitoring-center'
  | 'deployment-pipeline'
  | 'contact-gateway';

export interface RoomConnection {
  roomId: RoomId;
  position: [number, number, number];
}

export interface RoomDefinition {
  id: RoomId;
  name: string;
  description: string;
  position: [number, number, number];
  connections: RoomConnection[];
  requiresVisited: RoomId[];
}
```

Create `src/types/game.ts`:
```ts
export type RequestStatus = 'pending' | 'ok' | 'error';
export type RequestProtocol = 'HTTP/1.1' | 'HTTP/2' | 'gRPC';

export interface RequestIdentity {
  requestId: string;
  protocol: RequestProtocol;
  ttl: number;
  latencyMs: number;
  status: RequestStatus;
}
```

- [ ] **Step 2: Create design tokens**

Create `src/engine/constants/design-tokens.ts`:
```ts
export const colors = {
  background: '#0a0e14',
  backgroundElevated: '#12161f',
  primary: '#4fd1ff',
  primaryMuted: '#e6f7ff',
  statusHealthy: '#3ddc84',
  statusWarning: '#ffb454',
  statusError: '#ff5f56',
  fog: '#0a0e14',
} as const;

export const fonts = {
  mono: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
} as const;
```

- [ ] **Step 3: Write the failing test for the room registry helpers**

Create `src/engine/constants/rooms.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { getRoomById, isRoomUnlocked, ROOM_REGISTRY } from './rooms';

describe('ROOM_REGISTRY', () => {
  it('has an entry for every RoomId used by getRoomById', () => {
    expect(ROOM_REGISTRY['load-balancer'].id).toBe('load-balancer');
    expect(ROOM_REGISTRY['contact-gateway'].id).toBe('contact-gateway');
  });
});

describe('getRoomById', () => {
  it('returns the matching room definition', () => {
    expect(getRoomById('api-gateway').name).toBe('API Gateway');
  });

  it('throws for an unregistered id', () => {
    // @ts-expect-error - intentionally invalid id to test the runtime guard
    expect(() => getRoomById('not-a-room')).toThrow('Unknown room id: not-a-room');
  });
});

describe('isRoomUnlocked', () => {
  it('is true for a room with no prerequisites', () => {
    expect(isRoomUnlocked('load-balancer', new Set())).toBe(true);
  });

  it('is false when prerequisites are not yet visited', () => {
    expect(isRoomUnlocked('api-gateway', new Set())).toBe(false);
  });

  it('is true once all prerequisites are visited', () => {
    expect(isRoomUnlocked('api-gateway', new Set(['load-balancer']))).toBe(true);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- src/engine/constants/rooms.test.ts`
Expected: FAIL — `Cannot find module './rooms'`.

- [ ] **Step 5: Implement the room registry**

Create `src/engine/constants/rooms.ts`:
```ts
import type { RoomDefinition, RoomId } from '@/types/rooms';

export const ROOM_REGISTRY: Record<RoomId, RoomDefinition> = {
  'load-balancer': {
    id: 'load-balancer',
    name: 'Load Balancer',
    description: 'Incoming requests are distributed across the cluster.',
    position: [0, 0, 0],
    connections: [{ roomId: 'api-gateway', position: [0, 0, -20] }],
    requiresVisited: [],
  },
  'api-gateway': {
    id: 'api-gateway',
    name: 'API Gateway',
    description: 'Requests are routed and rate-limited here.',
    position: [0, 0, -20],
    connections: [{ roomId: 'auth-service', position: [0, 0, -40] }],
    requiresVisited: ['load-balancer'],
  },
  'auth-service': {
    id: 'auth-service',
    name: 'Authentication Service',
    description: 'Requests are authenticated before entering the core system.',
    position: [0, 0, -40],
    connections: [{ roomId: 'about-me', position: [0, 0, -60] }],
    requiresVisited: ['api-gateway'],
  },
  'about-me': {
    id: 'about-me',
    name: 'About Me',
    description: 'A terminal holding cat about.md.',
    position: [0, 0, -60],
    connections: [{ roomId: 'experience-service', position: [20, 0, -60] }],
    requiresVisited: ['auth-service'],
  },
  'experience-service': {
    id: 'experience-service',
    name: 'Experience Service',
    description: 'Each past role, rendered as a microservice.',
    position: [20, 0, -60],
    connections: [{ roomId: 'projects-cluster', position: [40, 0, -60] }],
    requiresVisited: ['about-me'],
  },
  'projects-cluster': {
    id: 'projects-cluster',
    name: 'Projects Cluster',
    description: 'Explorable environments for each shipped project.',
    position: [40, 0, -60],
    connections: [{ roomId: 'skills-dashboard', position: [60, 0, -60] }],
    requiresVisited: ['experience-service'],
  },
  'skills-dashboard': {
    id: 'skills-dashboard',
    name: 'Skills Dashboard',
    description: 'An operations dashboard visualizing skill depth as infrastructure health.',
    position: [60, 0, -60],
    connections: [{ roomId: 'database-layer', position: [60, 0, -80] }],
    requiresVisited: ['projects-cluster'],
  },
  'database-layer': {
    id: 'database-layer',
    name: 'Database Layer',
    description: 'Rows as floating storage blocks; queries and replication visualized.',
    position: [60, 0, -80],
    connections: [{ roomId: 'monitoring-center', position: [60, 0, -100] }],
    requiresVisited: ['skills-dashboard'],
  },
  'monitoring-center': {
    id: 'monitoring-center',
    name: 'Monitoring Center',
    description: 'Live charts of CPU, latency, and errors across the system.',
    position: [60, 0, -100],
    connections: [{ roomId: 'deployment-pipeline', position: [60, 0, -120] }],
    requiresVisited: ['database-layer'],
  },
  'deployment-pipeline': {
    id: 'deployment-pipeline',
    name: 'Deployment Pipeline',
    description: 'Containers deploy through health checks and rolling updates.',
    position: [60, 0, -120],
    connections: [{ roomId: 'contact-gateway', position: [60, 0, -140] }],
    requiresVisited: ['monitoring-center'],
  },
  'contact-gateway': {
    id: 'contact-gateway',
    name: 'Contact Gateway',
    description: 'The final API gateway. Submit a POST request to escape the backend.',
    position: [60, 0, -140],
    connections: [],
    requiresVisited: ['deployment-pipeline'],
  },
};

export function getRoomById(id: RoomId): RoomDefinition {
  const room = ROOM_REGISTRY[id];
  if (!room) {
    throw new Error(`Unknown room id: ${id}`);
  }
  return room;
}

export function isRoomUnlocked(id: RoomId, visited: ReadonlySet<RoomId>): boolean {
  const room = getRoomById(id);
  return room.requiresVisited.every((req) => visited.has(req));
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- src/engine/constants/rooms.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add -A
git commit -m "Add room/game types, design tokens, and room registry"
```

---

### Task 3: Event bus

**Files:**
- Create: `src/engine/managers/EventBus.ts`
- Test: `src/engine/managers/EventBus.test.ts`

**Interfaces:**
- Consumes: `RoomId` from `@/types/rooms`.
- Produces: `eventBus: Emitter<AppEvents>`, `AppEvents` type (`'room:entered'`, `'room:unlocked'`, `'terminal:command'`, `'packet:delivered'`). Consumed by Task 4 (`useGameStore`).

- [ ] **Step 1: Write the failing test**

Create `src/engine/managers/EventBus.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { eventBus } from './EventBus';

describe('eventBus', () => {
  it('delivers the payload to subscribers of room:entered', () => {
    const handler = vi.fn();
    eventBus.on('room:entered', handler);

    eventBus.emit('room:entered', { roomId: 'load-balancer' });

    expect(handler).toHaveBeenCalledWith({ roomId: 'load-balancer' });
    eventBus.off('room:entered', handler);
  });

  it('does not call handlers after they unsubscribe', () => {
    const handler = vi.fn();
    eventBus.on('terminal:command', handler);
    eventBus.off('terminal:command', handler);

    eventBus.emit('terminal:command', { command: 'cat about.md' });

    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/engine/managers/EventBus.test.ts`
Expected: FAIL — `Cannot find module './EventBus'`.

- [ ] **Step 3: Implement the event bus**

Create `src/engine/managers/EventBus.ts`:
```ts
import mitt from 'mitt';
import type { RoomId } from '@/types/rooms';

export type AppEvents = {
  'room:entered': { roomId: RoomId };
  'room:unlocked': { roomId: RoomId };
  'terminal:command': { command: string };
  'packet:delivered': { fromRoomId: RoomId; toRoomId: RoomId };
};

export const eventBus = mitt<AppEvents>();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/engine/managers/EventBus.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add -A
git commit -m "Add typed event bus"
```

---

### Task 4: Game and UI Zustand stores

**Files:**
- Create: `src/engine/state/useGameStore.ts`
- Create: `src/engine/state/useUIStore.ts`
- Test: `src/engine/state/useGameStore.test.ts`
- Test: `src/engine/state/useUIStore.test.ts`

**Interfaces:**
- Consumes: `RoomId` (`@/types/rooms`), `RequestProtocol`/`RequestStatus` (`@/types/game`), `isRoomUnlocked` (`@/engine/constants/rooms`), `eventBus` (`@/engine/managers/EventBus`).
- Produces: `useGameStore` with state `{ requestId, protocol, ttl, latencyMs, status, currentRoomId, visitedRooms, collectedEasterEggs }` and actions `enterRoom(roomId: RoomId): void`, `isUnlocked(roomId: RoomId): boolean`, `collectEasterEgg(id: string): void`. `useUIStore` with state `{ audioMuted, volume, reducedMotion, activeOverlay }` and actions `setReducedMotion(value: boolean): void`, `toggleMute(): void`, `setVolume(value: number): void`, `openOverlay(overlay: 'contact' | 'resume'): void`, `closeOverlay(): void`. Consumed by Task 7 (`AudioManager` reads `useUIStore`), Task 10 (`Experience`/`SceneManager` read `currentRoomId`), Task 12 (`Hud` reads `useGameStore`; `AppRoot` reads/writes `useUIStore`).

- [ ] **Step 1: Write the failing tests for `useGameStore`**

Create `src/engine/state/useGameStore.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';

const initial = useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(
    {
      ...initial,
      currentRoomId: 'load-balancer',
      visitedRooms: new Set(['load-balancer']),
      collectedEasterEggs: new Set(),
    },
    true,
  );
});

describe('useGameStore', () => {
  it('starts in the load-balancer room with it already visited', () => {
    const state = useGameStore.getState();
    expect(state.currentRoomId).toBe('load-balancer');
    expect(state.visitedRooms.has('load-balancer')).toBe(true);
  });

  it('refuses to enter a room whose prerequisites are not visited', () => {
    useGameStore.getState().enterRoom('auth-service');
    expect(useGameStore.getState().currentRoomId).toBe('load-balancer');
  });

  it('enters a room once its prerequisite has been visited', () => {
    useGameStore.getState().enterRoom('api-gateway');
    const state = useGameStore.getState();
    expect(state.currentRoomId).toBe('api-gateway');
    expect(state.visitedRooms.has('api-gateway')).toBe(true);
  });

  it('isUnlocked reflects the same rule enterRoom enforces', () => {
    expect(useGameStore.getState().isUnlocked('auth-service')).toBe(false);
    useGameStore.getState().enterRoom('api-gateway');
    expect(useGameStore.getState().isUnlocked('auth-service')).toBe(true);
  });

  it('collectEasterEgg adds the id without losing previous ones', () => {
    useGameStore.getState().collectEasterEgg('sudo-rm-rf');
    useGameStore.getState().collectEasterEgg('docker-ps');
    const eggs = useGameStore.getState().collectedEasterEggs;
    expect(eggs.has('sudo-rm-rf')).toBe(true);
    expect(eggs.has('docker-ps')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/engine/state/useGameStore.test.ts`
Expected: FAIL — `Cannot find module './useGameStore'`.

- [ ] **Step 3: Implement `useGameStore`**

Create `src/engine/state/useGameStore.ts`:
```ts
import { create } from 'zustand';
import type { RoomId } from '@/types/rooms';
import type { RequestProtocol, RequestStatus } from '@/types/game';
import { isRoomUnlocked } from '@/engine/constants/rooms';
import { eventBus } from '@/engine/managers/EventBus';

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
}

function generateRequestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`;
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
    const { visitedRooms } = get();
    if (!isRoomUnlocked(roomId, visitedRooms)) return;
    const nextVisited = new Set(visitedRooms);
    const wasUnvisited = !nextVisited.has(roomId);
    nextVisited.add(roomId);
    set({ currentRoomId: roomId, visitedRooms: nextVisited });
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
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/engine/state/useGameStore.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing tests for `useUIStore`**

Create `src/engine/state/useUIStore.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from './useUIStore';

const initial = useUIStore.getState();

beforeEach(() => {
  useUIStore.setState(initial, true);
});

describe('useUIStore', () => {
  it('toggleMute flips audioMuted', () => {
    expect(useUIStore.getState().audioMuted).toBe(false);
    useUIStore.getState().toggleMute();
    expect(useUIStore.getState().audioMuted).toBe(true);
  });

  it('setVolume clamps to the 0-1 range', () => {
    useUIStore.getState().setVolume(1.5);
    expect(useUIStore.getState().volume).toBe(1);
    useUIStore.getState().setVolume(-0.5);
    expect(useUIStore.getState().volume).toBe(0);
    useUIStore.getState().setVolume(0.3);
    expect(useUIStore.getState().volume).toBe(0.3);
  });

  it('openOverlay and closeOverlay toggle activeOverlay', () => {
    useUIStore.getState().openOverlay('contact');
    expect(useUIStore.getState().activeOverlay).toBe('contact');
    useUIStore.getState().closeOverlay();
    expect(useUIStore.getState().activeOverlay).toBeNull();
  });

  it('setReducedMotion stores the given value', () => {
    useUIStore.getState().setReducedMotion(true);
    expect(useUIStore.getState().reducedMotion).toBe(true);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- src/engine/state/useUIStore.test.ts`
Expected: FAIL — `Cannot find module './useUIStore'`.

- [ ] **Step 7: Implement `useUIStore`**

Create `src/engine/state/useUIStore.ts`:
```ts
import { create } from 'zustand';

interface UIState {
  audioMuted: boolean;
  volume: number;
  reducedMotion: boolean;
  activeOverlay: 'contact' | 'resume' | null;
  setReducedMotion: (value: boolean) => void;
  toggleMute: () => void;
  setVolume: (value: number) => void;
  openOverlay: (overlay: 'contact' | 'resume') => void;
  closeOverlay: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  audioMuted: false,
  volume: 0.6,
  reducedMotion: false,
  activeOverlay: null,
  setReducedMotion: (value) => set({ reducedMotion: value }),
  toggleMute: () => set((state) => ({ audioMuted: !state.audioMuted })),
  setVolume: (value) => set({ volume: Math.min(1, Math.max(0, value)) }),
  openOverlay: (overlay) => set({ activeOverlay: overlay }),
  closeOverlay: () => set({ activeOverlay: null }),
}));
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test -- src/engine/state/useUIStore.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add -A
git commit -m "Add game and UI Zustand stores"
```

---

### Task 5: Keyboard controls hook

**Files:**
- Create: `src/engine/hooks/useKeyboardControls.ts`
- Test: `src/engine/hooks/useKeyboardControls.test.ts`

**Interfaces:**
- Produces: `KeyboardState` type (`{ forward, backward, left, right, sprint, jump, interact: boolean }`), `useKeyboardControls(): React.MutableRefObject<KeyboardState>`. Consumed by Task 9 (`CameraManager`).

- [ ] **Step 1: Write the failing test**

Create `src/engine/hooks/useKeyboardControls.test.ts`:
```ts
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useKeyboardControls } from './useKeyboardControls';

function dispatchKey(type: 'keydown' | 'keyup', code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
}

describe('useKeyboardControls', () => {
  it('starts with every action false', () => {
    const { result } = renderHook(() => useKeyboardControls());
    expect(result.current.current).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      interact: false,
    });
  });

  it('sets forward true on KeyW down and false on KeyW up', () => {
    const { result } = renderHook(() => useKeyboardControls());

    dispatchKey('keydown', 'KeyW');
    expect(result.current.current.forward).toBe(true);

    dispatchKey('keyup', 'KeyW');
    expect(result.current.current.forward).toBe(false);
  });

  it('treats ArrowUp as an alias for forward', () => {
    const { result } = renderHook(() => useKeyboardControls());

    dispatchKey('keydown', 'ArrowUp');
    expect(result.current.current.forward).toBe(true);
  });

  it('ignores unmapped keys', () => {
    const { result } = renderHook(() => useKeyboardControls());

    dispatchKey('keydown', 'KeyQ');
    expect(result.current.current).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      interact: false,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/engine/hooks/useKeyboardControls.test.ts`
Expected: FAIL — `Cannot find module './useKeyboardControls'`.

- [ ] **Step 3: Implement the hook**

Create `src/engine/hooks/useKeyboardControls.ts`:
```ts
import { useEffect, useRef, type MutableRefObject } from 'react';

export interface KeyboardState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  interact: boolean;
}

const KEY_MAP: Record<string, keyof KeyboardState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  Space: 'jump',
  KeyE: 'interact',
};

function createEmptyState(): KeyboardState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    interact: false,
  };
}

export function useKeyboardControls(): MutableRefObject<KeyboardState> {
  const state = useRef<KeyboardState>(createEmptyState());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = KEY_MAP[event.code];
      if (action) state.current[action] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const action = KEY_MAP[event.code];
      if (action) state.current[action] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return state;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/engine/hooks/useKeyboardControls.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add -A
git commit -m "Add keyboard controls hook"
```

---

### Task 6: WebGL and reduced-motion detection

**Files:**
- Create: `src/lib/webgl.ts`
- Create: `src/lib/reduced-motion.ts`
- Test: `src/lib/webgl.test.ts`
- Test: `src/lib/reduced-motion.test.ts`

**Interfaces:**
- Produces: `isWebGLAvailable(): boolean`, `prefersReducedMotion(): boolean`. Consumed by Task 12 (`AppRoot`).

- [ ] **Step 1: Write the failing test for `isWebGLAvailable`**

Create `src/lib/webgl.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isWebGLAvailable } from './webgl';

describe('isWebGLAvailable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error - cleaning up a test-only global
    delete window.WebGLRenderingContext;
  });

  it('returns false when getContext yields no WebGL context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(isWebGLAvailable()).toBe(false);
  });

  it('returns true when a WebGL context is available', () => {
    // @ts-expect-error - stubbing a browser global for the test
    window.WebGLRenderingContext = function WebGLRenderingContext() {};
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as RenderingContext,
    );
    expect(isWebGLAvailable()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/webgl.test.ts`
Expected: FAIL — `Cannot find module './webgl'`.

- [ ] **Step 3: Implement `isWebGLAvailable`**

Create `src/lib/webgl.ts`:
```ts
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/webgl.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for `prefersReducedMotion`**

Create `src/lib/reduced-motion.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from './reduced-motion';

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when the media query matches', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when the media query does not match', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);
    expect(prefersReducedMotion()).toBe(false);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- src/lib/reduced-motion.test.ts`
Expected: FAIL — `Cannot find module './reduced-motion'`.

- [ ] **Step 7: Implement `prefersReducedMotion`**

Create `src/lib/reduced-motion.ts`:
```ts
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test -- src/lib/reduced-motion.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add -A
git commit -m "Add WebGL and reduced-motion detection utilities"
```

---

### Task 7: Audio manager skeleton

**Files:**
- Create: `src/engine/managers/AudioManager.ts`
- Test: `src/engine/managers/AudioManager.test.ts`

**Interfaces:**
- Consumes: `useUIStore` (`@/engine/state/useUIStore`) for `audioMuted`/`volume`.
- Produces: `audioManager` singleton with `registerAmbient(key: string, src: string[]): void`, `registerSfx(key: string, src: string[]): void`, `playAmbient(key: string): void`, `stopAmbient(): void`, `playSfx(key: string): void`. No sounds are registered in this phase — it exists so later phases (starting with Phase 4 interactions, fully realized in the Phase 14 audio pass) have a stable API to register and trigger real sound files against.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/managers/AudioManager.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { audioManager } from './AudioManager';
import { useUIStore } from '@/engine/state/useUIStore';

beforeEach(() => {
  useUIStore.setState({ audioMuted: false, volume: 0.6 });
});

describe('audioManager', () => {
  it('does not throw when playing an ambient key that was never registered', () => {
    expect(() => audioManager.playAmbient('nonexistent')).not.toThrow();
  });

  it('does not throw when stopping ambient audio with nothing playing', () => {
    expect(() => audioManager.stopAmbient()).not.toThrow();
  });

  it('does not throw when playing an sfx key that was never registered', () => {
    expect(() => audioManager.playSfx('nonexistent')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/engine/managers/AudioManager.test.ts`
Expected: FAIL — `Cannot find module './AudioManager'`.

- [ ] **Step 3: Implement `AudioManager`**

Create `src/engine/managers/AudioManager.ts`:
```ts
import { Howl } from 'howler';
import { useUIStore } from '@/engine/state/useUIStore';

type SoundKey = string;

class AudioManager {
  private ambientSounds = new Map<SoundKey, Howl>();
  private sfxSounds = new Map<SoundKey, Howl>();
  private currentAmbient: SoundKey | null = null;

  registerAmbient(key: SoundKey, src: string[]): void {
    this.ambientSounds.set(key, new Howl({ src, loop: true, volume: this.effectiveVolume() }));
  }

  registerSfx(key: SoundKey, src: string[]): void {
    this.sfxSounds.set(key, new Howl({ src, volume: this.effectiveVolume() }));
  }

  playAmbient(key: SoundKey): void {
    const sound = this.ambientSounds.get(key);
    if (!sound) return;
    if (this.currentAmbient && this.currentAmbient !== key) {
      this.ambientSounds.get(this.currentAmbient)?.stop();
    }
    this.currentAmbient = key;
    if (!useUIStore.getState().audioMuted) sound.play();
  }

  stopAmbient(): void {
    if (!this.currentAmbient) return;
    this.ambientSounds.get(this.currentAmbient)?.stop();
    this.currentAmbient = null;
  }

  playSfx(key: SoundKey): void {
    const sound = this.sfxSounds.get(key);
    if (!sound || useUIStore.getState().audioMuted) return;
    sound.play();
  }

  private effectiveVolume(): number {
    return useUIStore.getState().volume;
  }
}

export const audioManager = new AudioManager();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/engine/managers/AudioManager.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add -A
git commit -m "Add audio manager skeleton"
```

---

### Task 8: Physics provider

**Files:**
- Create: `src/engine/physics/PhysicsProvider.tsx`

**Interfaces:**
- Consumes: `Physics` from `@react-three/rapier`.
- Produces: default-exported `PhysicsProvider({ children }: { children: ReactNode })`. Consumed by Task 10 (`Experience`).

No unit test for this file: it only configures a third-party R3F component and has no branching logic of its own to assert against outside a live WebGL canvas. Per the Global Constraints, it is verified manually in Task 14.

- [ ] **Step 1: Implement `PhysicsProvider`**

Create `src/engine/physics/PhysicsProvider.tsx`:
```tsx
'use client';

import type { ReactNode } from 'react';
import { Physics } from '@react-three/rapier';

interface PhysicsProviderProps {
  children: ReactNode;
}

export default function PhysicsProvider({ children }: PhysicsProviderProps) {
  return (
    <Physics gravity={[0, -9.81, 0]} debug={process.env.NODE_ENV === 'development'}>
      {children}
    </Physics>
  );
}
```

- [ ] **Step 2: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add -A
git commit -m "Add physics provider"
```

---

### Task 9: First-person camera manager

**Files:**
- Create: `src/engine/managers/CameraManager.tsx`

**Interfaces:**
- Consumes: `useKeyboardControls` (`@/engine/hooks/useKeyboardControls`), `PointerLockControls` from `@react-three/drei`, `useFrame`/`useThree` from `@react-three/fiber`.
- Produces: default-exported `CameraManager()` — a component rendering `PointerLockControls` plus per-frame WASD movement. Consumed by Task 10 (`Experience`).

No unit test: camera math is driven by a live Three.js `camera` object from `useThree`, which only exists inside a mounted `Canvas`. Verified manually in Task 14. Full inertia/head-bob tuning is explicitly deferred to Phase 2 — this task only needs functional, if rough, movement.

- [ ] **Step 1: Implement `CameraManager`**

Create `src/engine/managers/CameraManager.tsx`:
```tsx
'use client';

import { useRef, type ElementRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useKeyboardControls } from '@/engine/hooks/useKeyboardControls';

const BASE_SPEED = 4;
const SPRINT_MULTIPLIER = 1.8;

export default function CameraManager() {
  const controlsRef = useRef<ElementRef<typeof PointerLockControls>>(null);
  const keyboard = useKeyboardControls();
  const { camera } = useThree();
  const moveDirection = useRef(new THREE.Vector3());
  const forwardVector = useRef(new THREE.Vector3());
  const rightVector = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const keys = keyboard.current;
    moveDirection.current.set(0, 0, 0);

    if (keys.forward) moveDirection.current.z -= 1;
    if (keys.backward) moveDirection.current.z += 1;
    if (keys.left) moveDirection.current.x -= 1;
    if (keys.right) moveDirection.current.x += 1;

    if (moveDirection.current.lengthSq() === 0) return;

    moveDirection.current.normalize();
    const speed = BASE_SPEED * (keys.sprint ? SPRINT_MULTIPLIER : 1) * delta;

    camera.getWorldDirection(forwardVector.current);
    forwardVector.current.y = 0;
    forwardVector.current.normalize();

    rightVector.current.crossVectors(forwardVector.current, camera.up).normalize();

    camera.position.addScaledVector(forwardVector.current, -moveDirection.current.z * speed);
    camera.position.addScaledVector(rightVector.current, moveDirection.current.x * speed);
  });

  return <PointerLockControls ref={controlsRef} />;
}
```

- [ ] **Step 2: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add -A
git commit -m "Add first-person camera manager with rough WASD movement"
```

---

### Task 10: Scene manager, placeholder room, and canvas assembly

**Files:**
- Create: `src/scenes/world/PlaceholderRoom.tsx`
- Create: `src/engine/managers/SceneManager.tsx`
- Create: `src/components/canvas/Experience.tsx`

**Interfaces:**
- Consumes: `useGameStore` (`currentRoomId`), `PhysicsProvider`, `CameraManager`, `colors` design tokens.
- Produces: default-exported `SceneManager({ activeRoomId: RoomId })`, default-exported `PlaceholderRoom`, default-exported `Experience()`. Consumed by Task 12 (`AppRoot`). `SceneManager` and `Experience` are both modified again in Task 11 to add error-boundary and context-loss handling.

No unit test: these are pure R3F rendering trees. Verified manually in Task 14.

- [ ] **Step 1: Implement the placeholder room**

Create `src/scenes/world/PlaceholderRoom.tsx`:
```tsx
import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';

export default function PlaceholderRoom() {
  return (
    <group>
      <ambientLight intensity={0.15} color={colors.primaryMuted} />
      <pointLight position={[0, 4, 0]} intensity={8} color={colors.primary} distance={20} />
      <fog attach="fog" args={[colors.fog, 5, 40]} />

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[20, 1, 20]} />
          <meshStandardMaterial color={colors.backgroundElevated} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders="cuboid" position={[0, 1, -5]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 3, 2.4]} />
          <meshStandardMaterial color="#1b2230" metalness={0.4} roughness={0.6} />
        </mesh>
      </RigidBody>
    </group>
  );
}
```

- [ ] **Step 2: Implement the scene manager registry**

Create `src/engine/managers/SceneManager.tsx`:
```tsx
'use client';

import { lazy, Suspense } from 'react';
import type { RoomId } from '@/types/rooms';

const ROOM_COMPONENTS: Partial<Record<RoomId, ReturnType<typeof lazy>>> = {
  'load-balancer': lazy(() => import('@/scenes/world/PlaceholderRoom')),
};

interface SceneManagerProps {
  activeRoomId: RoomId;
}

export default function SceneManager({ activeRoomId }: SceneManagerProps) {
  const RoomComponent = ROOM_COMPONENTS[activeRoomId];
  if (!RoomComponent) return null;

  return (
    <Suspense fallback={null}>
      <RoomComponent />
    </Suspense>
  );
}
```

Note: only `load-balancer` is registered because it's the only room with real content so far. Each later phase adds its room(s) to this map — this is the seam Phase 4 onward plugs into. Proximity-based *preloading* of not-yet-active neighboring rooms is deferred until there are real neighboring rooms to preload (Phase 4).

- [ ] **Step 3: Assemble the canvas experience**

Create `src/components/canvas/Experience.tsx`:
```tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import PhysicsProvider from '@/engine/physics/PhysicsProvider';
import CameraManager from '@/engine/managers/CameraManager';
import SceneManager from '@/engine/managers/SceneManager';
import { useGameStore } from '@/engine/state/useGameStore';
import { colors } from '@/engine/constants/design-tokens';

export default function Experience() {
  const currentRoomId = useGameStore((state) => state.currentRoomId);

  return (
    <Canvas
      shadows
      camera={{ fov: 75, position: [0, 1.6, 5] }}
      style={{ background: colors.background }}
    >
      <Suspense fallback={null}>
        <PhysicsProvider>
          <CameraManager />
          <SceneManager activeRoomId={currentRoomId} />
        </PhysicsProvider>
      </Suspense>
    </Canvas>
  );
}
```

- [ ] **Step 4: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add -A
git commit -m "Add scene manager, placeholder room, and canvas assembly"
```

---

### Task 11: Room error boundary and context-loss recovery

**Files:**
- Create: `src/engine/managers/RoomErrorBoundary.tsx`
- Create: `src/components/canvas/ConnectionLost.tsx`
- Modify: `src/engine/managers/SceneManager.tsx`
- Modify: `src/components/canvas/Experience.tsx`
- Test: `src/engine/managers/RoomErrorBoundary.test.ts`
- Test: `src/components/canvas/ConnectionLost.test.tsx`

**Interfaces:**
- Produces: default-exported `RoomErrorBoundary` (wraps children, catches render errors, shows a themed "503 Service Unavailable" retry fallback via drei's `Html`), default-exported `ConnectionLost()` (DOM overlay with a Reload button). Modifies `SceneManager` to wrap each room in `RoomErrorBoundary`. Modifies `Experience` to accept an `onContextLost?: () => void` prop, invoked when the WebGL context is lost. Consumed by Task 12 (`AppRoot` renders `ConnectionLost` and passes `onContextLost` to `Experience`).

- [ ] **Step 1: Write the failing test for `RoomErrorBoundary`**

Create `src/engine/managers/RoomErrorBoundary.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import RoomErrorBoundary from './RoomErrorBoundary';

describe('RoomErrorBoundary.getDerivedStateFromError', () => {
  it('flips into the error state when a child throws', () => {
    expect(RoomErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/engine/managers/RoomErrorBoundary.test.ts`
Expected: FAIL — `Cannot find module './RoomErrorBoundary'`.

- [ ] **Step 3: Implement `RoomErrorBoundary`**

Create `src/engine/managers/RoomErrorBoundary.tsx`:
```tsx
'use client';

import { Component, type ReactNode } from 'react';
import { Html } from '@react-three/drei';

interface RoomErrorBoundaryProps {
  children: ReactNode;
}

interface RoomErrorBoundaryState {
  hasError: boolean;
}

export default class RoomErrorBoundary extends Component<
  RoomErrorBoundaryProps,
  RoomErrorBoundaryState
> {
  state: RoomErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RoomErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="w-64 rounded border border-[#ff5f56] bg-[#12161f] p-4 text-center font-mono text-xs text-[#ff5f56]">
            <p>503 SERVICE UNAVAILABLE</p>
            <p className="mt-1 text-[#8fa3b8]">This room failed to load.</p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-3 rounded border border-[#ff5f56] px-3 py-1 text-[#ff5f56] hover:bg-[#ff5f56]/10"
            >
              Retry
            </button>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/engine/managers/RoomErrorBoundary.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing test for `ConnectionLost`**

Create `src/components/canvas/ConnectionLost.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConnectionLost from './ConnectionLost';

describe('ConnectionLost', () => {
  it('reloads the page when the Reload button is clicked', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    });

    render(<ConnectionLost />);
    fireEvent.click(screen.getByRole('button', { name: /reload/i }));

    expect(reload).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- src/components/canvas/ConnectionLost.test.tsx`
Expected: FAIL — `Cannot find module './ConnectionLost'`.

- [ ] **Step 7: Implement `ConnectionLost`**

Create `src/components/canvas/ConnectionLost.tsx`:
```tsx
export default function ConnectionLost() {
  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0a0e14] font-mono text-[#e6f7ff]">
      <h1 className="text-lg text-[#ff5f56]">CONNECTION LOST</h1>
      <p className="text-sm text-[#8fa3b8]">The rendering context was lost.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded border border-[#4fd1ff] px-4 py-2 text-sm text-[#4fd1ff] hover:bg-[#4fd1ff]/10"
      >
        Reload
      </button>
    </main>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test -- src/components/canvas/ConnectionLost.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 9: Wrap rooms in the error boundary**

Replace the contents of `src/engine/managers/SceneManager.tsx`:
```tsx
'use client';

import { lazy, Suspense } from 'react';
import type { RoomId } from '@/types/rooms';
import RoomErrorBoundary from './RoomErrorBoundary';

const ROOM_COMPONENTS: Partial<Record<RoomId, ReturnType<typeof lazy>>> = {
  'load-balancer': lazy(() => import('@/scenes/world/PlaceholderRoom')),
};

interface SceneManagerProps {
  activeRoomId: RoomId;
}

export default function SceneManager({ activeRoomId }: SceneManagerProps) {
  const RoomComponent = ROOM_COMPONENTS[activeRoomId];
  if (!RoomComponent) return null;

  return (
    <Suspense fallback={null}>
      <RoomErrorBoundary>
        <RoomComponent />
      </RoomErrorBoundary>
    </Suspense>
  );
}
```

- [ ] **Step 10: Wire WebGL context-loss detection into `Experience`**

Replace the contents of `src/components/canvas/Experience.tsx`:
```tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import PhysicsProvider from '@/engine/physics/PhysicsProvider';
import CameraManager from '@/engine/managers/CameraManager';
import SceneManager from '@/engine/managers/SceneManager';
import { useGameStore } from '@/engine/state/useGameStore';
import { colors } from '@/engine/constants/design-tokens';

interface ExperienceProps {
  onContextLost?: () => void;
}

export default function Experience({ onContextLost }: ExperienceProps) {
  const currentRoomId = useGameStore((state) => state.currentRoomId);

  return (
    <Canvas
      shadows
      camera={{ fov: 75, position: [0, 1.6, 5] }}
      style={{ background: colors.background }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          onContextLost?.();
        });
      }}
    >
      <Suspense fallback={null}>
        <PhysicsProvider>
          <CameraManager />
          <SceneManager activeRoomId={currentRoomId} />
        </PhysicsProvider>
      </Suspense>
    </Canvas>
  );
}
```

- [ ] **Step 11: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add -A
git commit -m "Add room error boundary and WebGL context-loss recovery"
```

---

### Task 12: HUD, WebGL fallback, and app root wiring

**Files:**
- Create: `src/components/hud/Hud.tsx`
- Create: `src/components/canvas/WebGLUnavailable.tsx`
- Create: `src/components/AppRoot.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/hud/Hud.test.tsx`
- Test: `src/components/canvas/WebGLUnavailable.test.tsx`

**Interfaces:**
- Consumes: `useGameStore`, `getRoomById`, `useUIStore`, `isWebGLAvailable`, `prefersReducedMotion`, `Experience`, `ConnectionLost`.
- Produces: default-exported `Hud()`, default-exported `WebGLUnavailable()`, default-exported `AppRoot()`, wired into `app/page.tsx`.

- [ ] **Step 1: Write the failing test for `Hud`**

Create `src/components/hud/Hud.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Hud from './Hud';
import { useGameStore } from '@/engine/state/useGameStore';

describe('Hud', () => {
  it("shows the current room's name, protocol, TTL, and status", () => {
    render(<Hud />);

    const { requestId } = useGameStore.getState();
    expect(screen.getByText(new RegExp(requestId))).toBeInTheDocument();
    expect(screen.getByText('LOAD BALANCER')).toBeInTheDocument();
    expect(screen.getByText('HTTP/2')).toBeInTheDocument();
    expect(screen.getByText('TTL 64')).toBeInTheDocument();
    expect(screen.getByText('STATUS PENDING')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/hud/Hud.test.tsx`
Expected: FAIL — `Cannot find module './Hud'`.

- [ ] **Step 3: Implement `Hud`**

Create `src/components/hud/Hud.tsx`:
```tsx
'use client';

import { useGameStore } from '@/engine/state/useGameStore';
import { getRoomById } from '@/engine/constants/rooms';

export default function Hud() {
  const requestId = useGameStore((state) => state.requestId);
  const protocol = useGameStore((state) => state.protocol);
  const ttl = useGameStore((state) => state.ttl);
  const latencyMs = useGameStore((state) => state.latencyMs);
  const status = useGameStore((state) => state.status);
  const currentRoomId = useGameStore((state) => state.currentRoomId);
  const room = getRoomById(currentRoomId);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 flex justify-between p-4 font-mono text-xs text-[#e6f7ff]">
      <div className="space-y-0.5">
        <div>REQUEST {requestId}</div>
        <div>{protocol}</div>
        <div>TTL {ttl}</div>
      </div>
      <div className="space-y-0.5 text-right">
        <div>{room.name.toUpperCase()}</div>
        <div>LATENCY {latencyMs}ms</div>
        <div>STATUS {status.toUpperCase()}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/hud/Hud.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing test for `WebGLUnavailable`**

Create `src/components/canvas/WebGLUnavailable.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WebGLUnavailable from './WebGLUnavailable';

describe('WebGLUnavailable', () => {
  it('shows a fallback message with a way to reach the site owner', () => {
    render(<WebGLUnavailable />);
    expect(screen.getByText(/can.t render the backend/i)).toBeInTheDocument();
    expect(screen.getByText('himanishah@solvative.com')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test -- src/components/canvas/WebGLUnavailable.test.tsx`
Expected: FAIL — `Cannot find module './WebGLUnavailable'`.

- [ ] **Step 7: Implement `WebGLUnavailable`**

Create `src/components/canvas/WebGLUnavailable.tsx`:
```tsx
export default function WebGLUnavailable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0e14] p-8 text-center font-mono text-[#e6f7ff]">
      <h1 className="text-lg">503 — this browser can&apos;t render the backend</h1>
      <p className="max-w-md text-sm text-[#8fa3b8]">
        This experience requires WebGL support. Reach me directly instead:
      </p>
      <a className="text-sm underline" href="mailto:himanishah@solvative.com">
        himanishah@solvative.com
      </a>
    </main>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm run test -- src/components/canvas/WebGLUnavailable.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 9: Wire up `AppRoot`**

Create `src/components/AppRoot.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import Experience from '@/components/canvas/Experience';
import Hud from '@/components/hud/Hud';
import WebGLUnavailable from '@/components/canvas/WebGLUnavailable';
import ConnectionLost from '@/components/canvas/ConnectionLost';
import { isWebGLAvailable } from '@/lib/webgl';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { useUIStore } from '@/engine/state/useUIStore';

export default function AppRoot() {
  const [webglReady, setWebglReady] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const setReducedMotion = useUIStore((state) => state.setReducedMotion);

  useEffect(() => {
    setWebglReady(isWebGLAvailable());
    setReducedMotion(prefersReducedMotion());
  }, [setReducedMotion]);

  if (webglReady === null) return null;
  if (!webglReady) return <WebGLUnavailable />;
  if (contextLost) return <ConnectionLost />;

  return (
    <>
      <Experience onContextLost={() => setContextLost(true)} />
      <Hud />
    </>
  );
}
```

No unit test for `AppRoot`: it mounts the live `Canvas` tree, which is verified manually in Task 14.

- [ ] **Step 10: Wire `AppRoot` into the home page**

Replace the contents of `src/app/page.tsx` with:
```tsx
import AppRoot from '@/components/AppRoot';

export default function Home() {
  return <AppRoot />;
}
```

- [ ] **Step 11: Run the full test suite and type-check**

Run: `npm run test`
Expected: all tests from Tasks 1–12 pass with no failures.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "Add HUD, WebGL fallback, and wire AppRoot into the home page"
```

---

### Task 13: `SKILLS.md` v1

**Files:**
- Create: `SKILLS.md`

No test — documentation only.

- [ ] **Step 1: Write `SKILLS.md`**

Create `SKILLS.md` at the project root:
```markdown
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
  `ConnectionLost` if the GPU context dies mid-session.
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
  lib/                   # Framework-agnostic pure utilities (cn, webgl, reduced-motion)
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

Defined once in `src/engine/constants/design-tokens.ts` — never hardcode
these hex values elsewhere; import `colors`.

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
  second room needs them (YAGNI until then — Phase 1 has exactly one room).
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
- GSAP is reserved for multi-step cinematic timelines (the boot sequence,
  Phase 3) — do not reach for it for simple per-frame movement, which
  `useFrame` handles more simply.

## State Management Conventions

- `useGameStore` and `useUIStore` stay separate — do not merge them.
- Select individual fields from Zustand stores (`useGameStore((s) =>
  s.currentRoomId)`), not object literals (`useGameStore((s) => ({...}))`),
  since the latter creates a new object every render and defeats Zustand's
  re-render optimization.
- Cross-cutting side effects (audio cues, achievement toasts) subscribe to
  `EventBus`, not to store changes directly, so they stay decoupled from
  which store happens to own the underlying state.
- `requestId`, `ttl`, and `latencyMs` in `useGameStore` are static placeholder
  values in Phase 1. They become dynamic (ttl decrementing, latency reacting
  to traversal) starting Phase 4, once real room-to-room travel exists.

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
- Interactive prompts ("Press E to interact", added from Phase 4) must also
  be mirrored into an ARIA live region for screen readers.
- Be honest about limits: a spatial 3D experience is not fully navigable
  non-visually. The `WebGLUnavailable` fallback (also shown to users who
  disable WebGL) is the accessible path of last resort, not a claim that the
  3D world itself is screen-reader-complete.

## Performance Rules

- Rooms load lazily via `SceneManager`'s registry — never import all rooms
  eagerly into `Experience`.
- Prefer instanced meshes for any repeated geometry (server racks, cables,
  status lights) once a room needs more than a handful of repeated objects —
  not yet needed with Phase 1's single placeholder room.
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

## Scene Organization

One file per room under `scenes/world/`, registered by `RoomId` in
`SceneManager`'s `ROOM_COMPONENTS` map. A room is only added to that map once
it has real content — an unregistered `RoomId` in the room registry
(`src/engine/constants/rooms.ts`) is expected and fine; `SceneManager`
renders nothing for it until its phase builds it out. Every registered room
is automatically wrapped in `RoomErrorBoundary` by `SceneManager` — rooms do
not need to add their own error handling.

## Reusable Interaction Patterns

Established in later phases, recorded here as they're built:
- **Terminal interaction** (Phase 4/6): walk up, press E, text prints with a
  blinking cursor. Built once, reused for About Me, hidden terminals, and the
  Contact Gateway's POST-request form.
- **Proximity trigger** (`useProximity`, added Phase 4): generic hook for
  "player is within N units of point X" — powers interact prompts and future
  room preloading.

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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "Add SKILLS.md v1 project handbook"
```

---

### Task 14: Full verification pass

**Files:** none created; this task only runs and observes.

- [ ] **Step 1: Run the full automated check suite**

Run: `npm run test`
Expected: every test file created across Tasks 1–12 passes with no failures.

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: production build succeeds with no errors.

- [ ] **Step 2: Manual browser verification**

Start the dev server (`npm run dev`), then using the Claude Browser tool:
1. Navigate to `http://localhost:3000`.
2. Take a screenshot — confirm a dark canvas is visible with a lit floor and a box "server rack" shape, and the HUD text is visible in the top corners (request id, protocol, TTL on the left; room name "LOAD BALANCER", latency, status on the right).
3. Click into the canvas to engage pointer lock, then simulate WASD key presses and confirm (via a follow-up screenshot) the camera position appears to have moved relative to the server rack box.
4. Check the browser console for errors — there should be none.

- [ ] **Step 3: Fix any issues found during manual verification**

If the manual pass surfaces a bug (e.g., movement direction inverted, HUD text unreadable against the background), fix it in the relevant file from Tasks 8–12, re-run `npm run test` and `npx tsc --noEmit`, and re-verify in the browser before proceeding.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "Verify Phase 1 foundation end-to-end"
```
