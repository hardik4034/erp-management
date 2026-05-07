/**
 * logger.js — Centralized Winston Logger
 *
 * Production behaviour:
 *   - Writes error-level logs to logs/error.log
 *   - Writes all-level logs  to logs/combined.log
 *   - Console output only in development (colorised, human-readable)
 *
 * Usage:
 *   const logger = require('./utils/logger');
 *   logger.info('Server started', { port: 5000 });
 *   logger.error('DB connection failed', { error: err.message });
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, json, colorize, printf, errors } = format;

// Human-readable format for development console
const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

// JSON format for production files (parseable by log aggregators)
const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
);

const logger = createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    defaultMeta: { service: 'hrms-api' },
    transports: [
        // Error log — only error level
        new transports.File({
            filename: path.join(logsDir, 'error.log'),
            level:    'error',
            format:   prodFormat,
            maxsize:  10 * 1024 * 1024, // 10 MB
            maxFiles: 5,
            tailable: true,
        }),
        // Combined log — all levels
        new transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format:   prodFormat,
            maxsize:  20 * 1024 * 1024, // 20 MB
            maxFiles: 10,
            tailable: true,
        }),
    ],
});

// Development console transport
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({ format: devFormat }));
}

// In production, also log errors to console for PM2 stdout capture
if (process.env.NODE_ENV === 'production') {
    logger.add(new transports.Console({
        level:  'error',
        format: combine(timestamp(), json()),
    }));
}

module.exports = logger;
