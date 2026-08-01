'use client';

import { Component, type ReactNode } from 'react';
import { Html } from '@react-three/drei';

interface RoomErrorBoundaryProps {
  children: ReactNode;
}

interface RoomErrorBoundaryState {
  hasError: boolean;
}

export default class RoomErrorBoundary extends Component<
  RoomErrorBoundaryProps,
  RoomErrorBoundaryState
> {
  state: RoomErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RoomErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="w-64 rounded border border-[#ff5f56] bg-[#12161f] p-4 text-center font-mono text-xs text-[#ff5f56]">
            <p>503 SERVICE UNAVAILABLE</p>
            <p className="mt-1 text-[#8fa3b8]">This room failed to load.</p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-3 rounded border border-[#ff5f56] px-3 py-1 text-[#ff5f56] hover:bg-[#ff5f56]/10"
            >
              Retry
            </button>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}
