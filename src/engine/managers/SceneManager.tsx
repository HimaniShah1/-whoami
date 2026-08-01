'use client';

import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react';
import type { RoomId } from '@/types/rooms';
import RoomErrorBoundary from './RoomErrorBoundary';

const ROOM_LOADERS: Partial<Record<RoomId, () => Promise<{ default: ComponentType }>>> = {
  'load-balancer': () => import('@/scenes/world/PlaceholderRoom'),
};

interface SceneManagerProps {
  activeRoomId: RoomId;
}

export default function SceneManager({ activeRoomId }: SceneManagerProps) {
  const [retryCount, setRetryCount] = useState(0);
  const loader = ROOM_LOADERS[activeRoomId];

  // Recreated only when the active room or retryCount changes, never on every
  // render: React.lazy caches its dynamic import() promise forever on a given
  // lazy component instance, so recovering from a failed chunk load requires a
  // fresh lazy() call (and therefore a fresh import() promise), not just
  // resetting the error boundary's local state. retryCount is intentionally
  // in the dependency list purely to force recomputation on retry even though
  // it isn't read inside the factory itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const RoomComponent = useMemo(() => (loader ? lazy(loader) : null), [loader, retryCount]);

  if (!RoomComponent) return null;

  return (
    <Suspense fallback={null}>
      <RoomErrorBoundary key={retryCount} onRetry={() => setRetryCount((count) => count + 1)}>
        {/* eslint-disable-next-line react-hooks/static-components -- intentional:
            a fresh lazy() component is created on retry so a stale cached
            import() rejection isn't replayed; see the useMemo comment above. */}
        <RoomComponent />
      </RoomErrorBoundary>
    </Suspense>
  );
}
