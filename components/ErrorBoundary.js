"use client";
import React from "react";
import { AlertOctagon, RefreshCw, ChevronDown, ChevronUp, Terminal } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Error caught by boundary - handle silently in production
  }

  componentDidUpdate(prevProps) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "An unexpected error occurred.";

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
          <div className="relative w-full max-w-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-purple-500/5 overflow-hidden transition-all duration-300 hover:border-purple-500/20">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 mb-6 animate-pulse">
                <AlertOctagon className="h-6 w-6 text-red-400" />
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 mb-2">
                Something went wrong
              </h2>
              
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-md mx-auto">
                An error occurred while rendering this section of the application. You can try retrying the component or reloading the page.
              </p>

              {/* Collapsible Diagnostic Details */}
              <div className="border border-white/5 bg-slate-950/80 rounded-2xl overflow-hidden mb-6 transition-all duration-300">
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors border-b border-white/5 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-purple-400" />
                    Diagnostic Details
                  </span>
                  {this.state.showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                
                {this.state.showDetails && (
                  <div className="p-4 space-y-3 text-left">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-red-400">Error Message</span>
                      <pre className="mt-1 text-xs text-red-300 bg-red-950/20 p-2.5 rounded-lg border border-red-900/30 overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed">
                        {errorMessage}
                      </pre>
                    </div>
                    
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Component Stack</span>
                        <pre className="mt-1 text-[10px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-white/5 overflow-x-auto overflow-y-auto max-h-48 font-mono whitespace-pre leading-relaxed scrollbar-thin">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Section */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-600/20 hover:scale-105 hover:shadow-purple-600/40 hover:brightness-110 active:scale-95 transition-all duration-300 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Component
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-200 font-semibold hover:bg-slate-700/80 hover:text-white hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
