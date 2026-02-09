/**
 * Biometric Routes
 * API endpoints for biometric device and attendance management
 */

const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');

/**
 * POST /api/biometric/connect
 * Connect a new biometric device
 * Body: { deviceId: string }
 */
router.post('/connect', biometricController.connectDevice);

/**
 * POST /api/biometric/sync/:deviceId
 * Sync attendance logs from a device
 * Query params: startDate, endDate (optional)
 */
router.post('/sync/:deviceId', biometricController.syncAttendance);

/**
 * GET /api/biometric/devices
 * Get all connected devices
 */
router.get('/devices', biometricController.getDevices);

/**
 * DELETE /api/biometric/devices/:deviceId
 * Delete a device
 */
router.delete('/devices/:deviceId', biometricController.deleteDevice);

module.exports = router;
