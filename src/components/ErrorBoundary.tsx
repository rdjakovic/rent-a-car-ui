import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Global error boundary that catches JavaScript errors anywhere in the component tree
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    
    // Here you could send error reports to a service like Sentry
    // reportError(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Error details (development only):
                  </p>
                  <pre className="text-xs text-muted-foreground overflow-auto">
                    {this.state.error.message}
                  </pre>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Query error boundary that specifically handles TanStack Query errors
 * and provides reset functionality
 */
export const QueryErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallback={
            <div className="min-h-screen flex items-center justify-center p-4">
              <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <CardTitle>Data Loading Error</CardTitle>
                  <CardDescription>
                    There was a problem loading the data. Please try again.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={reset} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </div>
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

export default ErrorBoundary;
