import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApoptoAuth } from '../../authContext.jsx';
import ErrorState from '../app/ErrorState';
import LoadingState from '../app/LoadingState';

type ProtectedRouteProps = {
  children: ReactNode;
};

type AuthContext = {
  error?: Error;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  login: (returnTo?: string) => void;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    error,
    isAuthenticated,
    isConfigured,
    isLoading,
    login,
  } = useApoptoAuth() as AuthContext;
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (isConfigured && !isLoading && !isAuthenticated && !error) {
      login(returnTo);
    }
  }, [error, isAuthenticated, isConfigured, isLoading, login, returnTo]);

  if (!isConfigured) {
    return (
      <ErrorState
        message="Customer login is not configured for this environment yet."
        title="Sign in is not available."
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        title="Authentication needs attention."
      />
    );
  }

  if (isLoading || !isAuthenticated) {
    return (
      <LoadingState
        message="Opening secure customer access."
        title="Checking your session."
      />
    );
  }

  return children;
}
