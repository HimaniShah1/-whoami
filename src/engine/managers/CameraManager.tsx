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
