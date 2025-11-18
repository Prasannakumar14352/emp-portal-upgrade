import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { setAuthLoadingCallback } from '@/utils/tokenManager';

interface AuthLoadingContextType {
  isLoading: boolean;
  message: string;
  setLoading: (loading: boolean, message?: string) => void;
}

const AuthLoadingContext = createContext<AuthLoadingContextType | undefined>(undefined);

export function AuthLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const setLoading = (loading: boolean, loadingMessage?: string) => {
    setIsLoading(loading);
    setMessage(loadingMessage || '');
  };

  // Set up the callback for tokenManager to use
  useEffect(() => {
    setAuthLoadingCallback(setLoading);
    return () => {
      setAuthLoadingCallback(() => {});
    };
  }, []);

  return (
    <AuthLoadingContext.Provider value={{ isLoading, message, setLoading }}>
      {children}
    </AuthLoadingContext.Provider>
  );
}

export function useAuthLoading() {
  const context = useContext(AuthLoadingContext);
  if (context === undefined) {
    throw new Error('useAuthLoading must be used within an AuthLoadingProvider');
  }
  return context;
}
