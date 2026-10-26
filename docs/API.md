# API guide

Base URL locally: `http://localhost:5000/api/v1`. Responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "message": "..." } }`. Login returns a JWT; send it as `Authorization: Bearer <token>` for protected endpoints. Public registration always assigns the `student` role.

## Authentication

- `POST /auth/register` — `{name,email,password,department?}`; creates a student.
- `POST /auth/login` — `{email,password}`; returns user and token.
- `GET /auth/me` — current account.
- `POST /auth/logout` — client should discard its token.

## Main routes

- Labs: `GET /labs`, admin `POST /labs`, `PATCH /labs/:id`, `DELETE /labs/:id` (deactivates only when active assets are absent).
- Assets: `GET /assets?search=&laboratoryId=&category=&status=&page=1&limit=20`; staff `POST /assets`; authorized `GET/PATCH /assets/:id`; admin `DELETE /assets/:id` retires it. QR endpoints: `GET /assets/:id/qr` and authenticated `GET /assets/qr/:qrCodeId`.
- Reservations: `GET/POST /reservations`; admin `PATCH /reservations/:id/status` with approved, rejected, or completed; owner/admin `PATCH /reservations/:id/cancel`. The server validates future date ranges and overlapping pending/approved requests, and repeats the check at approval.
- Maintenance: `GET/POST /maintenance`; staff `PATCH /maintenance/:id` with status, priority, assignment, or resolutionNotes.
- Notifications: `GET /notifications`, owner-scoped `PATCH /notifications/:id/read`.
- Users (admin): `GET/POST /users`, `PATCH /users/:id`.
- Analytics (admin): `GET /analytics/overview`, `/analytics/assets`, `/analytics/maintenance`, `/analytics/reservations`; `GET /activity`.
- `GET /health` — database connectivity state.

Example login:

```bash
curl -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@labops.demo\",\"password\":\"LabOpsDemo2026!\"}"
```

## Postman

Create a collection variable `baseUrl=http://localhost:5000/api/v1` and `token`; set the Authorization tab to Bearer Token using `{{token}}`. Login first and save `data.token` from the response. No external requests or secrets are needed for local use.
