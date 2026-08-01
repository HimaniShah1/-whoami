export type RequestStatus = 'pending' | 'ok' | 'error';
export type RequestProtocol = 'HTTP/1.1' | 'HTTP/2' | 'gRPC';

export interface RequestIdentity {
  requestId: string;
  protocol: RequestProtocol;
  ttl: number;
  latencyMs: number;
  status: RequestStatus;
}
