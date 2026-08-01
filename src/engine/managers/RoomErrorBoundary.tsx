'use client';

import { Component, type ReactNode } from 'react';
import { Html } from '@react-three/drei';

interface RoomErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[RoomErrorBoundary] Room failed to render:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="w-64 rounded border border-status-error bg-background-elevated p-4 text-center font-mono text-xs text-status-error">
            <p>503 SERVICE UNAVAILABLE</p>
            <p className="mt-1 text-text-muted">This room failed to load.</p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-3 rounded border border-status-error px-3 py-1 text-status-error hover:bg-status-error/10"
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
