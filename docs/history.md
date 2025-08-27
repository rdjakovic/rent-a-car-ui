2025-08-27: Replaced README.md with comprehensive frontend documentation and added docs/TODO.md capturing unfinished features and roadmap.
2025-08-27: Fixed failing CustomersPage test by correcting vi.mock syntax and resolving module mocking conflicts between test files. All tests now pass.
2025-08-27: Implemented Customers feature: added CustomersPage with search/pagination, CustomerFormDialog with RHF+Zod, wired /customers route, and added a basic test.
2025-08-27: Enhanced API & Data Layer: Extended queries.ts with reservation endpoints, created error normalization utility, implemented global query error handling with retry policies, and set up comprehensive MSW handlers with seed fixtures for offline development and testing.
2025-08-27: Updated customer search to use new backend endpoint /api/customers/searchany for enhanced search capabilities across first name, last name, email, phone, city, and driver license number. Updated UI with improved search placeholder and help text.


