import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import inquiryRoutes from './routes/inquiryRoutes';
import courseRoutes from './routes/courseRoutes';
import admissionRoutes from './routes/admissionRoutes';
import feeRoutes from './routes/feeRoutes';
import authRoutes from './routes/authRoutes';
import backupRoutes from './routes/backupRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import settingsRoutes from './routes/settingsRoutes';
import { protect } from './middleware/authMiddleware';
import { getDatabase, dbPath } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Universal CORS & Preflight Middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow all origins including https://fees.shivcomputers.in and localhost
        callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.options('*', (req, res) => {
    res.status(200).end();
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve static files from the React app if available
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
}

// Root Route - Browser me direct https://api.shivcomputers.in khol kar check karne ke liye
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Shiv Computers Fees CRM API',
        message: 'Backend server is live and running successfully!',
        timestamp: new Date().toISOString()
    });
});

// Health & Diagnostic Routes
app.get('/api/health', async (req, res) => {
    let dbStatus = 'OK';
    let dbErrorMessage = null;
    try {
        await getDatabase();
    } catch (err: any) {
        dbStatus = 'FAILED';
        dbErrorMessage = err?.message || String(err);
    }

    res.json({
        status: dbStatus === 'OK' ? 'OK' : 'DEGRADED',
        message: 'Backend server is responsive',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        database: {
            status: dbStatus,
            path: dbPath,
            error: dbErrorMessage
        },
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'CORS & API routes are working perfectly!',
        originReceived: req.headers.origin || 'Direct Browser Request',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', protect, inquiryRoutes);
app.use('/api/courses', protect, courseRoutes);
app.use('/api/admissions', protect, admissionRoutes);
app.use('/api/fees', protect, feeRoutes);
app.use('/api/backup', protect, backupRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/settings', protect, settingsRoutes);

// Fallback for any other request
app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({
            error: 'Not Found',
            message: 'Endpoint does not exist'
        });
    }
});

// Global Error Handler to always preserve JSON and avoid HTML 500 error pages
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({
        status: 'Error',
        message: err?.message || 'Internal Server Error'
    });
});

// Start listening immediately
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    getDatabase()
        .then(() => {
            console.log(`Database initialized successfully at: ${dbPath}`);
        })
        .catch((error) => {
            console.error("Failed to initialize database on startup:", error);
        });
});
