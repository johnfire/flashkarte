import React from "react";
import { reportClientError } from "../api/client";
import i18n from "../i18n";

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
          <h1 className="text-2xl font-semibold">
            {i18n.t("errorBoundary.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {i18n.t("errorBoundary.body")}
          </p>
          <button
            onClick={this.handleReload}
            className="rounded-lg border border-gray-400 px-5 py-2"
          >
            {i18n.t("errorBoundary.reload")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
