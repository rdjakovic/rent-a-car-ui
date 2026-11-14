/**
 * Error normalization utilities for consistent API error handling
 */

/** A field error from the backend's validation problem details ({ field, message }). */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Every failed API call throws an ApiError (see request() in queries.ts). `message` is ready to show:
 * the backend's own reason (problem detail) where it has one, a friendly text otherwise.
 */
export class ApiError extends Error {
  /** HTTP status; 0 for network errors and timeouts */
  readonly status?: number;
  readonly code?: string;
  /** Problem detail title and detail as sent by the backend */
  readonly title?: string;
  readonly detail?: string;
  /** Field errors for validation failures */
  readonly details?: FieldError[] | Record<string, any>;

  constructor(init: { message: string; status?: number; code?: string; title?: string; detail?: string; details?: FieldError[] | Record<string, any> }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.title = init.title;
    this.detail = init.detail;
    this.details = init.details;
  }
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

/** Error code for an HTTP status. */
function codeForStatus(status: number): string {
  if (status === 401) return ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return ERROR_CODES.FORBIDDEN;
  if (status === 404) return ERROR_CODES.RESOURCE_NOT_FOUND;
  if (status === 409) return ERROR_CODES.RESOURCE_CONFLICT;
  if (status === 422) return ERROR_CODES.BUSINESS_RULE_VIOLATION;
  if (status === 400) return ERROR_CODES.VALIDATION_ERROR;
  if (status >= 500) return ERROR_CODES.SERVER_ERROR;
  return ERROR_CODES.UNKNOWN_ERROR;
}

/**
 * Builds the ApiError for a failed response. `body` is what openapi-fetch returns as `error`:
 * the problem details ({ title, status, detail, errors? }) or an empty string when there is no body
 * (e.g. a 403 from the security chain).
 */
export function apiErrorFromResponse(status: number, body: unknown): ApiError {
  const problem = (body && typeof body === "object" ? body : {}) as {
    title?: string; detail?: string; message?: string; errors?: FieldError[];
  };
  const fieldErrors = Array.isArray(problem.errors)
    ? problem.errors.filter((e) => e && typeof e.message === "string")
    : undefined;
  const code = codeForStatus(status);

  let message: string;
  if (status === 401 || status === 403) {
    message = ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES];
  } else if (status >= 500) {
    message = ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR];
  } else if (fieldErrors?.length) {
    message = fieldErrors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join("; ");
  } else {
    // The backend's own reason, e.g. "Car is not available for the selected dates"
    message = problem.detail || problem.message || problem.title
      || ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
  }

  return new ApiError({
    message,
    status,
    code,
    title: problem.title,
    detail: problem.detail,
    details: fieldErrors?.length ? fieldErrors : undefined,
  });
}

/**
 * Normalizes anything thrown into an ApiError: ApiErrors pass through, problem details
 * ({ status, title/detail }) become ApiErrors, fetch failures become network errors (status 0).
 */
export function normalizeError(error: any): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  // Network errors (fetch rejects with a TypeError)
  if (error?.name === 'TypeError' && /fetch|network/i.test(error?.message ?? '')) {
    return new ApiError({
      message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
      code: ERROR_CODES.NETWORK_ERROR,
      status: 0,
    });
  }

  // Timeouts
  if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
    return new ApiError({
      message: ERROR_MESSAGES[ERROR_CODES.TIMEOUT],
      code: ERROR_CODES.TIMEOUT,
      status: 0,
    });
  }

  // Problem details or { status, ... } objects
  if (error && typeof error === 'object' && typeof error.status === 'number' && !(error instanceof Error)) {
    return apiErrorFromResponse(error.status, error);
  }

  // JavaScript Error objects
  if (error instanceof Error) {
    return new ApiError({
      message: error.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
      code: ERROR_CODES.UNKNOWN_ERROR,
    });
  }

  // String errors
  if (typeof error === 'string' && error) {
    return new ApiError({ message: error, code: ERROR_CODES.UNKNOWN_ERROR });
  }

  // Objects with a message property
  if (error?.message) {
    return new ApiError({
      message: error.message,
      code: error.code || ERROR_CODES.UNKNOWN_ERROR,
      status: error.status,
      details: error.details,
    });
  }

  return new ApiError({
    message: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    code: ERROR_CODES.UNKNOWN_ERROR,
  });
}

/** Message to show for anything thrown by an API call. */
export function errorMessage(error: unknown): string {
  return normalizeError(error).message;
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
 * Gets a user-friendly error message: the error's own message (already the backend's reason or a
 * friendly text), falling back to the generic text for its code
 */
export function getErrorMessage(error: ApiError): string {
  if (error.message) {
    return error.message;
  }
  return ERROR_MESSAGES[(error.code ?? ERROR_CODES.UNKNOWN_ERROR) as keyof typeof ERROR_MESSAGES]
    ?? ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}
