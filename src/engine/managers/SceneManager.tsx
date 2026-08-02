'use client';

import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react';
import type { RoomId } from '@/types/rooms';
import RoomErrorBoundary from './RoomErrorBoundary';

const ROOM_LOADERS: Record<RoomId, () => Promise<{ default: ComponentType }>> = {
  'load-balancer': () => import('@/scenes/world/LoadBalancerRoom'),
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
