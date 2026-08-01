import { useEffect, useRef, type MutableRefObject } from 'react';

export interface KeyboardState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  interact: boolean;
}

const KEY_MAP: Record<string, keyof KeyboardState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  Space: 'jump',
  KeyE: 'interact',
};

function createEmptyState(): KeyboardState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    interact: false,
  };
}

export function useKeyboardControls(): MutableRefObject<KeyboardState> {
  const state = useRef<KeyboardState>(createEmptyState());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = KEY_MAP[event.code];
      if (action) state.current[action] = true;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const action = KEY_MAP[event.code];
      if (action) state.current[action] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return state;
}
