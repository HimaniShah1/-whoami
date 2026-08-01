import { describe, expect, it } from 'vitest';
import RoomErrorBoundary from './RoomErrorBoundary';

describe('RoomErrorBoundary.getDerivedStateFromError', () => {
  it('flips into the error state when a child throws', () => {
    expect(RoomErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });
});
