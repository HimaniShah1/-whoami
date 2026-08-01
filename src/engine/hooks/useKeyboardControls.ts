import { useEffect, useRef, type RefObject } from 'react';

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

export function useKeyboardControls(): RefObject<KeyboardState> {
  const state = useRef<KeyboardState>(createEmptyState());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = KEY_MAP[event.code];
      if (action) state.current[action] = true;
      // Space's default browser behavior is to activate/scroll the focused
      // element. Prevent that for the jump key so it doesn't conflict with
      // focusable UI later — harmless today since nothing is focusable yet.
      if (event.code === 'Space') event.preventDefault();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      const action = KEY_MAP[event.code];
      if (action) state.current[action] = false;
    };
    const handleBlur = () => {
      // If the window loses focus while a key is held (e.g. alt-tab), the
      // matching keyup never fires, leaving that action stuck true forever.
      state.current = createEmptyState();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return state;
}
