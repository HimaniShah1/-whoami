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
