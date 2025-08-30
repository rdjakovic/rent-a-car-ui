# Reservation Search Optimization Design

## Overview

This design optimizes the reservation search functionality by consolidating the current two-API-call approach (search customers → search reservations) into a single, efficient endpoint that performs database JOINs to search across reservation and customer data simultaneously.

## Architecture

### Current Architecture (Inefficient)
```
Frontend → GET /api/customers/searchany?search=John
         ← Customer IDs [1, 2, 3]
Frontend → GET /api/reservations?customerIds=1,2,3  
         ← Reservations with customer data
```

### Optimized Architecture
```
Frontend → GET /api/reservations?search=John
         ← Reservations with customer data (single query)
```

## Components and Interfaces

### Backend Components

#### 1. ReservationController Enhancement
- **Location**: `src/main/java/com/rentacar/controller/ReservationController.java`
- **Enhancement**: Add `search` parameter to existing `getAllReservations` endpoint
- **Method**: `GET /api/reservations`
- **Parameters**:
  - `search` (String, optional): Multi-field search term
  - `page`, `size`, `sort`: Existing pagination parameters
  - Other existing filter parameters remain unchanged

#### 2. ReservationService Enhancement  
- **Location**: `src/main/java/com/rentacar/service/ReservationService.java`
- **New Method**: `findReservationsWithSearch(String searchTerm, Pageable pageable)`
- **Responsibility**: Coordinate search logic and call repository layer

#### 3. ReservationRepository Enhancement
- **Location**: `src/main/java/com/rentacar/repository/ReservationRepository.java`
- **New Method**: `findBySearchTerm(String searchTerm, Pageable pageable)`
- **Implementation**: Custom JPQL query with JOINs

### Database Query Design

#### Optimized JPQL Query
```sql
SELECT DISTINCT r FROM Reservation r 
LEFT JOIN r.customer c 
LEFT JOIN r.car car
LEFT JOIN r.branch b
WHERE 
  (:search IS NULL OR :search = '') OR
  (
    LOWER(CONCAT(c.firstName, ' ', c.lastName)) LIKE LOWER(CONCAT('%', :search, '%')) OR
    LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR
    c.phoneNumber LIKE CONCAT('%', :search, '%') OR
    CAST(r.id AS string) LIKE CONCAT('%', :search, '%') OR
    LOWER(car.displayName) LIKE LOWER(CONCAT('%', :search, '%')) OR
    LOWER(car.model) LIKE LOWER(CONCAT('%', :search, '%')) OR
    LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%'))
  )
ORDER BY 
  CASE WHEN CAST(r.id AS string) = :search THEN 1 ELSE 2 END,
  r.createdAt DESC
```

#### Index Recommendations
```sql
-- Composite indexes for optimal search performance
CREATE INDEX idx_customer_search ON customers(LOWER(first_name), LOWER(last_name), LOWER(email));
CREATE INDEX idx_car_search ON cars(LOWER(display_name), LOWER(model));
CREATE INDEX idx_branch_search ON branches(LOWER(name));
CREATE INDEX idx_reservation_created ON reservations(created_at DESC);
```

## Data Models

### Enhanced ReservationSearchParams
```java
public class ReservationSearchParams {
    private String search;           // NEW: Multi-field search term
    private Long customerId;         // Existing
    private Long carId;             // Existing  
    private ReservationStatus status; // Existing
    private LocalDate startDate;     // Existing
    private LocalDate endDate;       // Existing
    // ... other existing fields
}
```

### Response Model (Unchanged)
The existing `PageReservationResponseDto` remains unchanged, ensuring backward compatibility.

## Error Handling

### Search-Specific Error Cases
1. **Empty Search Results**: Return empty page with appropriate metadata
2. **Invalid Search Characters**: Sanitize input, log potential injection attempts
3. **Database Timeout**: Return 503 with retry-after header
4. **Search Too Broad**: Implement minimum search length (2-3 characters)

### Error Response Format
```json
{
  "error": "SEARCH_TOO_SHORT",
  "message": "Search term must be at least 2 characters long",
  "timestamp": "2024-12-01T10:00:00Z"
}
```

## Testing Strategy

### Unit Tests
1. **ReservationRepositoryTest**
   - Test search query with various input types
   - Test search result ordering (ID matches first)
   - Test case-insensitive matching
   - Test partial matches across all fields

2. **ReservationServiceTest**
   - Test search parameter validation
   - Test integration with existing filters
   - Test empty search handling

3. **ReservationControllerTest**
   - Test endpoint parameter binding
   - Test response format consistency
   - Test error handling scenarios

### Integration Tests
1. **Search Performance Test**
   - Measure query execution time with large datasets
   - Compare single-query vs. two-query performance
   - Test concurrent search requests

2. **End-to-End Search Test**
   - Test complete search flow from frontend to database
   - Verify result accuracy across all searchable fields
   - Test pagination with search results

### Performance Benchmarks
- **Target**: < 500ms response time for typical datasets (10K+ reservations)
- **Baseline**: Measure current two-query approach performance
- **Comparison**: Document performance improvement metrics

## Implementation Phases

### Phase 1: Backend Enhancement
1. Add search parameter to ReservationController
2. Implement ReservationService search method
3. Create optimized repository query
4. Add comprehensive unit tests

### Phase 2: Database Optimization
1. Create recommended indexes
2. Analyze query execution plans
3. Fine-tune query performance

### Phase 3: Frontend Integration
1. Remove customer search API call from ReservationsPage
2. Update listReservations to use search parameter only
3. Update tests to reflect single API call
4. Performance testing and validation

### Phase 4: Monitoring & Optimization
1. Add search performance metrics
2. Monitor query performance in production
3. Optimize based on real usage patterns

## Backward Compatibility

### Existing Functionality Preserved
- All existing reservation filter parameters continue to work
- Pagination behavior remains unchanged
- Response format stays consistent
- No breaking changes to existing API contracts

### Migration Strategy
- The `search` parameter is optional, ensuring existing calls work
- Frontend can be updated incrementally
- Old customer search approach can be deprecated gradually