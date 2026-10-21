import mysql, { Pool } from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

export interface AppDatabase {
    get(sql: string, params?: any[]): Promise<any>;
    all(sql: string, params?: any[]): Promise<any[]>;
    run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>;
    exec(sql: string): Promise<any>;
    close(): Promise<void>;
    readonly type: 'mysql';
}

export function isUsingMysql(): boolean {
    return true;
}

function normalizeSqlForMysql(sql: string): string {
    return sql
        .replace(/\bBEGIN\s+TRANSACTION\b/gi, 'START TRANSACTION')
        .replace(/\bINSERT\s+OR\s+REPLACE\s+INTO\b/gi, 'REPLACE INTO')
        .replace(/PRAGMA\s+[^;]+;?/gi, '')
        .trim();
}

let dbInstance: AppDatabase | null = null;
let mysqlPool: Pool | null = null;

export async function closeDatabase() {
    if (dbInstance) {
        await dbInstance.close();
        dbInstance = null;
    }
    if (mysqlPool) {
        await mysqlPool.end();
        mysqlPool = null;
    }
}

async function createMysqlDatabase(): Promise<AppDatabase> {
    const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306;
    const user = process.env.DB_USER || process.env.MYSQL_USER || 'root';
    const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
    const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'fees_crm';

    console.log(`Connecting to MySQL at ${host}:${port}, database: ${database}, user: ${user}`);

    // Ensure database exists
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
    } catch (e: any) {
        // Ignored if user has limited permissions on cloud hosting
    }

    mysqlPool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4',
        decimalNumbers: true
    });

    // Test connection
    const testConn = await mysqlPool.getConnection();
    testConn.release();

    // Initialize tables and default admin
    await initMysqlTables(mysqlPool);

    const adapter: AppDatabase = {
        type: 'mysql',
        async get(sql: string, params?: any[]): Promise<any> {
            if (!mysqlPool) throw new Error('MySQL connection pool is not initialized');
            const normalized = normalizeSqlForMysql(sql);
            if (!normalized) return undefined;
            const [rows]: any = await mysqlPool.query(normalized, params || []);
            return Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
        },
        async all(sql: string, params?: any[]): Promise<any[]> {
            if (!mysqlPool) throw new Error('MySQL connection pool is not initialized');
            const normalized = normalizeSqlForMysql(sql);
            if (!normalized) return [];
            const [rows]: any = await mysqlPool.query(normalized, params || []);
            return Array.isArray(rows) ? rows : [];
        },
        async run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
            if (!mysqlPool) throw new Error('MySQL connection pool is not initialized');
            const normalized = normalizeSqlForMysql(sql);
            if (!normalized) return { lastID: 0, changes: 0 };
            const [result]: any = await mysqlPool.query(normalized, params || []);
            return {
                lastID: result && 'insertId' in result ? Number(result.insertId) : 0,
                changes: result && 'affectedRows' in result ? Number(result.affectedRows) : 0
            };
        },
        async exec(sql: string): Promise<any> {
            if (!mysqlPool) throw new Error('MySQL connection pool is not initialized');
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            for (const stmt of statements) {
                const normalized = normalizeSqlForMysql(stmt);
                if (normalized) {
                    await mysqlPool.query(normalized);
                }
            }
        },
        async close(): Promise<void> {
            if (mysqlPool) {
                await mysqlPool.end();
                mysqlPool = null;
            }
        }
    };

    return adapter;
}

async function initMysqlTables(pool: Pool) {
    await pool.query(`
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

    await pool.query(`
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

    await pool.query(`
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

    await pool.query(`
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

    await pool.query(`
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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
            \`key\` VARCHAR(255) PRIMARY KEY,
            value LONGTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure default admin user exists
    const [userRows]: any = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!userRows || userRows.length === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
    } else if (userRows[0].password === 'admin123') {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userRows[0].id]);
    }
}

export async function getDatabase(): Promise<AppDatabase> {
    if (dbInstance) return dbInstance;

    try {
        dbInstance = await createMysqlDatabase();
        console.log('✅ Connected to MySQL successfully.');
        return dbInstance;
    } catch (err) {
        console.error('❌ Failed to connect to MySQL:', err);
        throw err;
    }
}
