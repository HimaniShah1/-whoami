import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useKeyboardControls } from './useKeyboardControls';

function dispatchKey(type: 'keydown' | 'keyup', code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
}

describe('useKeyboardControls', () => {
  it('starts with every action false', () => {
    const { result } = renderHook(() => useKeyboardControls());
    expect(result.current.current).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      interact: false,
    });
  });

  it('sets forward true on KeyW down and false on KeyW up', () => {
    const { result } = renderHook(() => useKeyboardControls());

    dispatchKey('keydown', 'KeyW');
    expect(result.current.current.forward).toBe(true);

    dispatchKey('keyup', 'KeyW');
    expect(result.current.current.forward).toBe(false);
  });

  it('treats ArrowUp as an alias for forward', () => {
    const { result } = renderHook(() => useKeyboardControls());

    dispatchKey('keydown', 'ArrowUp');
    expect(result.current.current.forward).toBe(true);
  });

  it('ignores unmapped keys', () => {
    const { result } = renderHook(() => useKeyboardControls());

    dispatchKey('keydown', 'KeyQ');
    expect(result.current.current).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      interact: false,
    });
  });

  it('resets all keys to false when the window loses focus', () => {
    const { result } = renderHook(() => useKeyboardControls());

    dispatchKey('keydown', 'KeyW');
    expect(result.current.current.forward).toBe(true);

    window.dispatchEvent(new Event('blur'));

    expect(result.current.current).toEqual({
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      interact: false,
    });
  });
});
