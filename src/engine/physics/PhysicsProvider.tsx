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
