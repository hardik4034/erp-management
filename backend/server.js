const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const morgan       = require('morgan');
const compression  = require('compression');
require('dotenv').config();

const logger              = require('./utils/logger');
const { getConnection, closeConnection } = require('./config/database');
const errorHandler        = require('./middleware/errorHandler');

// ── Route imports ──────────────────────────────────────────────────────────────
const employeeRoutes    = require('./routes/employeeRoutes');
const attendanceRoutes  = require('./routes/attendanceRoutes');
const leaveRoutes       = require('./routes/leaveRoutes');
const holidayRoutes     = require('./routes/holidayRoutes');
const departmentRoutes  = require('./routes/departmentRoutes');
const designationRoutes = require('./routes/designationRoutes');
const appreciationRoutes= require('./routes/appreciationRoutes');
const payrollRoutes     = require('./routes/payrollRoutes');
const salaryRoutes      = require('./routes/salaryRoutes');
const biometricRoutes   = require('./routes/biometricRoutes');
const documentRoutes    = require('./routes/documentRoutes');
const calendarRoutes    = require('./routes/calendarRoutes');
const assetRoutes       = require('./routes/assetRoutes');
const noteRoutes        = require('./routes/noteRoutes');
const userRoutes        = require('./routes/userRoutes');
const auditRoutes       = require('./routes/auditRoutes');
const { initBiometricScheduler } = require('./services/schedulerService');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Morgan HTTP request logger (streams to Winston) ────────────────────────────
const morganStream = { write: (msg) => logger.http(msg.trim()) };
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));

// ── Security headers (Helmet) ──────────────────────────────────────────────────
app.use(helmet({
    // Allow loading fonts/scripts from the same origin in production
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        directives: {
            defaultSrc:  ["'self'"],
            scriptSrc:   ["'self'"],
            styleSrc:    ["'self'", "'unsafe-inline'"],
            imgSrc:      ["'self'", 'data:'],
            connectSrc:  ["'self'"],
            fontSrc:     ["'self'"],
            objectSrc:   ["'none'"],
            upgradeInsecureRequests: [],
        }
    } : false, // Disabled in dev for easier debugging
    hsts: {
        maxAge:            31536000, // 1 year
        includeSubDomains: true,
        preload:           true,
    },
}));

// ── Compression ────────────────────────────────────────────────────────────────
app.use(compression());

// ── CORS — strict production configuration ─────────────────────────────────────
// In production set CORS_ORIGIN to your actual domain(s), comma-separated.
// Example: CORS_ORIGIN=https://hrms.yourcompany.com
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:8080', 'http://127.0.0.1:8080'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, mobile apps, Postman in dev)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // In production, block unknown origins
        if (process.env.NODE_ENV === 'production') {
            logger.warn('CORS blocked request', { origin });
            return callback(null, false);
        }
        // In development, allow all but log it
        logger.debug('CORS: non-listed origin allowed in dev', { origin });
        return callback(null, true);
    },
    credentials:     true, // Required for HTTP-only cookie forwarding
    optionsSuccessStatus: 200,
}));

// ── Body parsers ───────────────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));



// ── Health check (no auth) ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status:      'OK',
        message:     'HRMS API is running',
        environment: process.env.NODE_ENV,
        timestamp:   new Date().toISOString(),
    });
});

// ── Rate Limiters ──────────────────────────────────────────────────────────────
// Strict: auth login endpoint
const loginLimiter = rateLimit({
    windowMs:        15 * 60 * 1000, // 15 minutes
    max:             10,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
    handler: (req, res, next, options) => {
        logger.warn('Login rate limit exceeded', { ip: req.ip });
        res.status(options.statusCode).json(options.message);
    },
});

// Moderate: all API endpoints (prevents abuse/scraping)
const apiLimiter = rateLimit({
    windowMs:        1 * 60 * 1000,  // 1 minute
    max:             200,             // 200 requests per minute per IP
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
    skip: (req) => req.path === '/health', // Health check is exempt
});
app.use('/api', apiLimiter);

// ── Auth Middleware & Middleware imports ───────────────────────────────────────
const userAuthMiddleware         = require('./middleware/userAuthMiddleware');
const { enforcePasswordChange }  = require('./middleware/roleMiddleware');
const auditMiddleware            = require('./middleware/auditMiddleware');

// ── Public auth routes ─────────────────────────────────────────────────────────
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/authRoutes'));

// ── Protected routes — auth + password-change enforcement + audit ──────────────
app.use('/api', userAuthMiddleware);
app.use('/api', enforcePasswordChange);
app.use('/api', auditMiddleware);

// ── Static uploads (protected via auth middleware) ─────────────────────────────
app.use('/uploads', userAuthMiddleware);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Route Mounting ─────────────────────────────────────────────────────────
app.use('/api/users',        userRoutes);
app.use('/api/employees',    employeeRoutes);
app.use('/api/attendance',   attendanceRoutes);
app.use('/api/leaves',       leaveRoutes);
app.use('/api/holidays',     holidayRoutes);
app.use('/api/departments',  departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/appreciations',appreciationRoutes);
app.use('/api/payroll',      payrollRoutes);
app.use('/api/salary',       salaryRoutes);
app.use('/api/biometric',    biometricRoutes);
app.use('/api/documents',    documentRoutes);
app.use('/api/calendar',     calendarRoutes);
app.use('/api/assets',       assetRoutes);
app.use('/api/notes',        noteRoutes);
app.use('/api/audit',        auditRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler (must be last) ────────────────────────────────────────
app.use(errorHandler);

// ── Server startup ─────────────────────────────────────────────────────────────
const startServer = async () => {
    try {
        await getConnection();

        app.listen(PORT, () => {
            logger.info('═'.repeat(52));
            logger.info('🚀 HRMS Server Started Successfully');
            logger.info('═'.repeat(52));
            logger.info(`📍 Port       : ${PORT}`);
            logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🏥 Health     : http://localhost:${PORT}/health`);
            logger.info(`📋 Audit API  : http://localhost:${PORT}/api/audit`);
            logger.info('═'.repeat(52));

            initBiometricScheduler();
        });
    } catch (error) {
        logger.error('❌ Failed to start server', { error: error.message, stack: error.stack });
        process.exit(1);
    }
};

// Start the server ONLY if this file is run directly (not required as a module)
// AND we are not in a test environment.
if (require.main === module && process.env.NODE_ENV !== 'test') {
    startServer();
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────
const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    await closeConnection();
    process.exit(0);
};
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Unhandled rejection guard ──────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

module.exports = app;