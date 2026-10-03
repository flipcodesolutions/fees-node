import express from 'express'; // Triggering restart
import path from 'path';
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
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({
    origin: [
        "https://fees.shivcomputers.in",
        "http://localhost:5173",
        "http://localhost:5000"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve static files from the React app
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inquiries', protect, inquiryRoutes);
app.use('/api/courses', protect, courseRoutes);
app.use('/api/admissions', protect, admissionRoutes);
app.use('/api/fees', protect, feeRoutes);
app.use('/api/backup', protect, backupRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/settings', protect, settingsRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
});


// For any other request, send back the index.html (for SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(
    PORT,
    "0.0.0.0",
    async () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        try {
            await getDatabase();
            console.log(`Database initialized successfully at: ${dbPath}`);
        } catch (error) {
            console.error("Failed to initialize database on startup:", error);
        }
    }
);
