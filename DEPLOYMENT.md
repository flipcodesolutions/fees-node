# Render deployment: keep SQLite data between deploys

The default `database.sqlite` file is stored with the application code, so it is
not persistent on Render. Attach a persistent disk to the backend service and
point the app at a file on that disk:

1. In the Render dashboard, add a persistent disk to the backend web service
   with the mount path `/var/data`.
2. In that service's environment variables, set
   `DATABASE_PATH=/var/data/database.sqlite`.
3. Deploy/restart the service. The application creates the database file and
   its parent directory if they do not exist.

Before changing the path, download a backup from the authenticated
`GET /api/backup/export` endpoint. After the service is using the persistent
disk, restore that file through the authenticated `POST /api/backup/import`
endpoint (the request accepts the backup as base64 in `fileData`). Otherwise,
the newly mounted disk starts with a new, empty database. Keep a separate
backup as well; a persistent disk protects against deploys replacing the app
filesystem, but it is not a substitute for backups.

`DATABASE_URL` is still accepted as a legacy database-file path. Prefer
`DATABASE_PATH` for SQLite so it is not confused with a network database URL.
