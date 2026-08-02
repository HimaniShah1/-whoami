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
