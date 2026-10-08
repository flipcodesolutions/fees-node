/**
 * Standalone Migration Script: SQLite -> MySQL
 * Run with: node migrate-to-mysql.js
 */
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const TABLES = ['users', 'inquiries', 'courses', 'admissions', 'fees', 'fee_payments', 'settings'];

async function runMigration() {
    const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306;
    const user = process.env.DB_USER || process.env.MYSQL_USER || 'root';
    const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
    const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'fees_crm';

    const sqlitePath = process.env.DATABASE_PATH || path.resolve(__dirname, 'database.sqlite');

    console.log('--------------------------------------------------');
    console.log('🔄 Starting SQLite to MySQL Data Migration');
    console.log(`📁 Source SQLite: ${sqlitePath}`);
    console.log(`🌐 Target MySQL: ${user}@${host}:${port}/${database}`);
    console.log('--------------------------------------------------');

    let sqliteDb;
    try {
        sqliteDb = await open({
            filename: sqlitePath,
            driver: sqlite3.Database
        });
        console.log('✅ Connected to SQLite database.');
    } catch (err) {
        console.error('❌ Failed to open SQLite database:', err.message);
        process.exit(1);
    }

    // 1. Auto-create database if it does not exist
    try {
        const rootConn = await mysql.createConnection({
            host,
            port,
            user,
            password,
            charset: 'utf8mb4'
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await rootConn.end();
        console.log(`✅ Ensured MySQL database '${database}' exists.`);
    } catch (err) {
        console.warn(`Could not verify/create database '${database}' directly:`, err.message);
    }

    // 2. Connect to the target database
    let mysqlConn;
    try {
        mysqlConn = await mysql.createConnection({
            host,
            port,
            user,
            password,
            database,
            charset: 'utf8mb4'
        });
        console.log(`✅ Connected to MySQL database '${database}'.`);
    } catch (err) {
        console.error('❌ Failed to connect to MySQL:', err.message);
        console.error('👉 Please ensure your MySQL credentials in .env are correct.');
        process.exit(1);
    }

    // 3. Ensure tables exist in MySQL
    try {
        await mysqlConn.query(`
            CREATE TABLE IF NOT EXISTS inquiries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                mobile VARCHAR(50) NOT NULL,
                reference_name VARCHAR(255),
                inquiry_for VARCHAR(255),
                remark TEXT,
                status VARCHAR(50) DEFAULT 'Pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await mysqlConn.query(`
            CREATE TABLE IF NOT EXISTS courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course_code VARCHAR(100),
                name VARCHAR(255) NOT NULL,
                duration VARCHAR(100),
                fees VARCHAR(100),
                details TEXT,
                status VARCHAR(50) DEFAULT 'Active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await mysqlConn.query(`
            CREATE TABLE IF NOT EXISTS admissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inquiry_id INT NULL,
                student_name VARCHAR(255) NOT NULL,
                mobile VARCHAR(50) NOT NULL,
                reference_name VARCHAR(255),
                inquiry_for VARCHAR(255),
                remark TEXT,
                payload_json LONGTEXT,
                status VARCHAR(50) DEFAULT 'Active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await mysqlConn.query(`
            CREATE TABLE IF NOT EXISTS fees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admission_id INT UNIQUE,
                total_amount DECIMAL(12,2),
                paid_amount DECIMAL(12,2) DEFAULT 0,
                remaining_amount DECIMAL(12,2),
                status VARCHAR(50) DEFAULT 'Pending',
                next_payment_date VARCHAR(50),
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await mysqlConn.query(`
            CREATE TABLE IF NOT EXISTS fee_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admission_id INT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                remark TEXT,
                next_payment_date VARCHAR(50),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await mysqlConn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await mysqlConn.query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(255) PRIMARY KEY,
                value LONGTEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Ensured all 7 tables exist in MySQL.');
    } catch (err) {
        console.error('❌ Failed to ensure tables:', err.message);
    }

    // 4. Transfer data from SQLite to MySQL
    try {
        let totalRecords = 0;
        for (const table of TABLES) {
            process.stdout.write(`Migrating table '${table}'... `);
            let rows = [];
            try {
                rows = await sqliteDb.all(`SELECT * FROM ${table}`);
            } catch (err) {
                console.log(`⚠️ (Table not found in SQLite, skipping)`);
                continue;
            }

            if (!rows || rows.length === 0) {
                console.log(`0 records (Empty table).`);
                continue;
            }

            let inserted = 0;
            for (const row of rows) {
                const keys = Object.keys(row);
                const cols = keys.map(k => `\`${k}\``).join(', ');
                const placeholders = keys.map(() => '?').join(', ');
                const values = keys.map(k => {
                    const v = row[k];
                    // Sanitize empty string dates to null for MySQL
                    if (v === '' && (k.includes('date') || k.endsWith('_at'))) {
                        return null;
                    }
                    return v;
                });

                await mysqlConn.query(
                    `REPLACE INTO \`${table}\` (${cols}) VALUES (${placeholders})`,
                    values
                );
                inserted++;
            }
            totalRecords += inserted;
            console.log(`✅ ${inserted} records transferred.`);
        }

        console.log('--------------------------------------------------');
        console.log(`🎉 Migration completed successfully! Total ${totalRecords} records migrated into MySQL.`);
        console.log('--------------------------------------------------');
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
    } finally {
        await sqliteDb.close();
        await mysqlConn.end();
    }
}

runMigration();
