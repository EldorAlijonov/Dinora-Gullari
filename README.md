# Dinora Gullari

Gul do'koni uchun CRM: buyurtmalar, sovg'a/tovar sotuvlari, qarzdorlik, arxiv, hisobotlar, backup/export va Telegram bildirishnomalar.

## Stack

- Frontend: React, Vite, Redux Toolkit RTK Query, React Router, Tailwind CSS, Framer Motion, Recharts, React Hook Form, Zod.
- Backend: NestJS, TypeScript, MongoDB/Mongoose, JWT cookie auth, Telegram Bot API, scheduled jobs.

## Local Setup

```bash
cd backend
npm install

cd ../frontend
npm install
```

MongoDB:

```bash
docker compose up -d
```

Environment files:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Demo admin:

```bash
cd backend
npm run seed:admin
```

Login:

- Email: `admin@dinora.uz`
- Telefon: `+998901234567`
- Parol: `admin123`

## Development

Recommended:

```bash
start-dev.cmd
```

Manual:

```bash
cd backend
npm run dev

cd ../frontend
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

## Verification

Run before deploy or handoff:

```bash
cd backend
npm run lint
npm run build

cd ../frontend
npm run lint
npm run build
```

## Production

Use `backend/.env.production.example` and `frontend/.env.production.example`.

Important:

- Never commit real `.env` files.
- Use a production MongoDB URI, not localhost.
- Generate a strong `JWT_SECRET` with at least 32 random characters.
- Set `CLIENT_URL` or `CLIENT_URLS` to the exact frontend origin.
- Set `VITE_API_URL` to the exact backend API origin.
- Mount `BACKUP_DIR` to persistent storage.

More details: `PRODUCTION_ENV.md`.

## Security and Reliability

Backend includes:

- HTTP-only JWT cookie auth;
- production env validation;
- CORS origin allow-listing;
- security headers via Helmet;
- gzip compression;
- per-IP rate limiting;
- request body limit for compressed profile/logo images;
- global exception filter with request IDs;
- backend error logs and optional Telegram admin alerts;
- JSON backup/export and deleted-record archive.
- optional non-blocking Google Sheets mirror sync for newly created orders and sales.

Frontend includes:

- route protection;
- user-friendly API error messages;
- runtime error boundary;
- compressed profile/logo image previews before upload;
- working ESLint config for JSX and Hooks.

## API Summary

- Auth: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- Users: `GET /users/me`, `PATCH /users/me`, `POST /users/me/change-password`
- Settings: `GET /settings/public`, `GET /settings`, `PATCH /settings`
- Dashboard: `GET /dashboard`
- Orders: `GET /orders`, `GET /orders/:id`, `POST /orders`, `PATCH /orders/:id`, `PATCH /orders/:id/status`, `DELETE /orders/:id`, `POST /orders/:id/pay-debt`, `POST /orders/:id/send-debt-reminder`
- Sales: `GET /sales`, `POST /sales`, `PATCH /sales/:id`, `DELETE /sales/:id`, `POST /sales/:id/pay-debt`, `POST /sales/:id/send-debt-reminder`
- Debts: `GET /debts`, `GET /debts/stats`
- Reports: `GET /reports/daily`, `GET /reports/weekly`, `GET /reports/monthly`, `GET /reports/yearly`, `GET /reports/overview`
- Backups: `GET /backups/export`, `POST /backups/create`, `GET /backups/files`, `GET /backups/deleted-records`

## Notes

Profile and store images are currently stored as compressed inline image data. This is acceptable for a small internal CRM, but a larger deployment should move images to object storage or a dedicated upload service.

Google Sheets sync is optional. Configure it from the admin Settings page, then share the spreadsheet with the service account email.
