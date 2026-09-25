# Vastora Dealer CRM

A centralized CRM for Head Office (Admin) to manage Area Managers and Dealers — built with the MERN stack.

## Features

- **Role-based access** — Admin, Area Manager (Dealer role ready for future)
- **Area Manager management** — CRUD, activate/deactivate
- **Dealer management** — Full profile, assignment, reassignment with history
- **Visit tracking** — Create, complete, and monitor dealer visits
- **Media upload & approval** — Images, videos, documents with admin approval workflow
- **Dashboards** — Admin analytics + Area Manager summary
- **Reports** — Dealer, visit, upload, state-wise, area-wise (CSV export)
- **Audit logs** — Login, CRUD, approval, assignment tracking
- **Activity timeline** — Per-dealer activity history
- **Settings** — Company details, theme colors

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React 18, Vite, Recharts |
| Backend  | Node.js, Express.js     |
| Database | MongoDB, Mongoose       |
| Auth     | JWT                     |
| Uploads  | Multer (local) / Cloudinary ready |

## Prerequisites

- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

## Quick Start

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and JWT secret

# 3. Seed demo data
cd server && npm run seed

# 4. Start development servers
cd .. && npm run dev
```



## Project Structure

```
vastora-crm/
├── client/          # React frontend
│   ├── admin/       # Admin-only pages
│   ├── area-manager/# Area Manager pages
│   ├── shared/      # Shared components & pages
│   └── services/    # API client
├── server/          # Express backend
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── utils/
└── docs/            # Documentation
```

## API Overview

| Endpoint              | Description              |
|-----------------------|--------------------------|
| POST /api/auth/login  | User login               |
| GET /api/dashboard/admin | Admin dashboard stats |
| GET /api/area-managers | List area managers      |
| GET /api/dealers      | List dealers             |
| POST /api/visits      | Create visit             |
| POST /api/media/upload| Upload media             |
| PATCH /api/media/:id/approve | Approve/reject media |
| GET /api/reports/*    | Various reports          |

## Future Enhancements

- Meta/Facebook auto-posting
- WhatsApp API integration
- AI image watermarking & video enhancement
- GPS location tracking for visits
- Push notifications

## License

Private — Vastora internal use.
