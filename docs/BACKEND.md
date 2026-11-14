# Backend for UI development

The backend is the Rent-a-Car API in the `rent-a-car-be` repository (Spring Boot 4.1, Java 25).
Its README is the single source of truth for business rules, the full API and configuration;
this page only covers what you need to run the UI against it.

## Running the backend

Run these in the backend repository (JDK 25 required):

```bash
# PostgreSQL in Docker (Docker Desktop must be running); data survives restarts
./mvnw spring-boot:run -Dspring-boot.run.profiles=docker

# H2 in memory (default local profile); data resets on every start
./mvnw spring-boot:run
```

Both listen on http://localhost:8080, which is what `VITE_API_BASE_URL` in `.env.local` should point to.

After switching branches, start with a clean build (`./mvnw clean spring-boot:run ...`) so no stale classes are left in `target/`.

## Profiles and security

| Profile | Database | Security |
|---|---|---|
| `local` (default) | H2 in memory | open: the UI works without login |
| `docker` | PostgreSQL from `compose.yaml` | open: the UI works without login |
| `dev` | your own PostgreSQL | real rules: most calls need a JWT |
| `prod` | PostgreSQL, needs `JWT_SECRET` etc. | real rules |

The UI has no login yet, so use `local` or `docker`. With the real rules, customers, reservations and
maintenance need ADMIN or EMPLOYEE, and changing settings needs ADMIN.

## Seed data

- Users: `admin`/`admin123` and `john.doe`/`admin123` (local, dev and docker only)
- Branches, 13 cars, customers and reservations, with dates relative to the day the database was created
- Local, dev and docker also get sample maintenance jobs in every state, cars due for service, one car out on rental and one overdue return

## API

- All endpoints are under `/api/v1`
- Swagger UI: http://localhost:8080/swagger-ui.html
- OpenAPI docs: http://localhost:8080/api-docs (used by `pnpm api:gen` to regenerate src/lib/api/schema.d.ts)
- Errors are RFC 7807 problem details (`{ title, status, detail, ... }`); 409 means a state or booking conflict, and `detail` explains it

## Rules the UI depends on

- A car's status is its physical state (AVAILABLE, RENTED, MAINTENANCE, OUT_OF_SERVICE); bookings are date-based and shown through `nextReservation` on car responses
- Reservations: PENDING → CONFIRMED → ACTIVE (picked up) → COMPLETED (returned); only PENDING can be edited, only PENDING/CONFIRMED cancelled
- Same-day rentals are allowed and charged as one day
- Scheduled maintenance blocks bookings on its date; a car can't go into the shop while rented
- The mileage unit setting is a label only; values are never converted

See the backend README for the details.
