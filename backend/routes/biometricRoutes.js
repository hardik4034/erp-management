/**
 * Biometric Routes
 * API endpoints for biometric device and attendance management
 */

const express    = require('express');
const router     = express.Router();
const biometric  = require('../controllers/biometricController');

// ── Device Management ────────────────────────────────────────────────────────

/** POST /api/biometric/connect — Register a new biometric device */
router.post('/connect', biometric.connectDevice);

/** GET  /api/biometric/devices — List all connected devices */
router.get('/devices', biometric.getDevices);

/** DELETE /api/biometric/devices/:deviceId — Remove a device */
router.delete('/devices/:deviceId', biometric.deleteDevice);

// ── Sync ─────────────────────────────────────────────────────────────────────

/** POST /api/biometric/sync/:deviceId — Sync logs from one device
 *  Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD */
router.post('/sync/:deviceId', biometric.syncAttendance);

/** POST /api/biometric/sync-all — Trigger sync for ALL active devices */
router.post('/sync-all', biometric.syncAll);

// ── Processing ───────────────────────────────────────────────────────────────

/** POST /api/biometric/process — Convert raw punch logs → Attendance records
 *  Body: { startDate?, endDate?, deviceId? } */
router.post('/process', biometric.processLogs);

// ── Validation & Reporting ───────────────────────────────────────────────────

/** GET /api/biometric/unmapped — List biometric IDs with no matching employee */
router.get('/unmapped', biometric.getUnmappedIds);

/** GET /api/biometric/status — Integration health check */
router.get('/status', biometric.getStatus);

module.exports = router;
