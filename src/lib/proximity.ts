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
