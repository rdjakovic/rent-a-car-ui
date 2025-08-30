import type { CustomerResponseDto } from "@/lib/api/queries";

export interface CustomerValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CustomerValidationOptions {
  requireDriverLicense?: boolean;
  checkLicenseExpiry?: boolean;
}

/**
 * Validates a customer for booking purposes
 * @param customer - The customer to validate
 * @param options - Validation options
 * @returns Validation result with errors if any
 */
export function validateCustomerForBooking(
  customer: CustomerResponseDto | null,
  options: CustomerValidationOptions = {}
): CustomerValidationResult {
  const {
    requireDriverLicense = true,
    checkLicenseExpiry = true,
  } = options;

  const errors: string[] = [];

  if (!customer) {
    errors.push("Customer is required");
    return { isValid: false, errors };
  }

  // Basic required fields
  if (!customer.firstName?.trim()) {
    errors.push("Customer first name is required");
  }

  if (!customer.lastName?.trim()) {
    errors.push("Customer last name is required");
  }

  if (!customer.email?.trim()) {
    errors.push("Customer email is required");
  }

  // Driver license validation
  if (requireDriverLicense) {
    if (!customer.driverLicenseNo?.trim()) {
      errors.push("Customer must have a driver license number");
    } else if (checkLicenseExpiry && customer.licenseExpiryDate) {
      const expiryDate = new Date(customer.licenseExpiryDate);
      const today = new Date();
      
      // Set time to start of day for accurate comparison
      today.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);
      
      if (expiryDate < today) {
        errors.push("Customer's driver license has expired");
      }
    }
  }

  // Email format validation (basic)
  if (customer.email && !isValidEmail(customer.email)) {
    errors.push("Customer email format is invalid");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates if a customer has a valid driver license
 * @param customer - The customer to check
 * @returns True if the customer has a valid, non-expired license
 */
export function hasValidDriverLicense(customer: CustomerResponseDto | null): boolean {
  if (!customer?.driverLicenseNo?.trim()) {
    return false;
  }

  if (customer.licenseExpiryDate) {
    const expiryDate = new Date(customer.licenseExpiryDate);
    const today = new Date();
    
    // Set time to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    
    return expiryDate >= today;
  }

  // If no expiry date is provided, assume license is valid
  return true;
}

/**
 * Gets the primary validation error for display
 * @param customer - The customer to validate
 * @returns The first validation error or null if valid
 */
export function getCustomerValidationError(customer: CustomerResponseDto | null): string | null {
  const result = validateCustomerForBooking(customer);
  return result.errors.length > 0 ? result.errors[0] : null;
}

/**
 * Basic email validation
 * @param email - Email to validate
 * @returns True if email format is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if a customer is eligible for booking
 * @param customer - The customer to check
 * @returns Object with eligibility status and reason if not eligible
 */
export function checkCustomerEligibility(customer: CustomerResponseDto | null): {
  eligible: boolean;
  reason?: string;
} {
  if (!customer) {
    return { eligible: false, reason: "No customer selected" };
  }

  const validation = validateCustomerForBooking(customer);
  if (!validation.isValid) {
    return { eligible: false, reason: validation.errors[0] };
  }

  return { eligible: true };
}