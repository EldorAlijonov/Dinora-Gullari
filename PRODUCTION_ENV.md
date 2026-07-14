# Production environment

## Backend

Create production environment variables from `backend/.env.production.example`.

Required in production:

- `NODE_ENV=production`
- `MONGODB_URI`: production MongoDB connection string. Do not use localhost.
- `JWT_SECRET`: at least 32 random characters. Do not reuse example values.
- `TELEGRAM_BOT_TOKEN`: real BotFather token.
- `CLIENT_URL` or `CLIENT_URLS`: exact frontend origin(s), for example `https://app.example.uz`.

Recommended:

- `JWT_EXPIRES_IN=12h`
- `TELEGRAM_ADMIN_IDS=6874906701,1779520880`
- `COOKIE_SAME_SITE=none` when frontend and backend are on different HTTPS domains.
- `COOKIE_SAME_SITE=lax` when frontend and backend are same-site.
- `REQUEST_BODY_LIMIT=10mb` for compressed profile/store images.
- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=180`
- `BACKUP_ENABLED=true`
- `BACKUP_DIR=/var/backups/dinora-gullari` or another persistent server directory.
- `LOG_DIR=/var/log/dinora-gullari`
- `TELEGRAM_ERROR_ALERTS_ENABLED=true`
- `TELEGRAM_ERROR_ALERT_THROTTLE_MS=300000`

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Frontend

Create production environment variables from `frontend/.env.production.example`.

Required in production:

- `VITE_API_URL`: exact backend API origin, for example `https://api.example.uz`.

The frontend build now fails if `VITE_API_URL` is missing in production.

## Safety checks

The backend now refuses to start in production when:

- required variables are missing;
- `JWT_SECRET` is too short or uses a default value;
- `MONGODB_URI` points to localhost;
- `COOKIE_SAME_SITE` has an invalid value.

The backend also enables production API hardening: security headers, gzip compression, CORS origin allow-listing, JSON body limits, and per-IP rate limiting.

Real `.env` files are ignored by `.gitignore` and must not be committed.

## Backup and export

The backend creates an automatic JSON backup every day at 03:00 Asia/Tashkent when `BACKUP_ENABLED=true`.

Backups are written to `BACKUP_DIR`, so this directory must be persistent on the production server. If the backend runs in Docker, mount this path as a volume.

Admin endpoints:

- `GET /backups/export`: downloads a full JSON export.
- `POST /backups/create`: creates a backup file in `BACKUP_DIR`.
- `GET /backups/files`: lists backup files.
- `GET /backups/deleted-records`: lists recently deleted order/sale archives.

Order and sale deletes are archived in the `deleted_records` MongoDB collection before the original record is removed.

## Error monitoring

Backend errors are handled by the global exception filter.

What happens:

- every HTTP error is returned as JSON with `statusCode`, `path`, `timestamp`, `requestId`, and `message`;
- errors are written to Nest logs;
- errors are appended to `LOG_DIR/backend-errors.log`;
- 500-level backend errors are sent to Telegram admins when `TELEGRAM_ERROR_ALERTS_ENABLED=true`;
- Telegram alerts are throttled by `TELEGRAM_ERROR_ALERT_THROTTLE_MS` to avoid repeated spam.

Frontend behavior:

- API 400/403/404/500/network errors are converted into understandable user messages;
- 500 errors show the backend `requestId` when available;
- runtime UI crashes show a recovery screen with a reload button instead of a blank page.
