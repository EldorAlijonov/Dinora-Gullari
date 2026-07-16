# Production environment

## Backend

Create production environment variables from `backend/.env.production.example`.

Required in production:

- `NODE_ENV=production`
- `MONGODB_URI`: production MongoDB connection string.
- `JWT_SECRET`: at least 32 random characters. Do not reuse example values.
- `TELEGRAM_BOT_TOKEN`: real BotFather token.
- `CLIENT_URL` or `CLIENT_URLS`: exact frontend origin(s), for example `https://app.example.uz`.

Recommended:

- `JWT_EXPIRES_IN=12h`
- `TELEGRAM_ADMIN_IDS=6874906701,1779520880`
- `COOKIE_SAME_SITE=none` when frontend and backend are on different HTTPS domains.
- `COOKIE_SAME_SITE=lax` when frontend and backend are same-site.
- `COOKIE_SECURE=false` only when serving production over plain HTTP.
- `TRUST_PROXY=1` when the backend runs behind nginx or another reverse proxy.
- `BACKUP_ENABLED=true`
- `BACKUP_DIR=/var/backups/dinora-gullari` or another persistent server directory.
- `LOG_DIR=/var/log/dinora-gullari`
- `TELEGRAM_ERROR_ALERTS_ENABLED=true`
- `TELEGRAM_ERROR_ALERT_THROTTLE_MS=300000`
- `ALLOW_LOCAL_MONGODB=true` only for a single-server deployment where MongoDB is bound locally.

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
- `MONGODB_URI` points to localhost unless `ALLOW_LOCAL_MONGODB=true` is explicitly set;
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

## Google Sheets mirror sync

Google Sheets sync is optional and non-blocking. MongoDB remains the source of truth.

When enabled, newly created flower orders and gift/product sales are appended to Google Sheets. If Google Sheets is unavailable, the backend logs a warning and the CRM operation still succeeds.

Setup:

1. Create a Google Cloud service account.
2. Enable the Google Sheets API for the project.
3. Create a private key for the service account.
4. Create or open the target spreadsheet.
5. In the CRM admin panel, open Settings and enable Google Sheets sync.
6. Fill Spreadsheet ID, service account email, private key, and sheet names.
7. Share the spreadsheet with the service account email as Editor.

The private key is stored in the app settings database for admin convenience. Keep database access restricted and never commit the key to Git.
