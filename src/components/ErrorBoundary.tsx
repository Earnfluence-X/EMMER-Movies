import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("EMMER ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="text-[#e50914] mb-4" size={56} />
          <h1 className="text-white text-2xl md:text-3xl font-black mb-2">Something went wrong</h1>
          <p className="text-zinc-400 max-w-md mb-1">
            EMMER hit an unexpected snag while loading this page.
          </p>
          {this.state.error && (
            <pre className="text-xs text-zinc-600 mt-2 max-w-md whitespace-pre-wrap break-all">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={this.reset}
              className="flex items-center gap-2 bg-[#e50914] hover:bg-[#f40612] text-white font-bold px-5 py-2.5 rounded-md transition"
            >
              <RefreshCw size={16} /> Try Again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-5 py-2.5 rounded-md transition"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
