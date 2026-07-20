import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { buildClientErrorPayload, logClientError } from '@/lib/clientErrorsLogger';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback; defaults to a brand-consistent error card. */
  fallback?: ReactNode;
  /** Override the logger (tests). Defaults to the real Supabase logger. */
  onError?: (error: unknown, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level React error boundary (PRD §4.11, backlog story 0.9).
 *
 * Captures any unhandled error thrown during render, lifecycle, or in a
 * constructor of a descendant component, and:
 *   1. Renders a calm, brand-consistent fallback (graphics §8.3 / §3).
 *   2. Best-effort posts a `ClientErrorPayload` to `client_errors` via
 *      `logClientError` (table + RLS arrive in Sprint 1).
 *
 * Note: error boundaries do **not** catch errors inside event handlers,
 * inside async callbacks, or during server-side rendering. Those must be
 * routed through `logClientError` directly.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, info);
      return;
    }
    const payload = buildClientErrorPayload(error, { componentStack: info.componentStack });
    void logClientError(payload);
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="mx-auto flex min-h-screen max-w-content items-center justify-center px-4 py-12 md:px-8"
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="rule-gold mb-4 w-16" aria-hidden="true" />
            <h1 className="font-serif text-h1 font-semibold leading-none tracking-tight">
              Something went wrong
            </h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-body-sm text-muted-foreground">
              The page hit an unexpected error and was stopped to keep your data safe. The
              issue has been recorded for the admin team.
            </p>
            <p className="text-body-sm text-muted-foreground">
              You can try reloading the page. If the problem keeps happening, please contact the
              Financial Secretary.
            </p>
            <Button onClick={this.handleReload}>Reload page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
