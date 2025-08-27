/**
 * Error normalization utilities for consistent API error handling
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

export interface ValidationError extends ApiError {
  field?: string;
  value?: any;
}

/**
 * Common error codes used throughout the application
 */
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Authentication/Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Business logic errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  
  // Reservation specific
  CAR_NOT_AVAILABLE: 'CAR_NOT_AVAILABLE',
  RESERVATION_OVERLAP: 'RESERVATION_OVERLAP',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

/**
 * User-friendly error messages mapped to error codes
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
  [ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_CODES.UNAUTHORIZED]: 'You need to log in to access this resource.',
  [ERROR_CODES.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ERROR_CODES.REQUIRED_FIELD]: 'This field is required.',
  [ERROR_CODES.INVALID_FORMAT]: 'Please enter a valid value.',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.RESOURCE_CONFLICT]: 'This action conflicts with existing data.',
  [ERROR_CODES.BUSINESS_RULE_VIOLATION]: 'This action violates business rules.',
  [ERROR_CODES.CAR_NOT_AVAILABLE]: 'The selected car is not available for the chosen dates.',
  [ERROR_CODES.RESERVATION_OVERLAP]: 'The selected dates overlap with an existing reservation.',
  [ERROR_CODES.INVALID_DATE_RANGE]: 'Please select a valid date range.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [ERROR_CODES.SERVER_ERROR]: 'A server error occurred. Please try again later.',
} as const;

/**
 * Normalizes various error types into a consistent ApiError format
 */
export function normalizeError(error: any): ApiError {
  // Handle network errors
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return {
      message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
      code: ERROR_CODES.NETWORK_ERROR,
      status: 0,
    };
  }

  // Handle timeout errors
  if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
    return {
      message: ERROR_MESSAGES[ERROR_CODES.TIMEOUT],
      code: ERROR_CODES.TIMEOUT,
      status: 0,
    };
  }

  // Handle openapi-fetch errors (from our API client)
  if (error?.response) {
    const status = error.response.status;
    const responseData = error.response.data || error.data;

    // Extract message from various response formats
    let message = 'An error occurred';
    let code = ERROR_CODES.UNKNOWN_ERROR;
    let details = {};

    if (responseData) {
      // Spring Boot validation errors typically have this structure
      if (responseData.message) {
        message = responseData.message;
      } else if (responseData.error) {
        message = responseData.error;
      } else if (responseData.title) {
        message = responseData.title;
      }

      // Extract validation details if present
      if (responseData.violations || responseData.fieldErrors) {
        details = responseData.violations || responseData.fieldErrors;
        code = ERROR_CODES.VALIDATION_ERROR;
      }

      // Extract error code if present
      if (responseData.code) {
        code = responseData.code;
      }
    }

    // Map HTTP status codes to error codes
    switch (status) {
      case 400:
        code = code === ERROR_CODES.UNKNOWN_ERROR ? ERROR_CODES.VALIDATION_ERROR : code;
        break;
      case 401:
        code = ERROR_CODES.UNAUTHORIZED;
        message = ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED];
        break;
      case 403:
        code = ERROR_CODES.FORBIDDEN;
        message = ERROR_MESSAGES[ERROR_CODES.FORBIDDEN];
        break;
      case 404:
        code = ERROR_CODES.RESOURCE_NOT_FOUND;
        message = ERROR_MESSAGES[ERROR_CODES.RESOURCE_NOT_FOUND];
        break;
      case 409:
        code = ERROR_CODES.RESOURCE_CONFLICT;
        // Keep the original message for conflicts as it's usually specific
        break;
      case 422:
        code = ERROR_CODES.BUSINESS_RULE_VIOLATION;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = ERROR_CODES.SERVER_ERROR;
        message = ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR];
        break;
    }

    return {
      message,
      code,
      status,
      details: Object.keys(details).length > 0 ? details : undefined,
    };
  }

  // Handle JavaScript Error objects
  if (error instanceof Error) {
    return {
      message: error.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
      code: ERROR_CODES.UNKNOWN_ERROR,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      code: ERROR_CODES.UNKNOWN_ERROR,
    };
  }

  // Handle objects with message property
  if (error?.message) {
    return {
      message: error.message,
      code: error.code || ERROR_CODES.UNKNOWN_ERROR,
      status: error.status,
      details: error.details,
    };
  }

  // Fallback for unknown error types
  return {
    message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    code: ERROR_CODES.UNKNOWN_ERROR,
  };
}

/**
 * Extracts validation errors from an ApiError and returns them in a format
 * suitable for form libraries like React Hook Form
 */
export function extractValidationErrors(error: ApiError): Record<string, string> {
  const validationErrors: Record<string, string> = {};

  if (error.details && typeof error.details === 'object') {
    // Handle Spring Boot validation error format
    if (Array.isArray(error.details)) {
      error.details.forEach((violation: any) => {
        if (violation.field && violation.message) {
          validationErrors[violation.field] = violation.message;
        }
      });
    } else {
      // Handle object format where keys are field names
      Object.entries(error.details).forEach(([field, message]) => {
        if (typeof message === 'string') {
          validationErrors[field] = message;
        }
      });
    }
  }

  return validationErrors;
}

/**
 * Checks if an error is a validation error
 */
export function isValidationError(error: ApiError): boolean {
  return error.code === ERROR_CODES.VALIDATION_ERROR || 
         (error.status === 400 && error.details !== undefined);
}

/**
 * Checks if an error is a network-related error
 */
export function isNetworkError(error: ApiError): boolean {
  return error.code === ERROR_CODES.NETWORK_ERROR || 
         error.code === ERROR_CODES.TIMEOUT ||
         error.status === 0;
}

/**
 * Gets a user-friendly error message, falling back to the original message
 * if no mapping exists
 */
export function getErrorMessage(error: ApiError): string {
  if (error.code && error.code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES];
  }
  return error.message;
}
