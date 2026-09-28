# Calling CRM

The project has separate React/Vite and Express applications. MongoDB is required by the backend. Vercel serves the frontend only; it does not run the Express process or provide the database.

## Local development

Requirements: Node.js 20 or newer, npm, and Docker with Compose (or a local MongoDB server).

1. Copy `backend/.env.example` to `backend/.env`. Keep `.env` files private and out of Git.
2. Set unique local values for `JWT_SECRET`, `ADMIN_AUDIT_PASSWORD`, `INITIAL_ADMIN_USERNAME`, and `INITIAL_ADMIN_PASSWORD`.
3. Start MongoDB from the repository root:

   ```powershell
   docker compose up -d mongodb
   ```

4. Seed the initial administrator and sample contacts:

   ```powershell
   cd backend
   npm install
   npm run seed
   ```

5. Start the API in one terminal:

   ```powershell
   cd backend
   npm start
   ```

6. Copy `frontend/.env.example` to `frontend/.env.local` if a non-default API URL is needed. By default, development uses `http://localhost:5000`.
7. Start the frontend in another terminal:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

The frontend is available at `http://localhost:5173`; the API health endpoint is `http://localhost:5000/health`.

## Production deployment

### MongoDB

Use MongoDB Atlas or another remotely reachable MongoDB service. Set the backend's `MONGODB_URI` to its private connection string and `MONGODB_DB_NAME` to `calling_crm`. In Atlas, create a least-privilege database user and allow the backend host's outbound IP addresses. Do not put database credentials in Vercel or any `VITE_` variable.

### Backend on Render

Create a Render Web Service from the repository using the root `render.yaml` Blueprint, or configure a Node web service manually:

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health-check path: `/health`
- Environment: `NODE_ENV=production`

Set these Render environment variables:

- `MONGODB_URI`: MongoDB Atlas connection string
- `MONGODB_DB_NAME`: `calling_crm`
- `JWT_SECRET`: a unique random value of at least 32 characters
- `ADMIN_AUDIT_PASSWORD`: a unique private password
- `FRONTEND_URL`: `https://d-tcallingcrm.vercel.app`
- `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD`: temporary bootstrap credentials for the first administrator

After the service is connected to MongoDB, run `npm run seed` once in the backend service shell to create the initial administrator and sample contacts. Remove the initial-admin environment variables after seeding. Recordings are currently stored on the backend filesystem; use a persistent disk or object-storage service for production recordings.

### Frontend on Vercel

- Project root directory: `frontend`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` set to the Render service's HTTPS origin, for example `https://calling-crm-backend.onrender.com` (no `/api` suffix)

Redeploy after changing environment variables. The Vercel SPA fallback serves the React entry point for page paths while leaving `/api` and `/uploads` paths as 404s on Vercel. Frontend API and Socket.IO traffic use the separately configured backend origin.

## API route map

All application APIs are mounted under `/api`; all routes except signup and login require a bearer token.

| Frontend request | Backend route |
| --- | --- |
| `POST /api/auth/login`, `POST /api/auth/signup` | `POST /api/auth/login`, `POST /api/auth/signup` |
| `POST /api/auth/verify-admin-audit`, `POST /api/auth/change-admin-audit-password` | Matching authenticated auth routes |
| `POST /api/auth/presence`, `POST /api/auth/lock-inactive-user` | Matching authenticated auth routes |
| `GET /api/auth/users`, `PUT /api/auth/users/:id/unlock` | Matching administrator-only auth routes |
| `GET /api/auth/admin-requests`, `PUT /api/auth/admin-requests/:id` | Matching administrator-only auth routes |
| `GET /api/contacts`, `POST /api/contacts`, `POST /api/contacts/bulk` | Matching contact routes |
| `GET /api/contacts/:id`, `PUT /api/contacts/:id`, `DELETE /api/contacts/:id` | Matching contact routes |
| `GET /api/calls`, `GET /api/calls/reports`, `GET /api/calls/:id` | Matching call routes |
| `POST /api/calls`, `PUT /api/calls/:id/notes`, `POST /api/calls/:id/recording`, `DELETE /api/calls/:id` | Matching call routes |
| `GET /api/reminders`, `POST /api/reminders`, `PUT /api/reminders/:id/complete`, `DELETE /api/reminders/:id` | Matching reminder routes |

The app navigates between dashboard sections with client-side state and synchronizes the existing sections to `/dashboard`, `/contacts`, `/call-logs`, `/admin`, and `/users`; `/` and `/login` load the login screen when signed out. It does not define a separate settings page. Vercel rewrites non-API page requests to `index.html`; direct URL paths and refreshes preserve the selected section.

## Environment and security notes

- Frontend variables must use the `VITE_` prefix. Never put secrets in Vite variables; they are included in browser assets.
- Backend production startup requires MongoDB, JWT, Admin Audit, and CORS environment settings.
- CORS allows only origins listed in `FRONTEND_URL`; separate multiple origins with commas.
- The local `.env` was removed from Git tracking. If it contained any real credentials, rotate them because removing a file does not erase prior Git history.
- The login page does not publish demo passwords. Create an administrator with the seed environment variables.
