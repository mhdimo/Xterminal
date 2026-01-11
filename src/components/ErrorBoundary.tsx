// ErrorBoundary - React error boundary for catching and displaying errors
// Prevents crashes from taking down the entire app

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e] text-white p-4">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-4 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-[#0078d4] hover:bg-[#106ebe] rounded text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Terminal-specific error boundary with restart option
interface TerminalErrorBoundaryProps {
  children: ReactNode;
  paneId: string;
  onRestart?: () => void;
}

interface TerminalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class TerminalErrorBoundary extends Component<TerminalErrorBoundaryProps, TerminalErrorBoundaryState> {
  constructor(props: TerminalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): TerminalErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[TerminalErrorBoundary:${this.props.paneId}] Caught error:`, error);
    console.error(`[TerminalErrorBoundary:${this.props.paneId}] Error info:`, errorInfo);
  }

  handleRestart = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRestart?.();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-[#0c0c0c] text-white p-4">
          <div className="text-center">
            <div className="text-2xl mb-2">💀</div>
            <p className="text-gray-400 text-sm mb-3">Terminal crashed</p>
            <button
              onClick={this.handleRestart}
              className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-xs transition-colors"
            >
              Restart Terminal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
