import { describe, it, expect } from 'vitest';
import {
  customerSelectionSchema,
  driverLicenseExpiryValidation,
  driverLicenseValidation,
  validateCustomerData,
  validateRequiredCustomerFields,
  validateCustomerSelection,
  CUSTOMER_VALIDATION_MESSAGES,
} from '../formValidation';
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
  licenseExpiryDate: '2099-12-31',
  fullName: 'John Doe',
  ...overrides,
});

describe('formValidation', () => {
  describe('customerSelectionSchema', () => {
    it('should validate valid customer ID', () => {
      const result = customerSelectionSchema.safeParse({ customerId: 1 });
      expect(result.success).toBe(true);
    });

    it('should reject zero customer ID', () => {
      const result = customerSelectionSchema.safeParse({ customerId: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative customer ID', () => {
      const result = customerSelectionSchema.safeParse({ customerId: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject missing customer ID', () => {
      const result = customerSelectionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('driverLicenseExpiryValidation', () => {
    it('should accept future dates', () => {
      const futureDate = '2099-12-31';
      const result = driverLicenseExpiryValidation.safeParse(futureDate);
      expect(result.success).toBe(true);
    });

    it('should accept today\'s date', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = driverLicenseExpiryValidation.safeParse(today);
      expect(result.success).toBe(true);
    });

    it('should reject past dates', () => {
      const pastDate = '2020-01-01';
      const result = driverLicenseExpiryValidation.safeParse(pastDate);
      expect(result.success).toBe(false);
    });

    it('should accept undefined (optional field)', () => {
      const result = driverLicenseExpiryValidation.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should accept empty string (optional field)', () => {
      const result = driverLicenseExpiryValidation.safeParse('');
      expect(result.success).toBe(true);
    });
  });

  describe('driverLicenseValidation', () => {
    it('should accept valid license numbers', () => {
      const validLicenses = [
        'DL123456789',
        'ABC-123-DEF',
        'LICENSE 123',
        'A1B2C3D4E5',
        '123456789',
      ];

      validLicenses.forEach(license => {
        const result = driverLicenseValidation.safeParse(license);
        expect(result.success).toBe(true);
      });
    });

    it('should reject empty license number', () => {
      const result = driverLicenseValidation.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject too short license number', () => {
      const result = driverLicenseValidation.safeParse('AB');
      expect(result.success).toBe(false);
    });

    it('should reject too long license number', () => {
      const longLicense = 'A'.repeat(51);
      const result = driverLicenseValidation.safeParse(longLicense);
      expect(result.success).toBe(false);
    });

    it('should reject license numbers with invalid characters', () => {
      const invalidLicenses = [
        'LICENSE@123',
        'LICENSE#123',
        'LICENSE$123',
        'LICENSE%123',
        'LICENSE&123',
        'LICENSE*123',
        'LICENSE+123',
        'LICENSE=123',
      ];

      invalidLicenses.forEach(license => {
        const result = driverLicenseValidation.safeParse(license);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateCustomerData', () => {
    it('should validate complete customer data', () => {
      const customer = createMockCustomer();
      const result = validateCustomerData(customer);
      
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.fieldErrors)).toHaveLength(0);
    });

    it('should validate required fields', () => {
      const customer = createMockCustomer({
        firstName: '',
        lastName: '',
        email: '',
        driverLicenseNo: '',
      });
      
      const result = validateCustomerData(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.firstName).toBe('First name is required');
      expect(result.fieldErrors.lastName).toBe('Last name is required');
      expect(result.fieldErrors.email).toBe('Email is required');
      expect(result.fieldErrors.driverLicenseNo).toBe('Driver license number is required');
    });

    it('should validate email format', () => {
      const customer = createMockCustomer({
        email: 'invalid-email',
      });
      
      const result = validateCustomerData(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.email).toBe('Invalid email format');
    });

    it('should validate driver license format', () => {
      const customer = createMockCustomer({
        driverLicenseNo: 'AB', // Too short
      });
      
      const result = validateCustomerData(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.driverLicenseNo).toBe('Invalid driver license number');
    });

    it('should validate license expiry date', () => {
      const customer = createMockCustomer({
        licenseExpiryDate: '2020-01-01', // Expired
      });
      
      const result = validateCustomerData(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.licenseExpiryDate).toBe('Invalid license expiry date');
    });

    it('should handle whitespace in required fields', () => {
      const customer = createMockCustomer({
        firstName: '   ',
        lastName: '\t',
        email: ' \n ',
      });
      
      const result = validateCustomerData(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.firstName).toBe('First name is required');
      expect(result.fieldErrors.lastName).toBe('Last name is required');
      expect(result.fieldErrors.email).toBe('Email is required');
    });
  });

  describe('validateRequiredCustomerFields', () => {
    it('should return empty array for valid customer', () => {
      const customer = createMockCustomer();
      const errors = validateRequiredCustomerFields(customer);
      
      expect(errors).toHaveLength(0);
    });

    it('should return error for null customer', () => {
      const errors = validateRequiredCustomerFields(null);
      
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('Customer is required');
    });

    it('should validate all required fields', () => {
      const customer = createMockCustomer({
        firstName: '',
        lastName: '',
        email: '',
        driverLicenseNo: '',
      });
      
      const errors = validateRequiredCustomerFields(customer);
      
      expect(errors).toHaveLength(4);
      expect(errors).toContain('First name is required');
      expect(errors).toContain('Last name is required');
      expect(errors).toContain('Email is required');
      expect(errors).toContain('Driver license number is required');
    });

    it('should handle whitespace in fields', () => {
      const customer = createMockCustomer({
        firstName: '   ',
        lastName: '\t',
        email: ' \n ',
        driverLicenseNo: '  ',
      });
      
      const errors = validateRequiredCustomerFields(customer);
      
      expect(errors).toHaveLength(4);
    });
  });

  describe('validateCustomerSelection', () => {
    it('should validate valid customer ID', () => {
      const result = validateCustomerSelection(1);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null customer ID', () => {
      const result = validateCustomerSelection(null);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a customer to continue');
    });

    it('should reject zero customer ID', () => {
      const result = validateCustomerSelection(0);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a customer to continue');
    });

    it('should reject negative customer ID', () => {
      const result = validateCustomerSelection(-1);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please select a customer to continue');
    });
  });

  describe('CUSTOMER_VALIDATION_MESSAGES', () => {
    it('should have all expected message constants', () => {
      expect(CUSTOMER_VALIDATION_MESSAGES.REQUIRED).toBe('Customer selection is required');
      expect(CUSTOMER_VALIDATION_MESSAGES.NO_LICENSE).toBe('Customer must have a driver license number');
      expect(CUSTOMER_VALIDATION_MESSAGES.LICENSE_EXPIRED).toBe("Customer's driver license has expired");
      expect(CUSTOMER_VALIDATION_MESSAGES.INVALID_EMAIL).toBe('Customer email format is invalid');
      expect(CUSTOMER_VALIDATION_MESSAGES.MISSING_REQUIRED_FIELDS).toBe('Customer is missing required information');
    });

    it('should be readonly constants', () => {
      // TypeScript should prevent modification, but we can test the structure
      expect(typeof CUSTOMER_VALIDATION_MESSAGES.REQUIRED).toBe('string');
      expect(typeof CUSTOMER_VALIDATION_MESSAGES.NO_LICENSE).toBe('string');
      expect(typeof CUSTOMER_VALIDATION_MESSAGES.LICENSE_EXPIRED).toBe('string');
      expect(typeof CUSTOMER_VALIDATION_MESSAGES.INVALID_EMAIL).toBe('string');
      expect(typeof CUSTOMER_VALIDATION_MESSAGES.MISSING_REQUIRED_FIELDS).toBe('string');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values gracefully', () => {
      const customer = {
        firstName: undefined,
        lastName: undefined,
        email: undefined,
        driverLicenseNo: undefined,
      } as any;
      
      const result = validateCustomerData(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.firstName).toBe('First name is required');
      expect(result.fieldErrors.lastName).toBe('Last name is required');
      expect(result.fieldErrors.email).toBe('Email is required');
      expect(result.fieldErrors.driverLicenseNo).toBe('Driver license number is required');
    });

    it('should handle null values gracefully', () => {
      const customer = {
        firstName: null,
        lastName: null,
        email: null,
        driverLicenseNo: null,
      } as any;
      
      const result = validateCustomerData(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.fieldErrors.firstName).toBe('First name is required');
      expect(result.fieldErrors.lastName).toBe('Last name is required');
      expect(result.fieldErrors.email).toBe('Email is required');
      expect(result.fieldErrors.driverLicenseNo).toBe('Driver license number is required');
    });
  });
});