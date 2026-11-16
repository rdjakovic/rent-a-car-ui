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

Both listen on http://localhost:8080, where the UI's dev server forwards `/api` (set `API_PROXY_TARGET` for another address; leave `VITE_API_BASE_URL` empty).

After switching branches, start with a clean build (`./mvnw clean spring-boot:run ...`) so no stale classes are left in `target/`.

## Profiles and security

| Profile | Database | Security |
|---|---|---|
| `local` (default) | H2 in memory | real rules: sign in |
| `docker` | PostgreSQL from `compose.yaml` | real rules: sign in |
| `dev` | your own PostgreSQL | real rules: sign in |
| `prod` | PostgreSQL, needs `JWT_SECRET` etc. | real rules: sign in |

Every profile needs a sign-in, so the UI shows its login page first. Roles are STAFF, MANAGER and ADMIN
(each includes the rights of the one before): staff handle customers and reservations and schedule maintenance;
managers add cars, run maintenance and create staff accounts; administrators also manage branches, settings and users.
The backend's `/auth/me` (and login and refresh) sends the user's `permissions`; the UI checks them with `useCan`
and guards routes with `RequirePermission`, so it never duplicates the rules. The backend remains the source of truth
and answers **401** without a valid token or **403** when the user is signed in but not allowed. See the backend README
for the permission names and the user-account rules.

## Seed data

- Users (local, dev and docker only), all with password `admin123`: `admin` (administrator), `maria.manager` (manager) and `john.doe` (staff). Sign in with the username or the email address
- Branches, 13 cars, customers and reservations, with dates relative to the day the database was created
- Local, dev and docker also get sample maintenance jobs in every state, cars due for service, one car out on rental and one overdue return

## API

- All endpoints are under `/api/v1`
- Swagger UI: http://localhost:8080/swagger-ui.html
- OpenAPI docs: http://localhost:8080/api-docs (used by `pnpm api:gen` to regenerate src/lib/api/schema.d.ts)
- Errors are RFC 7807 problem details (`{ title, status, detail, ... }`); 409 means a state or booking conflict, and `detail` explains it

## Rules the UI depends on

- A car's status is its physical state (AVAILABLE, RENTED, MAINTENANCE, OUT_OF_SERVICE); bookings are date-based and shown through `nextReservation` on car responses
- Editing a car is `PUT /api/v1/cars/{id}` with the full `CarRequestDto` (a duplicate VIN is a 409); photos are changed separately through the image endpoints
- Car responses include `images` (id, relative `url`, fileName, contentType, sizeBytes, position) in upload order. Upload with `POST /api/v1/cars/{id}/images` as `multipart/form-data` and repeated `files` fields: at most 5 per car, 5 MB each, JPEG/PNG/WebP only (the backend checks the bytes, not the declared type). `DELETE /api/v1/cars/{carId}/images/{imageId}` removes one; both need `CAR_MANAGE`
- Photo `url`s are relative to the API host and need no token, because a plain `<img>` can't send the bearer token; the UI resolves them with `carImageUrl`. Files are stored under `CAR_IMAGES_DIR` (`./data/car-images` by default) while the database keeps their metadata, so reset both together
- Reservations: PENDING → CONFIRMED → ACTIVE (picked up) → COMPLETED (returned); only PENDING can be edited, only PENDING/CONFIRMED cancelled
- Same-day rentals are allowed and charged as one day
- Scheduled maintenance blocks bookings on its date; a car can't go into the shop while rented
- A branch can be inactive (closed): its cars aren't offered for booking and it can't be a pick-up or return location (409). The UI only lists active branches in its pickers; switch a branch with `PUT /api/v1/branches/{id}` (leaving `active` out keeps it)
- `GET /api/v1/branches/search?name=&city=` matches partially and case-insensitively; both are optional
- On `GET /api/v1/cars`, `vin` and `year` match exactly (the VIN is case-sensitive), `make` and `model` partially, and `search` is free text over make, model and "year make model"
- Failures are problem details; show the `detail` (a duplicate VIN is a 409, a duplicate branch name in a city a 400)
- The mileage unit setting is a label only; values are never converted
- `PUT /api/v1/settings` replaces all settings: `defaultBranchId` (an active branch; leave it out to clear it) is what the Availability page pre-selects when the user has no open branch of their own. `GET` reports no default if that branch has since been closed
- User accounts: managers can list users and create STAFF; administrators also set roles, branches and `enabled`, and reset passwords. `PUT /api/v1/users/{id}` is a full replacement, and disabling an account ends its sessions at once. An administrator can't disable or demote themselves, so at least one administrator remains
- `POST /api/v1/auth/change-password` needs the current password and ends the user's other sessions; the one making the change stays signed in

See the backend README for the details.
