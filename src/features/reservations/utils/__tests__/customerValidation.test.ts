import { describe, it, expect } from 'vitest';
import {
  validateCustomerForBooking,
  hasValidDriverLicense,
  getCustomerValidationError,
  checkCustomerEligibility,
} from '../customerValidation';
import type { CustomerResponseDto } from '@/lib/api/queries';

// Mock customer data for testing
const createMockCustomer = (overrides: Partial<CustomerResponseDto> = {}): CustomerResponseDto => ({
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  driverLicenseNo: 'DL123456789',
  dateOfBirth: '1990-01-01',
  address: '123 Main St',
  city: 'New York',
  country: 'US',
  licenseExpiryDate: '2025-12-31',
  fullName: 'John Doe',
  ...overrides,
});

describe('customerValidation', () => {
  describe('validateCustomerForBooking', () => {
    it('should return valid for a complete customer', () => {
      const customer = createMockCustomer();
      const result = validateCustomerForBooking(customer);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when customer is null', () => {
      const result = validateCustomerForBooking(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer is required');
    });

    it('should validate required fields', () => {
      const customer = createMockCustomer({
        firstName: '',
        lastName: '',
        email: '',
      });
      
      const result = validateCustomerForBooking(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer first name is required');
      expect(result.errors).toContain('Customer last name is required');
      expect(result.errors).toContain('Customer email is required');
    });

    it('should validate driver license requirement', () => {
      const customer = createMockCustomer({
        driverLicenseNo: '',
      });
      
      const result = validateCustomerForBooking(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer must have a driver license number');
    });

    it('should validate license expiry date', () => {
      const customer = createMockCustomer({
        licenseExpiryDate: '2020-01-01', // Expired date
      });
      
      const result = validateCustomerForBooking(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Customer's driver license has expired");
    });

    it('should validate email format', () => {
      const customer = createMockCustomer({
        email: 'invalid-email',
      });
      
      const result = validateCustomerForBooking(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer email format is invalid');
    });

    it('should allow valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        const customer = createMockCustomer({ email });
        const result = validateCustomerForBooking(customer);
        
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle whitespace in required fields', () => {
      const customer = createMockCustomer({
        firstName: '   ',
        lastName: '\t',
        email: ' \n ',
        driverLicenseNo: '  ',
      });
      
      const result = validateCustomerForBooking(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer first name is required');
      expect(result.errors).toContain('Customer last name is required');
      expect(result.errors).toContain('Customer email is required');
      expect(result.errors).toContain('Customer must have a driver license number');
    });

    it('should respect validation options', () => {
      const customer = createMockCustomer({
        driverLicenseNo: '',
      });
      
      // Disable driver license requirement
      const result = validateCustomerForBooking(customer, {
        requireDriverLicense: false,
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain('Customer must have a driver license number');
    });

    it('should respect license expiry check option', () => {
      const customer = createMockCustomer({
        licenseExpiryDate: '2020-01-01', // Expired
      });
      
      // Disable expiry check
      const result = validateCustomerForBooking(customer, {
        checkLicenseExpiry: false,
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain("Customer's driver license has expired");
    });
  });

  describe('hasValidDriverLicense', () => {
    it('should return true for customer with valid license', () => {
      const customer = createMockCustomer();
      expect(hasValidDriverLicense(customer)).toBe(true);
    });

    it('should return false for customer without license number', () => {
      const customer = createMockCustomer({
        driverLicenseNo: '',
      });
      expect(hasValidDriverLicense(customer)).toBe(false);
    });

    it('should return false for customer with expired license', () => {
      const customer = createMockCustomer({
        licenseExpiryDate: '2020-01-01',
      });
      expect(hasValidDriverLicense(customer)).toBe(false);
    });

    it('should return true for customer with no expiry date', () => {
      const customer = createMockCustomer({
        licenseExpiryDate: undefined,
      });
      expect(hasValidDriverLicense(customer)).toBe(true);
    });

    it('should return false for null customer', () => {
      expect(hasValidDriverLicense(null)).toBe(false);
    });

    it('should handle edge case of license expiring today', () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      const customer = createMockCustomer({
        licenseExpiryDate: todayString,
      });
      
      expect(hasValidDriverLicense(customer)).toBe(true);
    });

    it('should handle whitespace in license number', () => {
      const customer = createMockCustomer({
        driverLicenseNo: '   ',
      });
      expect(hasValidDriverLicense(customer)).toBe(false);
    });
  });

  describe('getCustomerValidationError', () => {
    it('should return null for valid customer', () => {
      const customer = createMockCustomer();
      expect(getCustomerValidationError(customer)).toBeNull();
    });

    it('should return first error for invalid customer', () => {
      const customer = createMockCustomer({
        firstName: '',
        lastName: '',
      });
      
      const error = getCustomerValidationError(customer);
      expect(error).toBe('Customer first name is required');
    });

    it('should return customer required error for null customer', () => {
      const error = getCustomerValidationError(null);
      expect(error).toBe('Customer is required');
    });
  });

  describe('checkCustomerEligibility', () => {
    it('should return eligible for valid customer', () => {
      const customer = createMockCustomer();
      const result = checkCustomerEligibility(customer);
      
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return not eligible for null customer', () => {
      const result = checkCustomerEligibility(null);
      
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('No customer selected');
    });

    it('should return not eligible with reason for invalid customer', () => {
      const customer = createMockCustomer({
        driverLicenseNo: '',
      });
      
      const result = checkCustomerEligibility(customer);
      
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Customer must have a driver license number');
    });

    it('should return not eligible for expired license', () => {
      const customer = createMockCustomer({
        licenseExpiryDate: '2020-01-01',
      });
      
      const result = checkCustomerEligibility(customer);
      
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe("Customer's driver license has expired");
    });
  });

  describe('date handling', () => {
    it('should correctly compare dates at start of day', () => {
      // Test that time of day doesn't affect date comparison
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999); // End of day
      
      const customer = createMockCustomer({
        licenseExpiryDate: tomorrow.toISOString().split('T')[0],
      });
      
      expect(hasValidDriverLicense(customer)).toBe(true);
    });

    it('should handle invalid date strings gracefully', () => {
      const customer = createMockCustomer({
        licenseExpiryDate: 'invalid-date',
      });
      
      // Should not throw error, but license should be considered invalid
      expect(() => hasValidDriverLicense(customer)).not.toThrow();
      expect(hasValidDriverLicense(customer)).toBe(false);
    });
  });
});