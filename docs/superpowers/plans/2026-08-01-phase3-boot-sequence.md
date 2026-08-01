# Phase 3: Boot Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen, skippable, once-per-session cinematic boot sequence — personalized with the visitor's actual request identity — that plays before `Experience`/`Hud` mount.

**Architecture:** Two pure/tested units (`buildBootScript`, `lib/session.ts`) plus one tested presentational component (`TerminalOutput`) feed a GSAP-driven orchestrator (`BootSequence`) that is wired into `AppRoot` ahead of the existing `Experience`/`Hud` render.

**Tech Stack:** GSAP (new dependency, installed in this phase), React, Zustand (`useGameStore`, `useUIStore`), Vitest + React Testing Library.

## Global Constraints

- TypeScript strict mode; no `any` anywhere.
- Components: PascalCase, default export, no exceptions. Hooks/utils: camelCase, named exports only.
- Zustand state selected via individual field selectors, never object-literal selectors.
- Skippable via any keydown/click; once-per-session via `sessionStorage` (not skipped structurally under reduced motion — same code path with a near-zero duration instead).
- Boot lines are personalized using the real `requestId`/`protocol`/`ttl` from `useGameStore`.
- Tailwind color classes come from the existing theme tokens registered in `src/app/globals.css`'s `@theme` block (`bg-background`, `bg-background-elevated`, `bg-primary`, `text-primary`, `text-primary-muted`) — do not hardcode hex values.
- This project requires Node >= 22 (`.nvmrc` pins `22.22.3`); every Bash command invoking `npm`/`npx`/`node` must chain the nvm switch in the same command: `source ~/.nvm/nvm.sh && nvm use 22.22.3 && <command>` — shell state does not persist between separate tool calls.
- This codebase has hit real, newer React-Compiler-aware ESLint rules (`react-hooks/set-state-in-effect`, `react-hooks/immutability`, `react-hooks/exhaustive-deps`, `react-hooks/static-components`) in every phase so far that weren't anticipated when a plan was written. If `npm run lint` flags a new error on code that matches an existing pattern in the file being edited, add a scoped `eslint-disable-next-line <rule>` with a one-line justification, matching the file's existing precedent — do not restructure working logic to satisfy an overly aggressive static-analysis rule.
- Every task ends with `npx tsc --noEmit` passing and, where applicable, `npm run test` passing, before committing.

---

### Task 1: Install GSAP and add the session-storage utility

**Files:**
- Create: `src/lib/session.ts`
- Test: `src/lib/session.test.ts`

**Interfaces:**
- Produces: `hasSeenBootSequence(): boolean`, `markBootSequenceSeen(): void`. Consumed by Task 5 (`AppRoot.tsx`).

- [ ] **Step 1: Install GSAP**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22.22.3 && npm install gsap
```
Expected: exits 0, `gsap` appears in `package.json` `dependencies`. GSAP ships its own TypeScript types — no separate `@types/gsap` package needed.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/session.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasSeenBootSequence, markBootSequenceSeen } from './session';

describe('session', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hasSeenBootSequence returns false when nothing has been marked', () => {
    expect(hasSeenBootSequence()).toBe(false);
  });

  it('hasSeenBootSequence returns true after markBootSequenceSeen', () => {
    markBootSequenceSeen();
    expect(hasSeenBootSequence()).toBe(true);
  });

  it('hasSeenBootSequence returns false if sessionStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hasSeenBootSequence()).toBe(false);
  });

  it('markBootSequenceSeen does not throw if sessionStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => markBootSequenceSeen()).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- src/lib/session.test.ts`
Expected: FAIL — `Cannot find module './session'`.

- [ ] **Step 4: Implement `session.ts`**

Create `src/lib/session.ts`:
```ts
const BOOT_SEQUENCE_SEEN_KEY = 'backend-odyssey:boot-seen';

export function hasSeenBootSequence(): boolean {
  try {
    return sessionStorage.getItem(BOOT_SEQUENCE_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markBootSequenceSeen(): void {
  try {
    sessionStorage.setItem(BOOT_SEQUENCE_SEEN_KEY, 'true');
  } catch {
    // Ignore write failures (e.g. Safari private browsing) — worst case the
    // boot sequence replays on the next reload, which is harmless.
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/lib/session.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add package.json package-lock.json src/lib/session.ts src/lib/session.test.ts
git commit -m "Install GSAP and add session-storage boot-sequence tracking"
```

---

### Task 2: Boot script pure function

**Files:**
- Create: `src/components/boot/bootScript.ts`
- Test: `src/components/boot/bootScript.test.ts`

**Interfaces:**
- Produces: `buildBootScript(requestId: string, protocol: string, ttl: number): string[]`. Consumed by Task 4 (`BootSequence.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `src/components/boot/bootScript.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildBootScript } from './bootScript';

describe('buildBootScript', () => {
  it('returns the boot lines in order, interpolating the given identity', () => {
    const lines = buildBootScript('req_abc123', 'HTTP/2', 64);
    expect(lines[0]).toBe('Incoming request...');
    expect(lines).toContain('Assigning request ID: req_abc123');
    expect(lines).toContain('Protocol negotiated: HTTP/2');
    expect(lines).toContain('TTL allocated: 64');
    expect(lines[lines.length - 1]).toBe('Backend ready.');
  });

  it('produces a fresh array each call (no shared mutable state)', () => {
    const a = buildBootScript('req_a', 'HTTP/2', 64);
    const b = buildBootScript('req_b', 'HTTP/1.1', 32);
    a.push('mutated');
    expect(b).not.toContain('mutated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/boot/bootScript.test.ts`
Expected: FAIL — `Cannot find module './bootScript'`.

- [ ] **Step 3: Implement `bootScript.ts`**

Create `src/components/boot/bootScript.ts`:
```ts
export function buildBootScript(requestId: string, protocol: string, ttl: number): string[] {
  return [
    'Incoming request...',
    `Assigning request ID: ${requestId}`,
    `Protocol negotiated: ${protocol}`,
    `TTL allocated: ${ttl}`,
    'Performing TLS handshake... OK',
    'Allocating worker... OK',
    'Connecting to cluster... OK',
    'Authenticating... OK',
    'Loading services...',
    'Backend ready.',
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/boot/bootScript.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add src/components/boot/bootScript.ts src/components/boot/bootScript.test.ts
git commit -m "Add boot script generator"
```

---

### Task 3: Terminal output presentational component

**Files:**
- Create: `src/components/boot/TerminalOutput.tsx`
- Test: `src/components/boot/TerminalOutput.test.tsx`

**Interfaces:**
- Produces: default-exported `TerminalOutput({ visibleLines: string[], progress: number, done: boolean, reducedMotion: boolean })`. Consumed by Task 4 (`BootSequence.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `src/components/boot/TerminalOutput.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TerminalOutput from './TerminalOutput';

describe('TerminalOutput', () => {
  it('renders each visible line and the rounded progress percentage', () => {
    render(
      <TerminalOutput
        visibleLines={['Incoming request...', 'Backend ready.']}
        progress={62.4}
        done={false}
        reducedMotion={false}
      />,
    );
    expect(screen.getByText('Incoming request...')).toBeInTheDocument();
    expect(screen.getByText('Backend ready.')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
  });

  it('shows the cursor while not done', () => {
    render(<TerminalOutput visibleLines={['line one']} progress={10} done={false} reducedMotion={false} />);
    expect(screen.getByText('_')).toBeInTheDocument();
  });

  it('hides the cursor once done', () => {
    render(<TerminalOutput visibleLines={['line one']} progress={100} done reducedMotion={false} />);
    expect(screen.queryByText('_')).not.toBeInTheDocument();
  });

  it('clamps progress into the 0-100 range', () => {
    render(<TerminalOutput visibleLines={[]} progress={150} done={false} reducedMotion={false} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('applies the pulse animation to the cursor unless reducedMotion is set', () => {
    const { rerender } = render(
      <TerminalOutput visibleLines={['x']} progress={0} done={false} reducedMotion={false} />,
    );
    expect(screen.getByText('_')).toHaveClass('animate-pulse');

    rerender(<TerminalOutput visibleLines={['x']} progress={0} done={false} reducedMotion />);
    expect(screen.getByText('_')).not.toHaveClass('animate-pulse');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/boot/TerminalOutput.test.tsx`
Expected: FAIL — `Cannot find module './TerminalOutput'`.

- [ ] **Step 3: Implement `TerminalOutput.tsx`**

Create `src/components/boot/TerminalOutput.tsx`:
```tsx
interface TerminalOutputProps {
  visibleLines: string[];
  progress: number;
  done: boolean;
  reducedMotion: boolean;
}

export default function TerminalOutput({
  visibleLines,
  progress,
  done,
  reducedMotion,
}: TerminalOutputProps) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="font-mono text-sm text-primary-muted">
      {visibleLines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
      {!done && (
        <span aria-hidden="true" className={reducedMotion ? '' : 'animate-pulse'}>
          _
        </span>
      )}
      <div className="mt-6">
        <div className="h-1 w-full bg-background-elevated">
          <div className="h-full bg-primary" style={{ width: `${clampedProgress}%` }} />
        </div>
        <div className="mt-1 text-xs text-primary">{clampedProgress}%</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/boot/TerminalOutput.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit`
```bash
git add src/components/boot/TerminalOutput.tsx src/components/boot/TerminalOutput.test.tsx
git commit -m "Add terminal output presentational component"
```

---

### Task 4: Boot sequence orchestrator

**Files:**
- Create: `src/components/boot/BootSequence.tsx`

**Interfaces:**
- Consumes: `buildBootScript` (Task 2), default-exported `TerminalOutput` (Task 3), `useGameStore` (has `requestId: string`, `protocol: string`, `ttl: number`), `useUIStore` (has `reducedMotion: boolean`), `gsap` (installed in Task 1).
- Produces: default-exported `BootSequence({ onComplete: () => void })`. Consumed by Task 5 (`AppRoot.tsx`).

No unit test — this is a GSAP-driven imperative timeline component, in the same manually-verified-only bucket as `CameraManager.tsx` (verified in Task 6).

- [ ] **Step 1: Implement `BootSequence.tsx`**

Create `src/components/boot/BootSequence.tsx`:
```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGameStore } from '@/engine/state/useGameStore';
import { useUIStore } from '@/engine/state/useUIStore';
import { buildBootScript } from './bootScript';
import TerminalOutput from './TerminalOutput';

const LINE_DURATION_SECONDS = 0.5;
const POST_COMPLETE_HOLD_SECONDS = 0.6;
const REDUCED_MOTION_DURATION_SECONDS = 0.001;

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const requestId = useGameStore((state) => state.requestId);
  const protocol = useGameStore((state) => state.protocol);
  const ttl = useGameStore((state) => state.ttl);
  const reducedMotion = useUIStore((state) => state.reducedMotion);

  const scriptRef = useRef(buildBootScript(requestId, protocol, ttl));
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const lines = scriptRef.current;
    const stepDuration = reducedMotion ? REDUCED_MOTION_DURATION_SECONDS : LINE_DURATION_SECONDS;
    const holdDuration = reducedMotion ? REDUCED_MOTION_DURATION_SECONDS : POST_COMPLETE_HOLD_SECONDS;
    const progressState = { value: 0 };

    const timeline = gsap.timeline({
      onComplete: () => {
        setDone(true);
        onComplete();
      },
    });

    lines.forEach((_, index) => {
      timeline.call(() => setVisibleCount(index + 1));
      timeline.to(progressState, {
        value: ((index + 1) / lines.length) * 100,
        duration: stepDuration,
        onUpdate: () => setProgress(progressState.value),
      });
    });

    timeline.to({}, { duration: holdDuration });

    const skip = () => timeline.progress(1);
    window.addEventListener('keydown', skip);
    window.addEventListener('click', skip);

    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('click', skip);
      timeline.kill();
    };
  }, [onComplete, reducedMotion]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg">
        <TerminalOutput
          visibleLines={scriptRef.current.slice(0, visibleCount)}
          progress={progress}
          done={done}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
}
```

Note: calling `setVisibleCount`/`setProgress`/`setDone` from inside GSAP's `.call()`/`onUpdate`/`onComplete` callbacks (not as direct top-level statements in the effect body) is the pattern `react-hooks/set-state-in-effect` itself recommends ("calling setState in a callback function when external state changes") — this should not trigger that rule. If `npm run lint` disagrees, add a scoped `eslint-disable-next-line` per the Global Constraints note, but check first rather than assuming.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors. If a new error appears, follow the Global Constraints guidance on scoped suppressions rather than restructuring working logic.

- [ ] **Step 4: Commit**

```bash
git add src/components/boot/BootSequence.tsx
git commit -m "Add GSAP-driven boot sequence orchestrator"
```

---

### Task 5: Wire the boot sequence into AppRoot

**Files:**
- Modify: `src/components/AppRoot.tsx`

**Interfaces:**
- Consumes: default-exported `BootSequence` (Task 4), `hasSeenBootSequence`/`markBootSequenceSeen` (Task 1).
- Produces: no change to `AppRoot`'s own external interface (still a default-exported, prop-less component rendered by `src/app/page.tsx`).

No unit test — `AppRoot` mounts the live boot/Canvas tree, verified manually in Task 6, matching the established convention (unchanged from Phase 1).

- [ ] **Step 1: Read the current file**

Read `src/components/AppRoot.tsx` in full before editing — confirm it still matches the structure described below (it was last touched in Phase 1/2; if it has diverged, adapt this step's replacement to preserve any changes you find rather than blindly overwriting).

- [ ] **Step 2: Replace `AppRoot.tsx`**

Replace the full contents of `src/components/AppRoot.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import Experience from '@/components/canvas/Experience';
import Hud from '@/components/hud/Hud';
import WebGLUnavailable from '@/components/canvas/WebGLUnavailable';
import ConnectionLost from '@/components/canvas/ConnectionLost';
import BootSequence from '@/components/boot/BootSequence';
import { isWebGLAvailable } from '@/lib/webgl';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { hasSeenBootSequence, markBootSequenceSeen } from '@/lib/session';
import { useUIStore } from '@/engine/state/useUIStore';

export default function AppRoot() {
  const [webglReady, setWebglReady] = useState<boolean | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const setReducedMotion = useUIStore((state) => state.setReducedMotion);

  useEffect(() => {
    // One-time mount detection of browser-only APIs (WebGL, matchMedia) — must run
    // in an effect (not during render) to avoid an SSR/hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglReady(isWebGLAvailable());
    setReducedMotion(prefersReducedMotion());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBootDone(hasSeenBootSequence());
  }, [setReducedMotion]);

  if (webglReady === null) return null;
  if (!webglReady) return <WebGLUnavailable />;
  if (contextLost) return <ConnectionLost />;

  if (!bootDone) {
    return (
      <BootSequence
        onComplete={() => {
          markBootSequenceSeen();
          setBootDone(true);
        }}
      />
    );
  }

  return (
    <>
      <Experience onContextLost={() => setContextLost(true)} />
      <Hud />
    </>
  );
}
```

Note: the second `eslint-disable-next-line react-hooks/set-state-in-effect` above `setBootDone(...)` is a prediction based on this exact rule already firing on the adjacent, identical-shape `setWebglReady(...)` call in this same file (established in Phase 1). Run lint in the next step to confirm it's actually needed — if `npm run lint` reports an "unused eslint-disable directive" warning on that line, the prediction was wrong; remove the comment.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors and no "unused eslint-disable directive" warnings. Adjust the suppression comment added in Step 2 based on the actual output (add one if something is flagged and unsuppressed; remove one if it's reported unused).

- [ ] **Step 4: Commit**

```bash
git add src/components/AppRoot.tsx
git commit -m "Wire boot sequence into AppRoot ahead of Experience/Hud"
```

---

### Task 6: Full verification pass

**Files:** none created; this task only runs and observes.

- [ ] **Step 1: Run the full automated check suite**

Run: `npm run test`
Expected: every test file created across Tasks 1-3 passes, plus all existing tests from Phases 1-2, with no regressions.

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 2: Manual browser verification — full sequence**

Start the dev server (`npm run dev`). Using the Claude Browser tool:
1. Clear any existing session state for the site (open a fresh tab, or use the browser tool's session/context reset if available) so the boot sequence is guaranteed to play.
2. Navigate to the running site. Confirm a full-screen dark terminal overlay appears (not the 3D scene/HUD yet).
3. Confirm boot lines appear progressively, including a line showing a real-looking request ID (e.g. `Assigning request ID: req_...`) and a line showing `HTTP/2` and a TTL number.
4. Confirm a progress bar advances from 0% toward 100% alongside the lines.
5. Wait for the sequence to finish naturally; confirm it hands off to the placeholder room + HUD, and that the HUD's `REQUEST` line shows the exact same request ID that appeared during boot (open the browser tool's page text/read_page to compare the two strings directly, not just visually).
6. Reload the page (same tab/session). Confirm the boot sequence does NOT play again — the site goes straight to the placeholder room + HUD.

- [ ] **Step 3: Manual browser verification — skip**

1. Reset session state again (fresh tab) so boot plays from the start.
2. Navigate to the site; while the boot sequence is mid-playback, dispatch a keydown event (e.g. via the browser tool's JS execution, `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }))`) or a click.
3. Confirm the sequence completes immediately (jumps to the placeholder room + HUD) rather than continuing to play out its full duration.

- [ ] **Step 4: Manual browser verification — reduced motion**

1. Reset session state again (fresh tab).
2. Use the browser tool's `resize_window` or equivalent to set `colorScheme`/emulate `prefers-reduced-motion: reduce` if the tool supports it; otherwise use `javascript_tool` to override `window.matchMedia` before navigation is not possible post-load, so instead verify this by reading the code path: confirm via `read_console_messages`/`read_network_requests` that no errors occur, and cross-check that `REDUCED_MOTION_DURATION_SECONDS` is used by temporarily setting `useUIStore.getState().setReducedMotion(true)` via `javascript_tool` immediately after page load (before boot completes) and confirming the remaining boot lines/progress jump to completion almost immediately rather than over the normal ~5 second duration.
3. Confirm no console errors occur in any of the above scenarios.

- [ ] **Step 5: Fix any issues found during manual verification**

If the manual pass surfaces a bug, fix it in the relevant file from Tasks 2-5, re-run `npm run test` and `npx tsc --noEmit`, and re-verify in the browser before proceeding.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Verify Phase 3 boot sequence end-to-end"
```

(If nothing changed since Task 5's commit, this step is a no-op — skip the commit if `git status` is clean.)
