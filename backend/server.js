const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { getConnection, closeConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const designationRoutes = require('./routes/designationRoutes');
const appreciationRoutes = require('./routes/appreciationRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const { initBiometricScheduler } = require('./services/schedulerService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'HRMS API is running' });
});

// API Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/appreciations', appreciationRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/biometric', biometricRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await getConnection();
        
        app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log('🚀 HRMS Server Started Successfully');
            console.log('='.repeat(50));
            console.log(`📍 Server running on: http://localhost:${PORT}`);
            console.log(`🏥 Health check: http://localhost:${PORT}/health`);
            console.log(`👥 Employees API: http://localhost:${PORT}/api/employees`);
            console.log(`📅 Attendance API: http://localhost:${PORT}/api/attendance`);
            console.log(`🏖️  Leaves API: http://localhost:${PORT}/api/leaves`);
            console.log(`🎉 Holidays API: http://localhost:${PORT}/api/holidays`);
            console.log(`🏢 Departments API: http://localhost:${PORT}/api/departments`);
            console.log(`💼 Designations API: http://localhost:${PORT}/api/designations`);
            console.log(`🏆 Appreciations API: http://localhost:${PORT}/api/appreciations`);
            console.log(`💰 Payroll API: http://localhost:${PORT}/api/payroll`);
            console.log(`🔐 Biometric API: http://localhost:${PORT}/api/biometric`);
            console.log('='.repeat(50));
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('='.repeat(50));

            // Start biometric scheduler (cron jobs for auto-sync & log processing)
            initBiometricScheduler();
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏳ Shutting down gracefully...');
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⏳ Shutting down gracefully...');
    await closeConnection();
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
