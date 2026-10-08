import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { dbPath, closeDatabase, getDatabase } from '../config/database';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const router = Router();

const TABLES = ['users', 'inquiries', 'courses', 'admissions', 'fees', 'fee_payments', 'settings'];

router.get('/export', async (req, res) => {
    try {
        const db = await getDatabase();

        if (db.type === 'mysql') {
            // Export all tables as JSON backup
            const backupData: Record<string, any[]> = {};
            for (const table of TABLES) {
                backupData[table] = await db.all(`SELECT * FROM \`${table}\``);
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=fees_crm_backup.json');
            return res.send(JSON.stringify(backupData, null, 2));
        }

        // SQLite export
        await db.run('PRAGMA wal_checkpoint(TRUNCATE);');

        if (!fs.existsSync(dbPath)) {
            return res.status(404).json({ error: 'Database file not found' });
        }
        res.setHeader('Content-Type', 'application/x-sqlite3');
        res.setHeader('Content-Disposition', 'attachment; filename=database.sqlite');
        const src = fs.createReadStream(dbPath);
        src.pipe(res);
    } catch (error: any) {
        console.error('Export error:', error);
        res.status(500).json({ error: error.message || 'Failed to export database' });
    }
});

router.post('/import', async (req, res) => {
    try {
        let { fileData } = req.body;
        if (!fileData) {
            return res.status(400).json({ error: 'fileData is required (base64 format)' });
        }

        if (typeof fileData === 'string' && fileData.includes(',')) {
            fileData = fileData.split(',')[1];
        }

        const buffer = Buffer.from(fileData, 'base64');
        const db = await getDatabase();

        if (db.type === 'mysql') {
            // Check if uploaded file is JSON or SQLite
            const textStart = buffer.toString('utf8', 0, 50).trim();
            if (textStart.startsWith('{')) {
                // Parse JSON backup
                const json = JSON.parse(buffer.toString('utf8'));
                for (const table of TABLES) {
                    if (Array.isArray(json[table]) && json[table].length > 0) {
                        for (const row of json[table]) {
                            const keys = Object.keys(row);
                            const cols = keys.map(k => `\`${k}\``).join(', ');
                            const placeholders = keys.map(() => '?').join(', ');
                            const values = keys.map(k => row[k]);
                            await db.run(`REPLACE INTO \`${table}\` (${cols}) VALUES (${placeholders})`, values);
                        }
                    }
                }
                return res.json({ message: 'JSON backup imported into MySQL successfully' });
            }

            // If uploaded file is SQLite database, parse it and copy into MySQL!
            if (textStart.startsWith('SQLite format 3')) {
                const tempFilePath = path.join(os.tmpdir(), `import_${Date.now()}.sqlite`);
                fs.writeFileSync(tempFilePath, buffer);
                let totalImported = 0;
                try {
                    const tempDb = await open({
                        filename: tempFilePath,
                        driver: sqlite3.Database
                    });

                    for (const table of TABLES) {
                        try {
                            const rows = await tempDb.all(`SELECT * FROM ${table}`);
                            if (Array.isArray(rows) && rows.length > 0) {
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
                                    await db.run(`REPLACE INTO \`${table}\` (${cols}) VALUES (${placeholders})`, values);
                                    totalImported++;
                                }
                            }
                        } catch (err) {
                            console.warn(`Could not read table ${table} from imported SQLite file:`, err);
                        }
                    }
                    await tempDb.close();
                } finally {
                    if (fs.existsSync(tempFilePath)) {
                        try { fs.unlinkSync(tempFilePath); } catch (e) { }
                    }
                }
                return res.json({ message: `Database imported successfully! ${totalImported} records safely imported into MySQL.` });
            }

            return res.status(400).json({ error: 'Unsupported file format for MySQL import. Use JSON or SQLite backup file.' });
        }

        // SQLite import logic
        if (buffer.length < 16) {
            return res.status(400).json({ error: 'Invalid file data. File is too small to be a SQLite database.' });
        }

        const header = buffer.toString('utf8', 0, 15);
        if (!header.startsWith('SQLite format 3')) {
            return res.status(400).json({ error: 'Invalid backup file. The uploaded file is not a valid SQLite database.' });
        }

        await closeDatabase();
        await new Promise((resolve) => setTimeout(resolve, 300));

        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        if (fs.existsSync(walPath)) {
            try { fs.unlinkSync(walPath); } catch (e) { }
        }
        if (fs.existsSync(shmPath)) {
            try { fs.unlinkSync(shmPath); } catch (e) { }
        }

        fs.writeFileSync(dbPath, buffer);
        await getDatabase();

        res.json({ message: 'Database imported successfully' });
    } catch (error: any) {
        console.error('Import error:', error);
        try { await getDatabase(); } catch (e) { }
        res.status(500).json({ error: error.message || 'Failed to import database' });
    }
});

export default router;
