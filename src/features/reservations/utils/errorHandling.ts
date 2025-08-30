import type { CustomerResponseDto } from "@/lib/api/queries";

/**
 * Error types for customer selection
 */
export enum CustomerSelectionErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  API_ERROR = "API_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  LICENSE_ERROR = "LICENSE_ERROR",
  REQUIRED_FIELD_ERROR = "REQUIRED_FIELD_ERROR",
}

/**
 * Customer selection error interface
 */
export interface CustomerSelectionError {
  type: CustomerSelectionErrorType;
  message: string;
  field?: string;
  details?: any;
}

/**
 * Creates a validation error
 */
export function createValidationError(
  message: string,
  field?: string
): CustomerSelectionError {
  return {
    type: CustomerSelectionErrorType.VALIDATION_ERROR,
    message,
    field,
  };
}

/**
 * Creates an API error
 */
export function createApiError(
  message: string,
  details?: any
): CustomerSelectionError {
  return {
    type: CustomerSelectionErrorType.API_ERROR,
    message,
    details,
  };
}

/**
 * Creates a network error
 */
export function createNetworkError(
  message: string = "Network error occurred. Please check your connection and try again."
): CustomerSelectionError {
  return {
    type: CustomerSelectionErrorType.NETWORK_ERROR,
    message,
  };
}

/**
 * Creates a license validation error
 */
export function createLicenseError(
  message: string
): CustomerSelectionError {
  return {
    type: CustomerSelectionErrorType.LICENSE_ERROR,
    message,
  };
}

/**
 * Handles customer selection errors and returns user-friendly messages
 */
export function handleCustomerSelectionError(error: unknown): CustomerSelectionError {
  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createNetworkError();
  }

  // Handle API errors
  if (error && typeof error === 'object' && 'message' in error) {
    const apiError = error as { message: string; status?: number };
    
    if (apiError.status === 404) {
      return createApiError("Customer not found");
    }
    
    if (apiError.status === 400) {
      return createApiError("Invalid customer data provided");
    }
    
    if (apiError.status >= 500) {
      return createApiError("Server error occurred. Please try again later.");
    }
    
    return createApiError(apiError.message);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return createValidationError(error);
  }

  // Default error
  return createApiError("An unexpected error occurred. Please try again.");
}

/**
 * Validates customer data and returns specific errors
 */
export function validateCustomerForErrors(customer: CustomerResponseDto | null): CustomerSelectionError[] {
  const errors: CustomerSelectionError[] = [];

  if (!customer) {
    errors.push(createValidationError("Customer is required"));
    return errors;
  }

  // Check required fields
  if (!customer.firstName?.trim()) {
    errors.push(createValidationError("First name is required", "firstName"));
  }

  if (!customer.lastName?.trim()) {
    errors.push(createValidationError("Last name is required", "lastName"));
  }

  if (!customer.email?.trim()) {
    errors.push(createValidationError("Email is required", "email"));
  }

  // Check driver license
  if (!customer.driverLicenseNo?.trim()) {
    errors.push(createLicenseError("Driver license number is required"));
  } else if (customer.licenseExpiryDate) {
    const expiryDate = new Date(customer.licenseExpiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    
    if (expiryDate < today) {
      errors.push(createLicenseError("Driver license has expired"));
    }
  }

  return errors;
}

/**
 * Gets user-friendly error message for display
 */
export function getDisplayErrorMessage(error: CustomerSelectionError): string {
  switch (error.type) {
    case CustomerSelectionErrorType.NETWORK_ERROR:
      return "Connection error. Please check your internet and try again.";
    
    case CustomerSelectionErrorType.API_ERROR:
      return error.message || "Server error occurred. Please try again.";
    
    case CustomerSelectionErrorType.LICENSE_ERROR:
      return `License issue: ${error.message}`;
    
    case CustomerSelectionErrorType.VALIDATION_ERROR:
      return error.message;
    
    case CustomerSelectionErrorType.REQUIRED_FIELD_ERROR:
      return `Required field missing: ${error.message}`;
    
    default:
      return "An error occurred. Please try again.";
  }
}

/**
 * Checks if error is recoverable (user can retry)
 */
export function isRecoverableError(error: CustomerSelectionError): boolean {
  return error.type === CustomerSelectionErrorType.NETWORK_ERROR ||
         error.type === CustomerSelectionErrorType.API_ERROR;
}

/**
 * Groups errors by type for better display
 */
export function groupErrorsByType(errors: CustomerSelectionError[]): Record<CustomerSelectionErrorType, CustomerSelectionError[]> {
  return errors.reduce((groups, error) => {
    if (!groups[error.type]) {
      groups[error.type] = [];
    }
    groups[error.type].push(error);
    return groups;
  }, {} as Record<CustomerSelectionErrorType, CustomerSelectionError[]>);
}