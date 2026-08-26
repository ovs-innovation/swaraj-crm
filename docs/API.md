# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

### POST /auth/login
```json
{ "email": "admin@vastora.com", "password": "admin123" }
```

### GET /auth/me
Headers: `Authorization: Bearer <token>`

### POST /auth/forgot-password
```json
{ "email": "user@example.com" }
```

### PUT /auth/reset-password/:token
```json
{ "password": "newpassword" }
```

## Area Managers (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /area-managers | List all |
| GET | /area-managers/:id | Get one |
| POST | /area-managers | Create |
| PUT | /area-managers/:id | Update |
| DELETE | /area-managers/:id | Delete |
| PATCH | /area-managers/:id/toggle-status | Toggle active/inactive |

## Dealers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /dealers | List (filtered by role) |
| GET | /dealers/:id | Get one |
| GET | /dealers/:id/profile | Full profile with timeline |
| POST | /dealers | Create (Admin) |
| PUT | /dealers/:id | Update |
| DELETE | /dealers/:id | Delete (Admin) |
| POST | /dealers/:id/assign | Assign to area manager |
| GET | /dealers/:id/assignment-history | Assignment history |

## Visits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /visits | List visits |
| POST | /visits | Create visit |
| PUT | /visits/:id | Update visit |
| DELETE | /visits/:id | Delete visit |

## Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /media | List media |
| POST | /media/upload | Upload (multipart/form-data) |
| PATCH | /media/:id/approve | Approve/reject (Admin) |
| DELETE | /media/:id | Delete |

## Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /dashboard/admin | Admin dashboard stats |
| GET | /dashboard/area-manager | Area manager dashboard |
| GET | /dashboard/activities | Activity feed |

## Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /reports/dealers | Dealer report |
| GET | /reports/visits | Visit report |
| GET | /reports/uploads | Upload report |
| GET | /reports/state-wise | State-wise report |
| GET | /reports/area-wise | Area-wise report |
| GET | /reports/audit-logs | Audit logs |

## Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /settings | Get settings |
| PUT | /settings | Update settings (Admin) |
