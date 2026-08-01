export function buildBootScript(requestId: string, protocol: string, ttl: number): string[] {
  return [
    'Incoming request...',
    `Assigning request ID: ${requestId}`,
    `Protocol negotiated: ${protocol}`,
    `TTL allocated: ${ttl}`,
    'Performing TLS handshake... OK',
    'Allocating worker... OK',
    'Connecting to cluster... OK',
    'Authenticating... OK',
    'Loading services...',
    'Backend ready.',
  ];
}
