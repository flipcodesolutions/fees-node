"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const inquiryRoutes_1 = __importDefault(require("./routes/inquiryRoutes"));
const courseRoutes_1 = __importDefault(require("./routes/courseRoutes"));
const admissionRoutes_1 = __importDefault(require("./routes/admissionRoutes"));
const feeRoutes_1 = __importDefault(require("./routes/feeRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const backupRoutes_1 = __importDefault(require("./routes/backupRoutes"));
const whatsappRoutes_1 = __importDefault(require("./routes/whatsappRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const database_1 = require("./config/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Universal CORS & Preflight Middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
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
const corsOptions = {
    origin: (origin, callback) => {
        // Allow all origins including https://fees.shivcomputers.in and localhost
        callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (req, res) => {
    res.status(200).end();
});
app.use(express_1.default.json({ limit: '100mb' }));
app.use(express_1.default.urlencoded({ limit: '100mb', extended: true }));
// Serve static files from the React app if available
const frontendPath = process.env.FRONTEND_PATH || path_1.default.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs_1.default.existsSync(frontendPath)) {
    app.use(express_1.default.static(frontendPath));
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
        await (0, database_1.getDatabase)();
    }
    catch (err) {
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
            path: database_1.dbPath,
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
app.use('/api/auth', authRoutes_1.default);
app.use('/api/inquiries', authMiddleware_1.protect, inquiryRoutes_1.default);
app.use('/api/courses', authMiddleware_1.protect, courseRoutes_1.default);
app.use('/api/admissions', authMiddleware_1.protect, admissionRoutes_1.default);
app.use('/api/fees', authMiddleware_1.protect, feeRoutes_1.default);
app.use('/api/backup', authMiddleware_1.protect, backupRoutes_1.default);
app.use('/api/whatsapp', whatsappRoutes_1.default);
app.use('/api/settings', authMiddleware_1.protect, settingsRoutes_1.default);
// Fallback for any other request
app.get('*', (req, res) => {
    const indexPath = path_1.default.join(frontendPath, 'index.html');
    if (fs_1.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        res.status(404).json({
            error: 'Not Found',
            message: 'Endpoint does not exist'
        });
    }
});
// Global Error Handler to always preserve JSON and avoid HTML 500 error pages
app.use((err, req, res, next) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({
        status: 'Error',
        message: err?.message || 'Internal Server Error'
    });
});
// Start listening immediately
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    (0, database_1.getDatabase)()
        .then(() => {
        console.log(`Database initialized successfully at: ${database_1.dbPath}`);
    })
        .catch((error) => {
        console.error("Failed to initialize database on startup:", error);
    });
});
