import { toast } from "@/hooks/use-toast";

export interface AuthError {
  code: string;
  message: string;
  shouldRedirect?: boolean;
}

/**
 * Maps technical error messages to user-friendly messages
 */
export function getAuthErrorMessage(error: any): AuthError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the server. Please check your internet connection.',
      shouldRedirect: false
    };
  }

  // Parse error response
  const errorMessage = error?.message || error?.error || '';
  const statusCode = error?.status || error?.statusCode;

  // Token-related errors
  if (errorMessage.includes('Token expired') || errorMessage.includes('token expired')) {
    return {
      code: 'TOKEN_EXPIRED',
      message: 'Your session has expired. Please log in again.',
      shouldRedirect: true
    };
  }

  if (errorMessage.includes('Invalid token') || errorMessage.includes('invalid token')) {
    return {
      code: 'INVALID_TOKEN',
      message: 'Your session is invalid. Please log in again.',
      shouldRedirect: true
    };
  }

  if (errorMessage.includes('Access token required') || errorMessage.includes('token required')) {
    return {
      code: 'TOKEN_REQUIRED',
      message: 'Authentication required. Please log in to continue.',
      shouldRedirect: true
    };
  }

  // HTTP status code errors
  if (statusCode === 401) {
    return {
      code: 'UNAUTHORIZED',
      message: 'Your session has expired. Please log in again.',
      shouldRedirect: true
    };
  }

  if (statusCode === 403) {
    // Check for detailed permission error from backend
    const details = error?.response?.data?.details;
    if (details?.message) {
      return {
        code: 'FORBIDDEN',
        message: details.message,
        shouldRedirect: false
      };
    }
    
    return {
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action.',
      shouldRedirect: false
    };
  }

  if (statusCode === 404) {
    return {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      shouldRedirect: false
    };
  }

  if (statusCode === 429) {
    return {
      code: 'RATE_LIMIT',
      message: 'Too many requests. Please try again in a few moments.',
      shouldRedirect: false
    };
  }

  if (statusCode >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: 'A server error occurred. Please try again later.',
      shouldRedirect: false
    };
  }

  // Login-specific errors
  if (errorMessage.includes('Invalid credentials') || errorMessage.includes('invalid credentials')) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password. Please try again.',
      shouldRedirect: false
    };
  }

  if (errorMessage.includes('User not found') || errorMessage.includes('user not found')) {
    return {
      code: 'USER_NOT_FOUND',
      message: 'No account found with this email address.',
      shouldRedirect: false
    };
  }

  if (errorMessage.includes('User already exists') || errorMessage.includes('already exists')) {
    return {
      code: 'USER_EXISTS',
      message: 'An account with this email already exists.',
      shouldRedirect: false
    };
  }

  // Refresh token errors
  if (errorMessage.includes('refresh token') || errorMessage.includes('Refresh token')) {
    return {
      code: 'REFRESH_FAILED',
      message: 'Unable to refresh your session. Please log in again.',
      shouldRedirect: true
    };
  }

  // Default error
  return {
    code: 'UNKNOWN_ERROR',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    shouldRedirect: false
  };
}

/**
 * Show user-friendly error toast notification
 */
export function showAuthError(error: any, context?: string) {
  const authError = getAuthErrorMessage(error);
  
  const title = context 
    ? `${context} Failed`
    : authError.shouldRedirect 
      ? 'Session Expired' 
      : 'Error';

  toast({
    title,
    description: authError.message,
    variant: "destructive",
  });

  return authError;
}
