import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Hud from './Hud';
import { useGameStore } from '@/engine/state/useGameStore';

describe('Hud', () => {
  it("shows the current room's name, protocol, TTL, and status", () => {
    render(<Hud />);

    const { requestId } = useGameStore.getState();
    expect(screen.getByText(new RegExp(requestId))).toBeInTheDocument();
    expect(screen.getByText('LOAD BALANCER')).toBeInTheDocument();
    expect(screen.getByText('HTTP/2')).toBeInTheDocument();
    expect(screen.getByText('TTL 64')).toBeInTheDocument();
    expect(screen.getByText('STATUS PENDING')).toBeInTheDocument();
  });
});
