import { Router } from 'express';
import fs from 'fs';
import { dbPath, closeDatabase, getDatabase } from '../config/database';

const router = Router();

router.get('/export', async (req, res) => {
    try {
        const db = await getDatabase();
        // Force checkpoint to flush WAL to the main SQLite database file
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

        // Clean base64 string if data URL prefix exists
        if (typeof fileData === 'string' && fileData.includes(',')) {
            fileData = fileData.split(',')[1];
        }

        const buffer = Buffer.from(fileData, 'base64');
        if (buffer.length < 16) {
            return res.status(400).json({ error: 'Invalid file data. File is too small to be a SQLite database.' });
        }

        // Check SQLite magic header
        const header = buffer.toString('utf8', 0, 15);
        if (!header.startsWith('SQLite format 3')) {
            return res.status(400).json({ error: 'Invalid backup file. The uploaded file is not a valid SQLite database.' });
        }

        // Close database connection
        await closeDatabase();

        // Wait a short moment to ensure Windows releases file locks
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Delete any existing WAL/SHM files to keep SQLite clean
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        if (fs.existsSync(walPath)) {
            try { fs.unlinkSync(walPath); } catch (e) { console.error('Failed to unlink WAL', e); }
        }
        if (fs.existsSync(shmPath)) {
            try { fs.unlinkSync(shmPath); } catch (e) { console.error('Failed to unlink SHM', e); }
        }

        // Overwrite database file
        fs.writeFileSync(dbPath, buffer);

        // Re-initialize database connection
        await getDatabase();

        res.json({ message: 'Database imported successfully' });
    } catch (error: any) {
        console.error('Import error:', error);
        // Ensure we try to re-open connection
        try { await getDatabase(); } catch (e) { }
        res.status(500).json({ error: error.message || 'Failed to import database' });
    }
});

export default router;
