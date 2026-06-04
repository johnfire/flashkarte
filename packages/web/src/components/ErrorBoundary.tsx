import React from "react";
import { reportClientError } from "../api/client";

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportClientError({
      message: error.message,
      stack: error.stack,
      context: info.componentStack ?? undefined,
    });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-gray-500">
            The error was reported. Try reloading the page.
          </p>
          <button
            onClick={this.handleReload}
            className="rounded-lg border border-gray-400 px-5 py-2"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
