const logger = require('../utils/logger');

/**
 * Global Express Error Handler
 *
 * - Logs all errors through Winston (structured, levelled)
 * - Masks internal SQL errors from clients in production
 * - Exposes stack trace only in development
 */
const errorHandler = (err, req, res, next) => {
    // Always log the full error server-side
    logger.error('Request error', {
        method:     req.method,
        url:        req.originalUrl,
        ip:         req.ip,
        user:       req.user ? req.user.id : 'unauthenticated',
        error:      err.message,
        stack:      err.stack,
        statusCode: err.statusCode,
    });

    let statusCode = err.statusCode || 500;
    let message    = err.message    || 'Internal Server Error';

    // ── Express-Validator Errors ─────────────────────────────────────────────
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message    = Object.values(err.errors).map(e => e.message).join(', ');
    }

    // ── JWT Errors ───────────────────────────────────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message    = 'Invalid token';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message    = 'Token expired';
    }

    // ── MSSQL / Database Errors ──────────────────────────────────────────────
    if (err.name === 'RequestError' || err.code === 'EREQUEST') {
        statusCode = 500;
        if (process.env.NODE_ENV === 'production') {
            // Never leak SQL details to the client in production
            message = 'A database error occurred. Please contact support.';
        } else {
            const detail = err.number ? `SQL Error ${err.number}: ${err.message}` : err.message;
            message = err.procName ? `${detail} (Procedure: ${err.procName})` : detail;
        }
    }

    // ── Multer File Upload Errors ─────────────────────────────────────────────
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        message    = 'File too large. Maximum upload size is 5MB.';
    }

    const response = {
        success: false,
        error:   message,
    };

    // Stack trace only in development
    if (process.env.NODE_ENV !== 'production' && err.stack) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
