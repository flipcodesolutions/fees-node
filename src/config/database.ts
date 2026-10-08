import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
sqlite3.verbose();
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// Use a configured database file path or default to a local file
const configuredDbPath = process.env.DATABASE_PATH || process.env.DATABASE_URL;
export const dbPath = configuredDbPath
    ? (path.isAbsolute(configuredDbPath) ? configuredDbPath : path.resolve(__dirname, '..', '..', configuredDbPath))
    : path.resolve(__dirname, '..', '..', 'database.sqlite');

const migrationsPath = process.env.MIGRATIONS_PATH
    ? (path.isAbsolute(process.env.MIGRATIONS_PATH) ? process.env.MIGRATIONS_PATH : path.resolve(__dirname, '..', '..', process.env.MIGRATIONS_PATH))
    : path.resolve(__dirname, '..', '..', 'migrations');

let db: Database | null = null;

export async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
    }
}

export async function getDatabase() {
    if (db) return db;

    // Ensure parent directory exists before sqlite attempts to open the database file
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Enable WAL mode for better performance
    await db.exec('PRAGMA journal_mode=WAL;');

    // Run migrations from /migrations folder
    await db.migrate({
        migrationsPath: migrationsPath,
    });

    // Keep older existing DBs compatible with current code.
    await ensureColumns(db, 'inquiries', [
        ['reference_name', 'TEXT'],
        ['inquiry_for', 'TEXT'],
        ['remark', 'TEXT'],
        ['status', "TEXT DEFAULT 'Pending'"],
        ['created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP'],
    ]);

    await ensureColumns(db, 'courses', [
        ['course_code', 'TEXT'],
        ['duration', 'TEXT'],
        ['fees', 'TEXT'],
        ['details', 'TEXT'],
        ['status', "TEXT DEFAULT 'Active'"],
        ['created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP'],
    ]);

    await ensureColumns(db, 'admissions', [
        ['inquiry_id', 'INTEGER'],
        ['student_name', 'TEXT'],
        ['mobile', 'TEXT'],
        ['reference_name', 'TEXT'],
        ['inquiry_for', 'TEXT'],
        ['remark', 'TEXT'],
        ['payload_json', 'TEXT'],
        ['status', "TEXT DEFAULT 'Active'"],
        ['created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP'],
    ]);

    // Fees summary table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS fees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admission_id INTEGER UNIQUE,
            total_amount REAL,
            paid_amount REAL DEFAULT 0,
            remaining_amount REAL,
            status TEXT DEFAULT 'Pending',
            next_payment_date TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Ensure next_payment_date column exists on older databases
    await ensureColumns(db, 'fees', [
        ['next_payment_date', 'TEXT'],
    ]);

    // Individual fee payments
    await db.exec(`
        CREATE TABLE IF NOT EXISTS fee_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admission_id INTEGER,
            amount REAL,
            payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            remark TEXT,
            next_payment_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Ensure next_payment_date column exists on fee_payments for older databases
    await ensureColumns(db, 'fee_payments', [
        ['next_payment_date', 'TEXT'],
    ]);

    // Users table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Settings table for dynamic configurations (e.g. WhatsApp API details)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    // Migrate email to username if it exists
    try {
        const tableInfo = await db.all("PRAGMA table_info(users)");
        const hasEmail = tableInfo.some((col: any) => col.name === 'email');
        if (hasEmail) {
            await db.exec("ALTER TABLE users RENAME COLUMN email TO username");
            // After rename, update old email back to 'admin'
            await db.run(
                "UPDATE users SET username = ? WHERE username = 'shivcomputer.snr@gmail.com'",
                ['admin']
            );
        }
    } catch (err) {
        console.error("Migration error for users table:", err);
    }

    // Ensure admin user exists with the correct username (password: admin123)
    const user = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!user) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
    } else if (user.password === 'admin123') {
        // Fix existing plain text password
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
    }


    return db;
}

async function ensureColumns(
    database: Database,
    table: string,
    columns: Array<[name: string, definition: string]>,
) {
    const existing: Array<{ name: string }> = await database.all(`PRAGMA table_info(${table});`);
    const existingNames = new Set(existing.map((c) => c.name));
    for (const [name, definition] of columns) {
        if (!existingNames.has(name)) {
            await database.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition};`);
        }
    }
}
