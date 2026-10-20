# Backend Deployment & MySQL Configuration

This CRM backend runs on MySQL.

### Environment Variables
Configure the following environment variables on your server or hosting provider (e.g. Render, Railway, VPS):

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_key_here

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=fees_crm
```

### Automatic Table Initialization
On server startup, the backend automatically connects to MySQL, creates the database if needed, initializes all tables with UTF8MB4 charset, and seeds the default admin user (`admin` / `admin123`).

### Backup & Restore
Backup and restore are performed via authenticated JSON format using the `/api/backup/export` and `/api/backup/import` endpoints, or from the Settings -> Database Backup & Restore interface.
