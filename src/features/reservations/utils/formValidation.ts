import { z } from "zod";
import type { CustomerResponseDto } from "@/lib/api/queries";

/**
 * Schema for customer selection validation
 */
export const customerSelectionSchema = z.object({
  customerId: z.number().min(1, "Customer selection is required"),
});

export type CustomerSelectionFormData = z.infer<typeof customerSelectionSchema>;

/**
 * Custom validation for driver license expiry
 */
export const driverLicenseExpiryValidation = z
  .string()
  .optional()
  .refine((date) => {
    if (!date) return true; // Optional field
    const expiryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate >= today;
  }, {
    message: "Driver license must not be expired",
  });

/**
 * Custom validation for driver license number
 */
export const driverLicenseValidation = z
  .string()
  .min(1, "Driver license number is required")
  .min(3, "Driver license number must be at least 3 characters")
  .max(50, "Driver license number must not exceed 50 characters")
  .regex(/^[A-Za-z0-9\-\s]+$/, "Driver license number contains invalid characters");

/**
 * Validates customer data for booking requirements
 */
export function validateCustomerData(customer: Partial<CustomerResponseDto>): {
  isValid: boolean;
  fieldErrors: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};

  // Required fields validation
  if (!customer.firstName?.trim()) {
    fieldErrors.firstName = "First name is required";
  }

  if (!customer.lastName?.trim()) {
    fieldErrors.lastName = "Last name is required";
  }

  if (!customer.email?.trim()) {
    fieldErrors.email = "Email is required";
  } else if (!isValidEmail(customer.email)) {
    fieldErrors.email = "Invalid email format";
  }

  // Driver license validation
  if (!customer.driverLicenseNo?.trim()) {
    fieldErrors.driverLicenseNo = "Driver license number is required";
  } else {
    const licenseResult = driverLicenseValidation.safeParse(customer.driverLicenseNo);
    if (!licenseResult.success) {
      fieldErrors.driverLicenseNo = "Invalid driver license number";
    }
  }

  // License expiry validation
  if (customer.licenseExpiryDate) {
    const expiryResult = driverLicenseExpiryValidation.safeParse(customer.licenseExpiryDate);
    if (!expiryResult.success) {
      fieldErrors.licenseExpiryDate = "Invalid license expiry date";
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

/**
 * Validates required customer fields for booking
 */
export function validateRequiredCustomerFields(customer: CustomerResponseDto | null): string[] {
  const errors: string[] = [];

  if (!customer) {
    errors.push("Customer is required");
    return errors;
  }

  const requiredFields = [
    { field: customer.firstName, name: "First name" },
    { field: customer.lastName, name: "Last name" },
    { field: customer.email, name: "Email" },
    { field: customer.driverLicenseNo, name: "Driver license number" },
  ];

  requiredFields.forEach(({ field, name }) => {
    if (!field?.trim()) {
      errors.push(`${name} is required`);
    }
  });

  return errors;
}

/**
 * Basic email validation helper
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates customer selection for booking flow
 */
export function validateCustomerSelection(customerId: number | null): {
  isValid: boolean;
  error?: string;
} {
  if (!customerId || customerId <= 0) {
    return {
      isValid: false,
      error: "Please select a customer to continue",
    };
  }

  return { isValid: true };
}

/**
 * Error messages for common validation scenarios
 */
export const CUSTOMER_VALIDATION_MESSAGES = {
  REQUIRED: "Customer selection is required",
  NO_LICENSE: "Customer must have a driver license number",
  LICENSE_EXPIRED: "Customer's driver license has expired",
  INVALID_EMAIL: "Customer email format is invalid",
  MISSING_REQUIRED_FIELDS: "Customer is missing required information",
} as const;