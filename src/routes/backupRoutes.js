"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.get('/export', async (req, res) => {
    try {
        const db = await (0, database_1.getDatabase)();
        // Force checkpoint to flush WAL to the main SQLite database file
        await db.run('PRAGMA wal_checkpoint(TRUNCATE);');
        if (!fs_1.default.existsSync(database_1.dbPath)) {
            return res.status(404).json({ error: 'Database file not found' });
        }
        res.setHeader('Content-Type', 'application/x-sqlite3');
        res.setHeader('Content-Disposition', 'attachment; filename=database.sqlite');
        const src = fs_1.default.createReadStream(database_1.dbPath);
        src.pipe(res);
    }
    catch (error) {
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
        await (0, database_1.closeDatabase)();
        // Wait a short moment to ensure Windows releases file locks
        await new Promise((resolve) => setTimeout(resolve, 300));
        // Delete any existing WAL/SHM files to keep SQLite clean
        const walPath = `${database_1.dbPath}-wal`;
        const shmPath = `${database_1.dbPath}-shm`;
        if (fs_1.default.existsSync(walPath)) {
            try {
                fs_1.default.unlinkSync(walPath);
            }
            catch (e) {
                console.error('Failed to unlink WAL', e);
            }
        }
        if (fs_1.default.existsSync(shmPath)) {
            try {
                fs_1.default.unlinkSync(shmPath);
            }
            catch (e) {
                console.error('Failed to unlink SHM', e);
            }
        }
        // Overwrite database file
        fs_1.default.writeFileSync(database_1.dbPath, buffer);
        // Re-initialize database connection
        await (0, database_1.getDatabase)();
        res.json({ message: 'Database imported successfully' });
    }
    catch (error) {
        console.error('Import error:', error);
        // Ensure we try to re-open connection
        try {
            await (0, database_1.getDatabase)();
        }
        catch (e) { }
        res.status(500).json({ error: error.message || 'Failed to import database' });
    }
});
exports.default = router;
