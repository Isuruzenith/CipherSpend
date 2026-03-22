# CipherSpend

CipherSpend is a privacy-first expense tracker that encrypts monetary values in the browser before sending data to the backend.

## Key Features

- Client-side encryption for expense amounts (`node-seal` / WASM)
- FastAPI backend with encrypted expense storage
- Dashboard with decrypted total and category analytics (locally decrypted)
- Date filters: day, week, month, custom range
- Multi-currency support (default: `LKR`)
- Expense CRUD (add, edit, delete)
- Vault settings (key rotation, backup, default currency, CSV export)

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui, Recharts
- Backend: FastAPI, SQLAlchemy, SQLite, TenSEAL
- Containerization: Docker + Docker Compose

## Project Structure

```text
backend/    FastAPI app, DB models, schemas
frontend/   React app and UI components
```

## Run with Docker (Recommended)

From repository root:

```bash
docker compose up --build
```

App URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

### Common Docker Commands

```bash
docker compose up -d
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
```

## Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Notes

- The frontend currently calls backend APIs at `http://localhost:8000`.
- For production-like static serving, Nginx SPA fallback is configured so routes like `/dashboard` and `/settings` work on refresh.
- `seal_throws.wasm` and related public assets are served from `frontend/public`.

## Troubleshooting

- If backend fails with missing modules, rebuild backend image:

```bash
docker compose build backend --no-cache
docker compose up -d backend
```

- If frontend shows stale assets, rebuild frontend and hard refresh browser (`Ctrl + F5`):

```bash
docker compose build frontend --no-cache
docker compose up -d frontend
```

