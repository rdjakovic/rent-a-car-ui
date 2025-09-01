2025-08-27: Replaced README.md with comprehensive frontend documentation and added docs/TODO.md capturing unfinished features and roadmap.
2025-08-27: Fixed failing CustomersPage test by correcting vi.mock syntax and resolving module mocking conflicts between test files. All tests now pass.
2025-08-27: Implemented Customers feature: added CustomersPage with search/pagination, CustomerFormDialog with RHF+Zod, wired /customers route, and added a basic test.
2025-08-27: Enhanced API & Data Layer: Extended queries.ts with reservation endpoints, created error normalization utility, implemented global query error handling with retry policies, and set up comprehensive MSW handlers with seed fixtures for offline development and testing.
2025-08-27: Updated customer search to use new backend endpoint /api/customers/searchany for enhanced search capabilities across first name, last name, email, phone, city, and driver license number. Updated UI with improved search placeholder and help text.


2025-01-09: Fixed BookingWizard component state management issues: Enhanced BookingFlowStore with initializationError state and validateUrlParameters method, improved async URL parameter initialization in useBookingFlow hook, fixed useEffect dependencies to prevent infinite loops, and updated CustomerSelection to support customizable back button text. All 17 BookingWizard tests now pass with proper error handling and loading states.
2025-09-01: UI tests stabilization pass (phase 1): added missing setLoading/setInitializationError to test factories, improved BookingReview tests to avoid ambiguous text matches, fixed AvailabilityPage date input label associations, and aligned BookingWizardNavigation tests with centralized mock helpers. Ran full Vitest suite and prepared a prioritized plan to address remaining failures.

2025-09-01: UI tests stabilization pass (phase 2): updated BookingWizardNavigation tests to use data-testids for loading and start-new-search, expanded AddCarDialog tests to fill all required fields and use robust error assertion, and reran full Vitest suite to gather remaining failures for triage.
