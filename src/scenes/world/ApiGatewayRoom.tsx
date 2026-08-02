import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import RoomShell from './shared/RoomShell';
import Terminal from './shared/Terminal';

const API_GATEWAY_LINES = [
  'cat gateway-notes.md',
  '',
  'Past the load balancer, every request funnels through one gateway',
  'before it touches anything real. Three jobs happen here.',
  '',
  'Routing: match the request path to the right internal service.',
  'Nobody calling this API needs to know there are a dozen',
  'microservices behind it.',
  '',
  'Rate limiting: cap how many requests a client can make per window.',
  "Not punishment — it's what keeps one noisy client from taking the",
  'whole system down for everyone else.',
  '',
  'Auth is checked next, but not solved here — this gateway just',
  'forwards the request onward with its credentials attached.',
  "Verifying them is somebody else's job.",
  '',
  'Next stop: Authentication.',
];

const PILLAR_POSITIONS: [number, number, number][] = [
  [-2.5, 1.5, 0],
  [2.5, 1.5, 0],
];

export default function ApiGatewayRoom() {
  return (
    <RoomShell roomId="api-gateway" showLabel={false}>
      {PILLAR_POSITIONS.map((position, index) => (
        <RigidBody key={index} type="fixed" colliders="cuboid" position={position}>
          <mesh castShadow>
            <boxGeometry args={[0.6, 3, 0.6]} />
            <meshStandardMaterial color={colors.rackFrame} metalness={0.5} roughness={0.5} />
          </mesh>
        </RigidBody>
      ))}
      <Terminal
        id="api-gateway-term"
        title="gateway-notes.md"
        lines={API_GATEWAY_LINES}
        position={[0, 1.6, 0]}
      />
    </RoomShell>
  );
}
