export type RoomId =
  | 'load-balancer'
  | 'api-gateway'
  | 'auth-service'
  | 'about-me'
  | 'experience-service'
  | 'projects-cluster'
  | 'skills-dashboard'
  | 'database-layer'
  | 'monitoring-center'
  | 'deployment-pipeline'
  | 'contact-gateway';

export interface RoomConnection {
  roomId: RoomId;
  position: [number, number, number];
}

export interface RoomDefinition {
  id: RoomId;
  name: string;
  description: string;
  position: [number, number, number];
  connections: RoomConnection[];
  requiresVisited: RoomId[];
}
