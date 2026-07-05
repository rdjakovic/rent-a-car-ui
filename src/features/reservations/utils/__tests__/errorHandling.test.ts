import { describe, it, expect } from 'vitest';
import {
  CustomerSelectionErrorType,
  createValidationError,
  createApiError,
  createNetworkError,
  createLicenseError,
  handleCustomerSelectionError,
  validateCustomerForErrors,
  getDisplayErrorMessage,
  isRecoverableError,
  groupErrorsByType,
} from '../errorHandling';
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

describe('errorHandling', () => {
  describe('error creation functions', () => {
    describe('createValidationError', () => {
      it('should create validation error with message', () => {
        const error = createValidationError('Test validation error');
        
        expect(error.type).toBe(CustomerSelectionErrorType.VALIDATION_ERROR);
        expect(error.message).toBe('Test validation error');
        expect(error.field).toBeUndefined();
      });

      it('should create validation error with field', () => {
        const error = createValidationError('Field error', 'firstName');
        
        expect(error.type).toBe(CustomerSelectionErrorType.VALIDATION_ERROR);
        expect(error.message).toBe('Field error');
        expect(error.field).toBe('firstName');
      });
    });

    describe('createApiError', () => {
      it('should create API error with message', () => {
        const error = createApiError('API error occurred');
        
        expect(error.type).toBe(CustomerSelectionErrorType.API_ERROR);
        expect(error.message).toBe('API error occurred');
        expect(error.details).toBeUndefined();
      });

      it('should create API error with details', () => {
        const details = { status: 400, code: 'INVALID_REQUEST' };
        const error = createApiError('Bad request', details);
        
        expect(error.type).toBe(CustomerSelectionErrorType.API_ERROR);
        expect(error.message).toBe('Bad request');
        expect(error.details).toEqual(details);
      });
    });

    describe('createNetworkError', () => {
      it('should create network error with default message', () => {
        const error = createNetworkError();
        
        expect(error.type).toBe(CustomerSelectionErrorType.NETWORK_ERROR);
        expect(error.message).toBe('Network error occurred. Please check your connection and try again.');
      });

      it('should create network error with custom message', () => {
        const error = createNetworkError('Custom network error');
        
        expect(error.type).toBe(CustomerSelectionErrorType.NETWORK_ERROR);
        expect(error.message).toBe('Custom network error');
      });
    });

    describe('createLicenseError', () => {
      it('should create license error', () => {
        const error = createLicenseError('License expired');
        
        expect(error.type).toBe(CustomerSelectionErrorType.LICENSE_ERROR);
        expect(error.message).toBe('License expired');
      });
    });
  });

  describe('handleCustomerSelectionError', () => {
    it('should handle network/fetch errors', () => {
      const fetchError = new TypeError('fetch failed');
      const error = handleCustomerSelectionError(fetchError);
      
      expect(error.type).toBe(CustomerSelectionErrorType.NETWORK_ERROR);
      expect(error.message).toBe('Network error occurred. Please check your connection and try again.');
    });

    it('should handle 404 API errors', () => {
      const apiError = { message: 'Not found', status: 404 };
      const error = handleCustomerSelectionError(apiError);
      
      expect(error.type).toBe(CustomerSelectionErrorType.API_ERROR);
      expect(error.message).toBe('Customer not found');
    });

    it('should handle 400 API errors', () => {
      const apiError = { message: 'Bad request', status: 400 };
      const error = handleCustomerSelectionError(apiError);
      
      expect(error.type).toBe(CustomerSelectionErrorType.API_ERROR);
      expect(error.message).toBe('Invalid customer data provided');
    });

    it('should handle 500+ API errors', () => {
      const apiError = { message: 'Internal server error', status: 500 };
      const error = handleCustomerSelectionError(apiError);
      
      expect(error.type).toBe(CustomerSelectionErrorType.API_ERROR);
      expect(error.message).toBe('Server error occurred. Please try again later.');
    });

    it('should handle generic API errors', () => {
      const apiError = { message: 'Custom API error', status: 422 };
      const error = handleCustomerSelectionError(apiError);
      
      expect(error.type).toBe(CustomerSelectionErrorType.API_ERROR);
      expect(error.message).toBe('Custom API error');
    });

    it('should handle string errors', () => {
      const stringError = 'String error message';
      const error = handleCustomerSelectionError(stringError);
      
      expect(error.type).toBe(CustomerSelectionErrorType.VALIDATION_ERROR);
      expect(error.message).toBe('String error message');
    });

    it('should handle unknown errors', () => {
      const unknownError = { someProperty: 'value' };
      const error = handleCustomerSelectionError(unknownError);
      
      expect(error.type).toBe(CustomerSelectionErrorType.API_ERROR);
      expect(error.message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should handle null/undefined errors', () => {
      const error1 = handleCustomerSelectionError(null);
      const error2 = handleCustomerSelectionError(undefined);
      
      expect(error1.type).toBe(CustomerSelectionErrorType.API_ERROR);
      expect(error1.message).toBe('An unexpected error occurred. Please try again.');
      
      expect(error2.type).toBe(CustomerSelectionErrorType.API_ERROR);
      expect(error2.message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('validateCustomerForErrors', () => {
    it('should return empty array for valid customer', () => {
      const customer = createMockCustomer();
      const errors = validateCustomerForErrors(customer);
      
      expect(errors).toHaveLength(0);
    });

    it('should return customer required error for null customer', () => {
      const errors = validateCustomerForErrors(null);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(CustomerSelectionErrorType.VALIDATION_ERROR);
      expect(errors[0].message).toBe('Customer is required');
    });

    it('should validate required fields', () => {
      const customer = createMockCustomer({
        firstName: '',
        lastName: '',
        email: '',
      });
      
      const errors = validateCustomerForErrors(customer);
      
      expect(errors).toHaveLength(3);
      expect(errors.find(e => e.field === 'firstName')?.message).toBe('First name is required');
      expect(errors.find(e => e.field === 'lastName')?.message).toBe('Last name is required');
      expect(errors.find(e => e.field === 'email')?.message).toBe('Email is required');
    });

    it('should validate driver license', () => {
      const customer = createMockCustomer({
        driverLicenseNo: '',
      });
      
      const errors = validateCustomerForErrors(customer);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(CustomerSelectionErrorType.LICENSE_ERROR);
      expect(errors[0].message).toBe('Driver license number is required');
    });

    it('should validate license expiry', () => {
      const customer = createMockCustomer({
        licenseExpiryDate: '2020-01-01',
      });
      
      const errors = validateCustomerForErrors(customer);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(CustomerSelectionErrorType.LICENSE_ERROR);
      expect(errors[0].message).toBe('Driver license has expired');
    });

    it('should handle whitespace in required fields', () => {
      const customer = createMockCustomer({
        firstName: '   ',
        lastName: '\t',
        email: ' \n ',
        driverLicenseNo: '  ',
      });
      
      const errors = validateCustomerForErrors(customer);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'firstName')).toBe(true);
      expect(errors.some(e => e.field === 'lastName')).toBe(true);
      expect(errors.some(e => e.field === 'email')).toBe(true);
      expect(errors.some(e => e.type === CustomerSelectionErrorType.LICENSE_ERROR)).toBe(true);
    });
  });

  describe('getDisplayErrorMessage', () => {
    it('should return network error message', () => {
      const error = createNetworkError();
      const message = getDisplayErrorMessage(error);
      
      expect(message).toBe('Connection error. Please check your internet and try again.');
    });

    it('should return API error message', () => {
      const error = createApiError('Custom API error');
      const message = getDisplayErrorMessage(error);
      
      expect(message).toBe('Custom API error');
    });

    it('should return default API error message for empty message', () => {
      const error = createApiError('');
      const message = getDisplayErrorMessage(error);
      
      expect(message).toBe('Server error occurred. Please try again.');
    });

    it('should return license error message', () => {
      const error = createLicenseError('License expired');
      const message = getDisplayErrorMessage(error);
      
      expect(message).toBe('License issue: License expired');
    });

    it('should return validation error message', () => {
      const error = createValidationError('Validation failed');
      const message = getDisplayErrorMessage(error);
      
      expect(message).toBe('Validation failed');
    });

    it('should return required field error message', () => {
      const error = {
        type: CustomerSelectionErrorType.REQUIRED_FIELD_ERROR,
        message: 'First name',
      };
      const message = getDisplayErrorMessage(error);
      
      expect(message).toBe('Required field missing: First name');
    });

    it('should return default message for unknown error type', () => {
      const error = {
        type: 'UNKNOWN_TYPE' as any,
        message: 'Unknown error',
      };
      const message = getDisplayErrorMessage(error);
      
      expect(message).toBe('An error occurred. Please try again.');
    });
  });

  describe('isRecoverableError', () => {
    it('should return true for network errors', () => {
      const error = createNetworkError();
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return true for API errors', () => {
      const error = createApiError('API error');
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return false for validation errors', () => {
      const error = createValidationError('Validation error');
      expect(isRecoverableError(error)).toBe(false);
    });

    it('should return false for license errors', () => {
      const error = createLicenseError('License error');
      expect(isRecoverableError(error)).toBe(false);
    });
  });

  describe('groupErrorsByType', () => {
    it('should group errors by type', () => {
      const errors = [
        createValidationError('Validation 1'),
        createValidationError('Validation 2'),
        createApiError('API error'),
        createLicenseError('License error'),
        createNetworkError('Network error'),
      ];
      
      const grouped = groupErrorsByType(errors);
      
      expect(grouped[CustomerSelectionErrorType.VALIDATION_ERROR]).toHaveLength(2);
      expect(grouped[CustomerSelectionErrorType.API_ERROR]).toHaveLength(1);
      expect(grouped[CustomerSelectionErrorType.LICENSE_ERROR]).toHaveLength(1);
      expect(grouped[CustomerSelectionErrorType.NETWORK_ERROR]).toHaveLength(1);
    });

    it('should handle empty error array', () => {
      const grouped = groupErrorsByType([]);
      
      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it('should handle single error type', () => {
      const errors = [
        createValidationError('Error 1'),
        createValidationError('Error 2'),
        createValidationError('Error 3'),
      ];
      
      const grouped = groupErrorsByType(errors);
      
      expect(Object.keys(grouped)).toHaveLength(1);
      expect(grouped[CustomerSelectionErrorType.VALIDATION_ERROR]).toHaveLength(3);
    });
  });

  describe('error type enum', () => {
    it('should have all expected error types', () => {
      expect(CustomerSelectionErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(CustomerSelectionErrorType.API_ERROR).toBe('API_ERROR');
      expect(CustomerSelectionErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(CustomerSelectionErrorType.LICENSE_ERROR).toBe('LICENSE_ERROR');
      expect(CustomerSelectionErrorType.REQUIRED_FIELD_ERROR).toBe('REQUIRED_FIELD_ERROR');
    });
  });
});