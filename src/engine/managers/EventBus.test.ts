import { describe, expect, it, vi } from 'vitest';
import { eventBus } from './EventBus';

describe('eventBus', () => {
  it('delivers the payload to subscribers of room:entered', () => {
    const handler = vi.fn();
    eventBus.on('room:entered', handler);

    eventBus.emit('room:entered', { roomId: 'load-balancer' });

    expect(handler).toHaveBeenCalledWith({ roomId: 'load-balancer' });
    eventBus.off('room:entered', handler);
  });

  it('does not call handlers after they unsubscribe', () => {
    const handler = vi.fn();
    eventBus.on('terminal:command', handler);
    eventBus.off('terminal:command', handler);

    eventBus.emit('terminal:command', { command: 'cat about.md' });

    expect(handler).not.toHaveBeenCalled();
  });
});
