"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express")); // Triggering restart
const path_1 = __importDefault(require("path"));
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
const PORT = Number(process.env.PORT) || 5000;
app.use((0, cors_1.default)({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
}));
app.use(express_1.default.json({ limit: '100mb' }));
app.use(express_1.default.urlencoded({ limit: '100mb', extended: true }));
// Serve static files from the React app
const frontendPath = process.env.FRONTEND_PATH || path_1.default.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express_1.default.static(frontendPath));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/inquiries', authMiddleware_1.protect, inquiryRoutes_1.default);
app.use('/api/courses', authMiddleware_1.protect, courseRoutes_1.default);
app.use('/api/admissions', authMiddleware_1.protect, admissionRoutes_1.default);
app.use('/api/fees', authMiddleware_1.protect, feeRoutes_1.default);
app.use('/api/backup', authMiddleware_1.protect, backupRoutes_1.default);
app.use('/api/whatsapp', whatsappRoutes_1.default);
app.use('/api/settings', authMiddleware_1.protect, settingsRoutes_1.default);
// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
});
// For any other request, send back the index.html (for SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(frontendPath, 'index.html'));
});
app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    try {
        await (0, database_1.getDatabase)();
        console.log(`Database initialized successfully at: ${database_1.dbPath}`);
    }
    catch (error) {
        console.error("Failed to initialize database on startup:", error);
    }
});
