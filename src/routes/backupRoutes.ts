import { Router } from 'express';
import { getDatabase } from '../config/database';

const router = Router();

const TABLES = ['users', 'inquiries', 'courses', 'admissions', 'fees', 'fee_payments', 'settings'];

router.get('/export', async (req, res) => {
    try {
        const db = await getDatabase();

        // Export all tables as JSON backup
        const backupData: Record<string, any[]> = {};
        for (const table of TABLES) {
            backupData[table] = await db.all(`SELECT * FROM \`${table}\``);
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=fees_crm_backup.json');
        return res.send(JSON.stringify(backupData, null, 2));
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

        const textContent = buffer.toString('utf8').trim();
        if (!textContent.startsWith('{')) {
            return res.status(400).json({ error: 'Unsupported file format. Please upload a valid JSON backup file.' });
        }

        const json = JSON.parse(textContent);
        let totalImported = 0;

        await db.run('SET FOREIGN_KEY_CHECKS = 0');
        try {
            for (const table of TABLES) {
                if (Array.isArray(json[table]) && json[table].length > 0) {
                    // Fetch existing columns in this database table
                    const tableColsRaw = await db.all(`SHOW COLUMNS FROM \`${table}\``);
                    const validCols = new Set(tableColsRaw.map((c: any) => c.Field));

                    for (const row of json[table]) {
                        // Only use keys that actually exist in the target table
                        const keys = Object.keys(row).filter(k => validCols.has(k));
                        if (keys.length === 0) continue;

                        const cols = keys.map(k => `\`${k}\``).join(', ');
                        const placeholders = keys.map(() => '?').join(', ');
                        const values = keys.map(k => {
                            const v = row[k];
                            if (v === '' && (k.includes('date') || k.endsWith('_at'))) {
                                return null;
                            }
                            return v !== undefined ? v : null;
                        });
                        await db.run(`REPLACE INTO \`${table}\` (${cols}) VALUES (${placeholders})`, values);
                        totalImported++;
                    }
                }
            }
        } finally {
            await db.run('SET FOREIGN_KEY_CHECKS = 1');
        }

        return res.json({ message: `Database imported successfully! ${totalImported} records safely imported into MySQL.` });
    } catch (error: any) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message || 'Failed to import database' });
    }
});

export default router;
