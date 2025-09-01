import { vi } from 'vitest';
import {
  BookingParamsFactory,
  CarDetailsFactory,
  CustomerFactory,
  ReservationFactory,
  TestDateFactory,
  MockFunctionsFactory,
  BookingFlowMockFactory,
} from './test-factories';

/**
 * Advanced test scenario builder for complex test cases
 */

export interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<void> | void;
  cleanup: () => Promise<void> | void;
  data: {
    bookingParams?: any;
    carDetails?: any;
    customer?: any;
    reservation?: any;
    urlParams?: string;
    mockState?: any;
    expectedResults?: any;
  };
  mocks: {
    [key: string]: ReturnType<typeof vi.fn>;
  };
  assertions: {
    [key: string]: any;
  };
}

export class TestScenarioBuilder {
  private scenario: Partial<TestScenario> = {
    mocks: {},
    assertions: {},
    data: {},
  };

  constructor(name: string, description?: string) {
    this.scenario.name = name;
    this.scenario.description = description || name;
  }

  /**
   * Add booking parameters to the scenario
   */
  withBookingParams(params: Partial<any> = {}) {
    this.scenario.data!.bookingParams = BookingParamsFactory.createValid(params);
    this.scenario.data!.urlParams = BookingParamsFactory.createUrlString(this.scenario.data!.bookingParams);
    return this;
  }

  /**
   * Add car details to the scenario
   */
  withCarDetails(details: Partial<any> = {}) {
    this.scenario.data!.carDetails = CarDetailsFactory.createDefault(details);
    return this;
  }

  /**
   * Add customer to the scenario
   */
  withCustomer(customer: Partial<any> = {}) {
    this.scenario.data!.customer = CustomerFactory.createDefault(customer);
    return this;
  }

  /**
   * Add reservation to the scenario
   */
  withReservation(reservation: Partial<any> = {}) {
    this.scenario.data!.reservation = ReservationFactory.createDefault(reservation);
    return this;
  }

  /**
   * Add mock store state
   */
  withMockState(stateType: 'initial' | 'withBooking' | 'withCustomer' | 'withReservation' | 'submitting' | 'error', customState?: any) {
    switch (stateType) {
      case 'initial':
        this.scenario.data!.mockState = BookingFlowMockFactory.createInitialState();
        break;
      case 'withBooking':
        this.scenario.data!.mockState = BookingFlowMockFactory.createWithValidBooking(
          this.scenario.data!.carDetails,
          this.scenario.data!.bookingParams
        );
        break;
      case 'withCustomer':
        this.scenario.data!.mockState = BookingFlowMockFactory.createWithCustomer(this.scenario.data!.customer);
        break;
      case 'withReservation':
        this.scenario.data!.mockState = BookingFlowMockFactory.createWithReservation(this.scenario.data!.reservation);
        break;
      case 'submitting':
        this.scenario.data!.mockState = BookingFlowMockFactory.createSubmitting();
        break;
      case 'error':
        this.scenario.data!.mockState = BookingFlowMockFactory.createWithError(customState?.error || 'Test error');
        break;
    }
    return this;
  }

  /**
   * Add mock functions
   */
  withMocks(mockType: 'bookingFlow' | 'router' | 'query' | 'custom', customMocks?: any) {
    switch (mockType) {
      case 'bookingFlow':
        Object.assign(this.scenario.mocks!, MockFunctionsFactory.createBookingFlowMethods());
        break;
      case 'router':
        Object.assign(this.scenario.mocks!, MockFunctionsFactory.createRouterMethods());
        break;
      case 'query':
        Object.assign(this.scenario.mocks!, MockFunctionsFactory.createQueryMocks());
        break;
      case 'custom':
        Object.assign(this.scenario.mocks!, customMocks || {});
        break;
    }
    return this;
  }

  /**
   * Add setup function
   */
  withSetup(setupFn: () => Promise<void> | void) {
    this.scenario.setup = setupFn;
    return this;
  }

  /**
   * Add cleanup function
   */
  withCleanup(cleanupFn: () => Promise<void> | void) {
    this.scenario.cleanup = cleanupFn;
    return this;
  }

  /**
   * Add expected results
   */
  expectResults(results: any) {
    this.scenario.data!.expectedResults = results;
    return this;
  }

  /**
   * Add assertions
   */
  withAssertions(assertions: any) {
    this.scenario.assertions = { ...this.scenario.assertions, ...assertions };
    return this;
  }

  /**
   * Build the complete scenario
   */
  build(): TestScenario {
    return this.scenario as TestScenario;
  }
}

/**
 * Pre-built common scenarios
 */
export class CommonScenarios {
  /**
   * Valid booking flow scenario
   */
  static validBookingFlow() {
    return new TestScenarioBuilder(
      'Valid Booking Flow',
      'Complete booking flow with valid parameters and successful submission'
    )
      .withBookingParams()
      .withCarDetails()
      .withCustomer()
      .withMockState('withBooking')
      .withMocks('bookingFlow')
      .withMocks('router')
      .expectResults({
        shouldShowBookingWizard: true,
        shouldShowCustomerStep: true,
        shouldAllowProgression: true,
      })
      .build();
  }

  /**
   * Missing parameters scenario
   */
  static missingParameters() {
    return new TestScenarioBuilder(
      'Missing Parameters',
      'Booking flow with missing required parameters'
    )
      .withMockState('initial')
      .withMocks('bookingFlow')
      .withMocks('router')
      .expectResults({
        shouldShowError: true,
        errorMessage: 'Missing required booking parameters',
        shouldShowRetryButton: true,
      })
      .build();
  }

  /**
   * Past date scenario
   */
  static pastDateError() {
    const pastDate = TestDateFactory.getPastDateByDays(1);
    const futureDate = TestDateFactory.getFutureDateByDays(3);
    
    return new TestScenarioBuilder(
      'Past Date Error',
      'Booking flow with past start date'
    )
      .withBookingParams({
        startDate: pastDate,
        endDate: futureDate,
      })
      .withMockState('initial')
      .withMocks('bookingFlow')
      .expectResults({
        shouldShowError: true,
        errorMessage: 'Start date cannot be in the past',
      })
      .build();
  }

  /**
   * Loading state scenario
   */
  static loadingState() {
    return new TestScenarioBuilder(
      'Loading State',
      'Booking flow in loading state'
    )
      .withBookingParams()
      .withMockState('initial')
      .withMocks('bookingFlow')
      .withSetup(() => {
        // Simulate slow initialization
        vi.useFakeTimers();
      })
      .withCleanup(() => {
        vi.useRealTimers();
      })
      .expectResults({
        shouldShowLoading: true,
        loadingText: 'Loading booking details...',
      })
      .build();
  }

  /**
   * Submission error scenario
   */
  static submissionError() {
    return new TestScenarioBuilder(
      'Submission Error',
      'Booking flow with submission error'
    )
      .withBookingParams()
      .withCarDetails()
      .withCustomer()
      .withMockState('error')
      .withMocks('bookingFlow')
      .withMocks('router')
      .expectResults({
        shouldShowError: true,
        errorMessage: 'Failed to submit booking',
        shouldAllowRetry: true,
      })
      .build();
  }

  /**
   * Successful submission scenario
   */
  static successfulSubmission() {
    return new TestScenarioBuilder(
      'Successful Submission',
      'Complete booking flow with successful submission'
    )
      .withBookingParams()
      .withCarDetails()
      .withCustomer()
      .withReservation()
      .withMockState('withReservation')
      .withMocks('bookingFlow')
      .withMocks('router')
      .expectResults({
        shouldShowConfirmation: true,
        shouldShowReservationDetails: true,
        shouldAllowNewBooking: true,
      })
      .build();
  }

  /**
   * Step navigation scenario
   */
  static stepNavigation() {
    return new TestScenarioBuilder(
      'Step Navigation',
      'Testing navigation between booking steps'
    )
      .withBookingParams()
      .withCarDetails()
      .withCustomer()
      .withMockState('withBooking')
      .withMocks('bookingFlow')
      .expectResults({
        steps: ['customer', 'review', 'confirmation'],
        shouldAllowForwardNavigation: true,
        shouldAllowBackwardNavigation: true,
      })
      .build();
  }

  /**
   * URL parameter validation scenario
   */
  static urlParameterValidation() {
    return new TestScenarioBuilder(
      'URL Parameter Validation',
      'Testing various URL parameter combinations'
    )
      .withMockState('initial')
      .withMocks('bookingFlow')
      .withMocks('router')
      .expectResults({
        validParams: BookingParamsFactory.createValid(),
        invalidParams: [
          BookingParamsFactory.createMissingCarId(),
          BookingParamsFactory.createMissingBranchId(),
          BookingParamsFactory.createMissingDates(),
        ],
      })
      .build();
  }

  /**
   * Responsive design scenario
   */
  static responsiveDesign() {
    return new TestScenarioBuilder(
      'Responsive Design',
      'Testing responsive behavior across different screen sizes'
    )
      .withBookingParams()
      .withCarDetails()
      .withMockState('withBooking')
      .withMocks('bookingFlow')
      .withSetup(() => {
        // Mock different viewport sizes
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 768,
        });
      })
      .expectResults({
        shouldAdaptToScreenSize: true,
        shouldShowMobileLayout: true,
      })
      .build();
  }

  /**
   * Accessibility scenario
   */
  static accessibility() {
    return new TestScenarioBuilder(
      'Accessibility',
      'Testing accessibility features and keyboard navigation'
    )
      .withBookingParams()
      .withCarDetails()
      .withMockState('withBooking')
      .withMocks('bookingFlow')
      .expectResults({
        shouldHaveProperARIA: true,
        shouldSupportKeyboardNavigation: true,
        shouldHaveProperFocus: true,
      })
      .build();
  }
}

/**
 * Scenario runner utility
 */
export class ScenarioRunner {
  /**
   * Run a scenario and return the results
   */
  static async runScenario(scenario: TestScenario) {
    // Setup
    if (scenario.setup) {
      await scenario.setup();
    }

    try {
      // Return scenario data for use in tests
      return {
        data: scenario.data,
        mocks: scenario.mocks,
        assertions: scenario.assertions,
        expectedResults: scenario.data.expectedResults,
      };
    } finally {
      // Cleanup
      if (scenario.cleanup) {
        await scenario.cleanup();
      }
    }
  }

  /**
   * Validate scenario results against expectations
   */
  static validateResults(actualResults: any, expectedResults: any) {
    const validationErrors: string[] = [];

    Object.entries(expectedResults).forEach(([key, expected]) => {
      const actual = actualResults[key];
      if (actual !== expected) {
        validationErrors.push(`Expected ${key} to be ${expected}, but got ${actual}`);
      }
    });

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
    };
  }
}