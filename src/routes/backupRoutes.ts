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

        for (const table of TABLES) {
            if (Array.isArray(json[table]) && json[table].length > 0) {
                for (const row of json[table]) {
                    const keys = Object.keys(row);
                    const cols = keys.map(k => `\`${k}\``).join(', ');
                    const placeholders = keys.map(() => '?').join(', ');
                    const values = keys.map(k => {
                        const v = row[k];
                        if (v === '' && (k.includes('date') || k.endsWith('_at'))) {
                            return null;
                        }
                        return v;
                    });
                    await db.run(`REPLACE INTO \`${table}\` (${cols}) VALUES (${placeholders})`, values);
                    totalImported++;
                }
            }
        }

        return res.json({ message: `Database imported successfully! ${totalImported} records safely imported into MySQL.` });
    } catch (error: any) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message || 'Failed to import database' });
    }
});

export default router;
