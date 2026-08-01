import type { RoomDefinition, RoomId } from '@/types/rooms';

export const ROOM_REGISTRY: Record<RoomId, RoomDefinition> = {
  'load-balancer': {
    id: 'load-balancer',
    name: 'Load Balancer',
    description: 'Incoming requests are distributed across the cluster.',
    position: [0, 0, 0],
    connections: [{ roomId: 'api-gateway', position: [0, 0, -20] }],
    requiresVisited: [],
  },
  'api-gateway': {
    id: 'api-gateway',
    name: 'API Gateway',
    description: 'Requests are routed and rate-limited here.',
    position: [0, 0, -20],
    connections: [{ roomId: 'auth-service', position: [0, 0, -40] }],
    requiresVisited: ['load-balancer'],
  },
  'auth-service': {
    id: 'auth-service',
    name: 'Authentication Service',
    description: 'Requests are authenticated before entering the core system.',
    position: [0, 0, -40],
    connections: [{ roomId: 'about-me', position: [0, 0, -60] }],
    requiresVisited: ['api-gateway'],
  },
  'about-me': {
    id: 'about-me',
    name: 'About Me',
    description: 'A terminal holding cat about.md.',
    position: [0, 0, -60],
    connections: [{ roomId: 'experience-service', position: [20, 0, -60] }],
    requiresVisited: ['auth-service'],
  },
  'experience-service': {
    id: 'experience-service',
    name: 'Experience Service',
    description: 'Each past role, rendered as a microservice.',
    position: [20, 0, -60],
    connections: [{ roomId: 'projects-cluster', position: [40, 0, -60] }],
    requiresVisited: ['about-me'],
  },
  'projects-cluster': {
    id: 'projects-cluster',
    name: 'Projects Cluster',
    description: 'Explorable environments for each shipped project.',
    position: [40, 0, -60],
    connections: [{ roomId: 'skills-dashboard', position: [60, 0, -60] }],
    requiresVisited: ['experience-service'],
  },
  'skills-dashboard': {
    id: 'skills-dashboard',
    name: 'Skills Dashboard',
    description: 'An operations dashboard visualizing skill depth as infrastructure health.',
    position: [60, 0, -60],
    connections: [{ roomId: 'database-layer', position: [60, 0, -80] }],
    requiresVisited: ['projects-cluster'],
  },
  'database-layer': {
    id: 'database-layer',
    name: 'Database Layer',
    description: 'Rows as floating storage blocks; queries and replication visualized.',
    position: [60, 0, -80],
    connections: [{ roomId: 'monitoring-center', position: [60, 0, -100] }],
    requiresVisited: ['skills-dashboard'],
  },
  'monitoring-center': {
    id: 'monitoring-center',
    name: 'Monitoring Center',
    description: 'Live charts of CPU, latency, and errors across the system.',
    position: [60, 0, -100],
    connections: [{ roomId: 'deployment-pipeline', position: [60, 0, -120] }],
    requiresVisited: ['database-layer'],
  },
  'deployment-pipeline': {
    id: 'deployment-pipeline',
    name: 'Deployment Pipeline',
    description: 'Containers deploy through health checks and rolling updates.',
    position: [60, 0, -120],
    connections: [{ roomId: 'contact-gateway', position: [60, 0, -140] }],
    requiresVisited: ['monitoring-center'],
  },
  'contact-gateway': {
    id: 'contact-gateway',
    name: 'Contact Gateway',
    description: 'The final API gateway. Submit a POST request to escape the backend.',
    position: [60, 0, -140],
    connections: [],
    requiresVisited: ['deployment-pipeline'],
  },
};

export function getRoomById(id: RoomId): RoomDefinition {
  const room = ROOM_REGISTRY[id];
  if (!room) {
    throw new Error(`Unknown room id: ${id}`);
  }
  return room;
}

export function isRoomUnlocked(id: RoomId, visited: ReadonlySet<RoomId>): boolean {
  const room = getRoomById(id);
  return room.requiresVisited.every((req) => visited.has(req));
}
