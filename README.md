# PMI GOV Consent Form

A self-hosted application for capturing customer consent and payment authorization, complete with digital signatures and Aadhaar uploads.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS (customer form at `/`, admin panel at `/admin`)
- **API**: Express (TypeScript) under `server/`
- **Database**: PostgreSQL (form metadata)
- **File storage**: MinIO (S3-compatible) — signatures and Aadhaar images
- **Docker**: everything runs as local containers via `docker-compose`

## Quick start (full stack in Docker)

```bash
docker compose up --build
```

Then open http://localhost:4000 — the app container serves both the API and the built frontend. MinIO console is at http://localhost:9003 (user `pmigov`, password `pmigov-secret`; API published on host port 9002).

## Local development

Run Postgres + MinIO as containers, and the frontend/API on your machine with hot reload:

```bash
npm install
npm run infra:up      # starts db + minio containers
npm run dev:api       # Express API on :4000 (tsx watch)
npm run dev           # Vite dev server on :3000 (proxies /api to :4000)
```

Open http://localhost:3000. Local config lives in `.env.local` (see `.env.example`); the defaults match the compose services.

## API

No authentication (per requirements) — put the deployment behind your own network controls.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/forms` | Submit a consent form (JSON; images as base64 data URLs) |
| `GET` | `/api/forms` | List submissions (newest first, summary fields) |
| `GET` | `/api/forms/:id` | Full record with image URLs |
| `DELETE` | `/api/forms/:id` | Delete a record and its stored images |
| `GET` | `/api/files/forms/...` | Stream a stored image (signature/Aadhaar) from MinIO |
| `GET` | `/api/health` | Health check |

Images are decoded server-side and stored in the MinIO bucket (`pmigov-forms` by default) under `forms/<id>/`; the database only stores object keys.

## Features

- **Customer flow**: personal details, optional Aadhaar front/back upload, payment details, consent declaration, digital signature pad, place — then a "Form Submitted" success screen.
- **Admin panel** (`/admin`): table of all submissions sorted by date, view full record, download as PDF, print, and delete.

## Environment variables

See `.env.example`. In Docker, the compose file wires the app to the `db` and `minio` services; for anything beyond local use, change the default credentials in `docker-compose.yml`.
