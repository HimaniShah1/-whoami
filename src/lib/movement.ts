export function smoothVelocity(
  current: number,
  target: number,
  delta: number,
  responsiveness: number,
): number {
  const t = 1 - Math.exp(-responsiveness * delta);
  return current + (target - current) * t;
}

export function headBobOffset(
  distanceTraveled: number,
  amplitude: number,
  frequency: number,
): number {
  return Math.sin(distanceTraveled * frequency) * amplitude;
}

export function applyGravity(velocityY: number, delta: number, gravity: number): number {
  return velocityY - gravity * delta;
}
