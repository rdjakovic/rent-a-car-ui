import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import BookingWizard from '../BookingWizard';
import { useBookingFlowStore } from '@/stores/useBookingFlowStore';
import {
  renderWithProviders,
  waitForText,
  waitForTestId,
  waitForLoadingToComplete,
  waitForStateChange,
  actAsync,
  TEST_TIMEOUTS,
  cleanupMocks,
} from '@/lib/test-utils';
import {
  BookingParamsFactory,
  CustomerFactory,
  TestScenarioFactory,
  MockFunctionsFactory,
  BookingFlowMockFactory,
} from '@/lib/test-factories';

// Mock the API queries
vi.mock('@/lib/api/queries', () => ({
  createReservation: vi.fn(),
  listCustomers: vi.fn().mockResolvedValue({
    content: [],
    totalElements: 0,
    totalPages: 0,
    size: 10,
    number: 0,
  }),
}));

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('BookingWizard', () => {
  beforeEach(() => {
    // Reset store state and mocks before each test
    useBookingFlowStore.getState().reset();
    cleanupMocks(mockNavigate);
  });

  describe('URL parameter initialization', () => {
    it('should show error when no URL parameters are provided', async () => {
      const scenario = TestScenarioFactory.missingParametersScenario();
      
      renderWithProviders(<BookingWizard />, {
        initialEntries: ['/book'],
      });

      // Wait for loading to complete first
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Then check for error messages with enhanced waiting
      await waitForText('Unable to Load Booking', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });
      
      await waitForText('Invalid booking parameters. Please start from the availability search.', {
        timeout: TEST_TIMEOUTS.FAST,
      });
    });

    it('should show error when incomplete URL parameters are provided', async () => {
      const incompleteParams = BookingParamsFactory.createMissingDates();
      const urlString = BookingParamsFactory.createUrlString(incompleteParams);
      
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${urlString}`],
      });

      // Wait for loading to complete and error to appear
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await waitForText('Unable to Load Booking', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });
      
      await waitForText('Invalid booking parameters. Please start from the availability search.', {
        timeout: TEST_TIMEOUTS.FAST,
      });
    });

    it('should initialize booking when all required URL parameters are provided', async () => {
      const scenario = TestScenarioFactory.validBookingScenario();
      
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${scenario.urlParams}`],
      });

      // Wait for loading to complete and main content to appear
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await waitForText('Book Your Rental', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Verify no error messages are present
      const { screen } = await import('@testing-library/react');
      expect(screen.queryByText('Unable to Load Booking')).not.toBeInTheDocument();
      
      // Check if booking summary is displayed with correct data using enhanced waiting
      await waitForText(scenario.carDetails.displayName, {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText(scenario.bookingParams.startDate, {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText(scenario.bookingParams.endDate, {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText(`${scenario.expectedDuration} days`, {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText(`$${scenario.expectedCost.toFixed(2)}`, {
        timeout: TEST_TIMEOUTS.FAST,
      });
    });

    it('should handle URL-encoded parameters correctly', async () => {
      const bookingParams = BookingParamsFactory.createValid({
        dailyPrice: 75.50,
        carDisplayName: 'Honda Civic Hybrid',
        carCategory: 'COMPACT',
        branchName: 'Airport Terminal 1',
      });
      const urlString = BookingParamsFactory.createUrlString(bookingParams);
      
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${urlString}`],
      });

      // Wait for loading and initialization
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Verify URL-encoded parameters are decoded correctly
      await waitForText('Honda Civic Hybrid', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });
      
      // Calculate expected cost (4 days * 75.50 = 302.00)
      const expectedCost = 4 * 75.50;
      await waitForText(`$${expectedCost.toFixed(2)}`, {
        timeout: TEST_TIMEOUTS.FAST,
      });
    });

    it('should provide retry functionality for failed initialization', async () => {
      renderWithProviders(<BookingWizard />, {
        initialEntries: ['/book'],
      });

      // Wait for error state to appear
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await waitForText('Unable to Load Booking', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Find and click retry button with enhanced waiting
      const retryButton = await waitForText(/Retry \(3 attempts left\)/, {
        timeout: TEST_TIMEOUTS.FAST,
      });

      await actAsync(async () => {
        fireEvent.click(retryButton);
      });

      // Wait for retry counter to update
      await waitForText(/Retry \(2 attempts left\)/, {
        timeout: TEST_TIMEOUTS.NORMAL,
      });
    });

    it('should provide navigation to availability search', async () => {
      renderWithProviders(<BookingWizard />, {
        initialEntries: ['/book'],
      });

      // Wait for error state and navigation button
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      const newSearchButton = await waitForText('Start New Search', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await actAsync(async () => {
        fireEvent.click(newSearchButton);
      });

      // Verify navigation was called
      await waitForStateChange(
        () => mockNavigate.mock.calls.length,
        (callCount) => callCount > 0,
        { timeout: TEST_TIMEOUTS.FAST }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('step navigation UI', () => {
    const scenario = TestScenarioFactory.validBookingScenario();

    it('should display correct step indicators', async () => {
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${scenario.urlParams}`],
      });

      // Wait for loading and initialization
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Check for step indicators with enhanced waiting
      await waitForText('1. Customer Selection', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });
      
      await waitForText('2. Review & Confirm', {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText('3. Confirmation', {
        timeout: TEST_TIMEOUTS.FAST,
      });

      // Customer step should be active (blue background)
      const { screen } = await import('@testing-library/react');
      const customerStep = screen.getByText('1. Customer Selection');
      expect(customerStep).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('should show customer selection step content initially', async () => {
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${scenario.urlParams}`],
      });

      // Wait for loading and customer selection content
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await waitForText('Select Customer', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Check for search input with enhanced waiting
      const { screen } = await import('@testing-library/react');
      await waitForStateChange(
        () => screen.queryByPlaceholderText('Search by name, email, phone, or license number...'),
        (element) => element !== null,
        { timeout: TEST_TIMEOUTS.FAST }
      );
    });

    it('should show loading state initially', async () => {
      const loadingScenario = TestScenarioFactory.loadingScenario();
      
      renderWithProviders(<BookingWizard />, {
        initialEntries: ['/book?carId=1'],
      });

      // Should show loading state before error with enhanced waiting
      await waitForText(loadingScenario.expectedLoadingText, {
        timeout: TEST_TIMEOUTS.FAST,
      });
    });
  });

  describe('booking summary display', () => {
    const scenario = TestScenarioFactory.validBookingScenario();

    it('should display booking summary with correct information', async () => {
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${scenario.urlParams}`],
      });

      // Wait for loading and booking summary to appear
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await waitForText('Booking Summary', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Verify all booking details with enhanced waiting
      await waitForText(scenario.carDetails.displayName, {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText(scenario.bookingParams.startDate, {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText(scenario.bookingParams.endDate, {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText(`${scenario.expectedDuration} days`, {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText(`$${scenario.expectedCost.toFixed(2)}`, {
        timeout: TEST_TIMEOUTS.FAST,
      });
    });

    it('should update summary when store state changes', async () => {
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${scenario.urlParams}`],
      });

      // Wait for initial state to load
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await waitForText(`$${scenario.expectedCost.toFixed(2)}`, {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Simulate store state change with enhanced async handling
      await actAsync(async () => {
        const store = useBookingFlowStore.getState();
        store.initializeBooking({
          carDetails: {
            id: 1,
            displayName: 'Updated Car',
            category: 'LUXURY',
            dailyPrice: 100,
            branchName: 'Downtown Branch',
          },
          bookingDetails: {
            carId: 1,
            branchId: 2,
            startDate: '2025-12-01',
            endDate: '2025-12-03',
            dailyPrice: 100,
          },
        });
      });

      // Wait for UI to update with new state
      await waitForText('Updated Car', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });
      
      await waitForText('2 days', {
        timeout: TEST_TIMEOUTS.FAST,
      });
      
      await waitForText('$200.00', { // 2 days * 100
        timeout: TEST_TIMEOUTS.FAST,
      });
    });
  });

  describe('navigation handlers', () => {
    const scenario = TestScenarioFactory.validBookingScenario();

    it('should handle cancel navigation and reset store', async () => {
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${scenario.urlParams}`],
      });

      // Wait for component to load and cancel button to appear
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      const cancelButton = await waitForText('Cancel', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Verify store has data before cancel
      await waitForStateChange(
        () => useBookingFlowStore.getState().carDetails,
        (carDetails) => carDetails !== null,
        { timeout: TEST_TIMEOUTS.FAST }
      );

      const storeBefore = useBookingFlowStore.getState();
      expect(storeBefore.carDetails).not.toBeNull();

      // Click cancel with enhanced async handling
      await actAsync(async () => {
        fireEvent.click(cancelButton);
      });

      // Wait for store to be reset
      await waitForStateChange(
        () => useBookingFlowStore.getState(),
        (state) => state.carDetails === null && state.bookingDetails === null && state.customer === null,
        { timeout: TEST_TIMEOUTS.NORMAL }
      );

      // Verify navigation was called
      await waitForStateChange(
        () => mockNavigate.mock.calls.length,
        (callCount) => callCount > 0,
        { timeout: TEST_TIMEOUTS.FAST }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle step navigation through booking flow', async () => {
      const customer = CustomerFactory.createDefault();
      
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${scenario.urlParams}`],
      });

      // Wait for initial load
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await waitForText('Book Your Rental', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Verify starting at customer step
      await waitForStateChange(
        () => useBookingFlowStore.getState().currentStep,
        (step) => step === 'customer',
        { timeout: TEST_TIMEOUTS.FAST }
      );

      // Simulate customer selection and navigation to review
      await actAsync(async () => {
        const store = useBookingFlowStore.getState();
        store.setCustomer(customer);
        store.nextStep();
      });

      // Wait for step transition and review content
      await waitForStateChange(
        () => useBookingFlowStore.getState().currentStep,
        (step) => step === 'review',
        { timeout: TEST_TIMEOUTS.NORMAL }
      );

      await waitForText('Review Your Booking', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock the initializeFromUrlParams to throw an error
      const originalInitialize = useBookingFlowStore.getState().initializeBooking;
      
      await actAsync(async () => {
        useBookingFlowStore.setState({
          initializeBooking: vi.fn(() => {
            throw new Error('Test initialization error');
          })
        });
      });

      const validParams = BookingParamsFactory.createValid();
      const urlString = BookingParamsFactory.createUrlString(validParams);

      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${urlString}`],
      });

      // Wait for error to appear with enhanced error handling
      await waitForText('Failed to load booking details. Please try again.', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Restore original function
      await actAsync(async () => {
        useBookingFlowStore.setState({ initializeBooking: originalInitialize });
      });
      
      consoleSpy.mockRestore();
    });

    it('should show skeleton loading state', async () => {
      // Reset store to trigger loading state
      await actAsync(async () => {
        useBookingFlowStore.getState().reset();
      });

      const validParams = BookingParamsFactory.createValid();
      const urlString = BookingParamsFactory.createUrlString(validParams);

      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${urlString}`],
      });

      // Check for loading text with enhanced waiting
      await waitForText('Loading booking details...', {
        timeout: TEST_TIMEOUTS.FAST,
      });

      // Check for skeleton loading elements
      await waitForStateChange(
        () => document.querySelector('.animate-pulse'),
        (element) => element !== null,
        { timeout: TEST_TIMEOUTS.FAST }
      );
    });
  });

  describe('booking submission integration', () => {
    const scenario = TestScenarioFactory.validBookingScenario();

    it('should handle successful booking submission', async () => {
      const customer = CustomerFactory.createDefault();
      
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${scenario.urlParams}`],
      });

      // Wait for initial load
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await waitForText('Book Your Rental', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Navigate to review step with customer selected
      await actAsync(async () => {
        const store = useBookingFlowStore.getState();
        store.setCustomer(customer);
        store.nextStep();
      });

      // Wait for review step to load
      await waitForStateChange(
        () => useBookingFlowStore.getState().currentStep,
        (step) => step === 'review',
        { timeout: TEST_TIMEOUTS.NORMAL }
      );

      await waitForText('Review Your Booking', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Verify booking submission button is present
      await waitForText('Confirm Booking', {
        timeout: TEST_TIMEOUTS.FAST,
      });
    });

    it('should show loading states during submission', async () => {
      renderWithProviders(<BookingWizard />, {
        initialEntries: [`/book${scenario.urlParams}`],
      });

      // Wait for initial load
      await waitForLoadingToComplete({
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      await waitForText('Book Your Rental', {
        timeout: TEST_TIMEOUTS.NORMAL,
      });

      // Test that submission loading states are handled by the store
      await actAsync(async () => {
        const store = useBookingFlowStore.getState();
        store.setSubmitting(true);
      });

      // Wait for store state to update
      await waitForStateChange(
        () => useBookingFlowStore.getState().isSubmitting,
        (isSubmitting) => isSubmitting === true,
        { timeout: TEST_TIMEOUTS.FAST }
      );

      const store = useBookingFlowStore.getState();
      expect(store.isSubmitting).toBe(true);
    });
  });
});