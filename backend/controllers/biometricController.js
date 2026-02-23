/**
 * Biometric Controller (Enhanced)
 * Handles biometric device management, attendance sync,
 * log processing, and employee mapping validation.
 */

const sql            = require('mssql');
const esslAdmsService = require('../services/esslAdmsService');
const { syncAllDevices, processLogs } = require('../services/schedulerService');

// ── Credential check helper ──────────────────────────────────────────────────
function credentialsConfigured() {
    const token  = process.env.ESSL_ADMS_TOKEN  || '';
    const apiKey = process.env.ESSL_ADMS_API_KEY || '';
    const apiUrl = process.env.ESSL_ADMS_API_URL || '';
    if (!apiUrl || apiUrl.includes('your_')) return false;
    if ((!token || token.includes('your_')) && (!apiKey || apiKey.includes('your_'))) return false;
    return true;
}

/**
 * Connect a new biometric device
 * POST /api/biometric/connect
 * Body: { deviceId: string }
 */
exports.connectDevice = async (req, res) => {
    const { deviceId } = req.body;

    if (!deviceId || deviceId.trim() === '') {
        return res.status(400).json({ success: false, message: 'Device ID is required' });
    }

    if (!credentialsConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'eSSL ADMS credentials not configured. Please set ESSL_ADMS_API_URL and ESSL_ADMS_TOKEN in your .env file.'
        });
    }

    try {
        const validation = await esslAdmsService.validateDevice(deviceId.trim());

        if (!validation.success) {
            return res.status(400).json({ success: false, message: validation.error || 'Device validation failed' });
        }

        const pool        = await sql.connect();
        const checkResult = await pool.request()
            .input('deviceId', sql.NVarChar, deviceId.trim())
            .query('SELECT id, device_id, status FROM biometric_devices WHERE device_id = @deviceId');

        if (checkResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Device already connected',
                device: checkResult.recordset[0]
            });
        }

        const insertResult = await pool.request()
            .input('deviceId',   sql.NVarChar, deviceId.trim())
            .input('deviceName', sql.NVarChar, validation.device.deviceName || deviceId)
            .input('status',     sql.NVarChar, 'active')
            .query(`
                INSERT INTO biometric_devices (device_id, device_name, status, created_at, updated_at)
                VALUES (@deviceId, @deviceName, @status, GETDATE(), GETDATE());

                SELECT id, device_id, device_name, status, created_at
                FROM biometric_devices
                WHERE device_id = @deviceId;
            `);

        return res.status(201).json({
            success: true,
            message: 'Device connected successfully',
            device: insertResult.recordset[0]
        });

    } catch (error) {
        console.error('[biometricController][connectDevice]', error);
        return res.status(500).json({ success: false, message: 'Failed to connect device', error: error.message });
    }
};

/**
 * Sync attendance logs from a specific device
 * POST /api/biometric/sync/:deviceId
 * Query params: startDate, endDate (optional)
 */
exports.syncAttendance = async (req, res) => {
    const { deviceId }          = req.params;
    const { startDate, endDate } = req.query;

    if (!credentialsConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'eSSL ADMS credentials not configured. Please set ESSL_ADMS_API_URL and ESSL_ADMS_TOKEN in your .env file.'
        });
    }

    const end   = endDate   ? new Date(endDate)   : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
        const pool        = await sql.connect();
        const deviceCheck = await pool.request()
            .input('deviceId', sql.NVarChar, deviceId)
            .query('SELECT id, device_id, status FROM biometric_devices WHERE device_id = @deviceId');

        if (deviceCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Device not found. Please connect the device first.' });
        }

        if (deviceCheck.recordset[0].status !== 'active') {
            return res.status(400).json({ success: false, message: 'Device is not active' });
        }

        const logsResult = await esslAdmsService.fetchAttendanceLogs(deviceId, start, end);

        if (!logsResult.success) {
            return res.status(400).json({ success: false, message: logsResult.error || 'Failed to fetch attendance logs' });
        }

        if (logsResult.logs.length === 0) {
            await pool.request()
                .input('deviceId', sql.NVarChar, deviceId)
                .query('UPDATE biometric_devices SET last_sync = GETDATE() WHERE device_id = @deviceId');
            return res.status(200).json({ success: true, message: 'No new attendance logs found', count: 0 });
        }

        let insertedCount = 0;
        let skippedCount  = 0;

        for (const log of logsResult.logs) {
            try {
                const existingLog = await pool.request()
                    .input('deviceId',        sql.NVarChar, deviceId)
                    .input('biometricUserId', sql.NVarChar, log.biometricUserId)
                    .input('punchTime',       sql.DateTime, log.punchTime)
                    .query(`
                        SELECT id FROM biometric_logs
                        WHERE device_id = @deviceId AND biometric_user_id = @biometricUserId AND punch_time = @punchTime
                    `);

                if (existingLog.recordset.length > 0) { skippedCount++; continue; }

                await pool.request()
                    .input('deviceId',        sql.NVarChar, deviceId)
                    .input('biometricUserId', sql.NVarChar, log.biometricUserId)
                    .input('punchTime',       sql.DateTime, log.punchTime)
                    .input('punchType',       sql.NVarChar, log.punchType || 'IN')
                    .input('rawJson',         sql.NVarChar, JSON.stringify(log.rawData))
                    .query(`
                        INSERT INTO biometric_logs
                            (device_id, biometric_user_id, punch_time, punch_type, raw_json, processed, created_at)
                        VALUES
                            (@deviceId, @biometricUserId, @punchTime, @punchType, @rawJson, 0, GETDATE())
                    `);

                insertedCount++;
            } catch (logError) {
                console.error('[biometricController][syncAttendance] log insert error:', logError.message);
            }
        }

        await pool.request()
            .input('deviceId', sql.NVarChar, deviceId)
            .query('UPDATE biometric_devices SET last_sync = GETDATE(), updated_at = GETDATE() WHERE device_id = @deviceId');

        return res.status(200).json({
            success: true,
            message: 'Attendance synced successfully',
            count:   insertedCount,
            skipped: skippedCount,
            total:   logsResult.logs.length
        });

    } catch (error) {
        console.error('[biometricController][syncAttendance]', error);
        return res.status(500).json({ success: false, message: 'Failed to sync attendance', error: error.message });
    }
};

/**
 * Get all connected devices
 * GET /api/biometric/devices
 */
exports.getDevices = async (req, res) => {
    try {
        const pool   = await sql.connect();
        const result = await pool.request().query(`
            SELECT
                id,
                device_id,
                device_name,
                status,
                last_sync,
                created_at,
                (SELECT COUNT(*) FROM biometric_logs WHERE device_id = biometric_devices.device_id)             AS log_count,
                (SELECT COUNT(*) FROM biometric_logs WHERE device_id = biometric_devices.device_id AND processed = 0) AS unprocessed_count
            FROM biometric_devices
            ORDER BY created_at DESC
        `);

        return res.status(200).json({
            success: true,
            devices: result.recordset,
            credentialsConfigured: credentialsConfigured()
        });

    } catch (error) {
        console.error('[biometricController][getDevices]', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch devices', error: error.message });
    }
};

/**
 * Delete a device
 * DELETE /api/biometric/devices/:deviceId
 */
exports.deleteDevice = async (req, res) => {
    const { deviceId } = req.params;

    try {
        const pool        = await sql.connect();
        const checkResult = await pool.request()
            .input('deviceId', sql.NVarChar, deviceId)
            .query('SELECT id FROM biometric_devices WHERE device_id = @deviceId');

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Device not found' });
        }

        await pool.request()
            .input('deviceId', sql.NVarChar, deviceId)
            .query('DELETE FROM biometric_devices WHERE device_id = @deviceId');

        return res.status(200).json({ success: true, message: 'Device deleted successfully' });

    } catch (error) {
        console.error('[biometricController][deleteDevice]', error);
        return res.status(500).json({ success: false, message: 'Failed to delete device', error: error.message });
    }
};

/**
 * Process biometric logs into Attendance records
 * POST /api/biometric/process
 * Body: { startDate?, endDate?, deviceId? }
 */
exports.processLogs = async (req, res) => {
    const { startDate, endDate, deviceId } = req.body || {};

    try {
        const pool = await sql.connect();

        const request = pool.request();

        // Pass optional parameters to the stored procedure
        if (startDate) request.input('StartDate', sql.Date, new Date(startDate));
        if (endDate)   request.input('EndDate',   sql.Date, new Date(endDate));
        if (deviceId)  request.input('DeviceId',  sql.NVarChar, deviceId);

        const result = await request.execute('sp_ProcessBiometricLogs');

        const summary = result.recordset && result.recordset[0];

        return res.status(200).json({
            success: true,
            message: 'Biometric logs processed successfully',
            summary: summary || null
        });

    } catch (error) {
        console.error('[biometricController][processLogs]', error);
        return res.status(500).json({ success: false, message: 'Failed to process biometric logs', error: error.message });
    }
};

/**
 * Get unmapped biometric user IDs (logs with no matching employee)
 * GET /api/biometric/unmapped
 */
exports.getUnmappedIds = async (req, res) => {
    try {
        const pool   = await sql.connect();
        const result = await pool.request().query(`
            SELECT
                bl.biometric_user_id    AS biometricUserId,
                COUNT(*)                AS logCount,
                MIN(bl.punch_time)      AS firstSeen,
                MAX(bl.punch_time)      AS lastSeen,
                COUNT(DISTINCT CAST(bl.punch_time AS DATE)) AS distinctDays
            FROM biometric_logs bl
            LEFT JOIN Employees e ON e.BiometricId = bl.biometric_user_id
            WHERE e.EmployeeId IS NULL
            GROUP BY bl.biometric_user_id
            ORDER BY logCount DESC
        `);

        // Also get employees who have no BiometricId set
        const unmappedEmployees = await pool.request().query(`
            SELECT
                e.EmployeeId,
                e.EmployeeCode,
                e.FirstName + ' ' + e.LastName AS FullName,
                e.BiometricId
            FROM Employees e
            WHERE e.Status = 'Active'
              AND (e.BiometricId IS NULL OR e.BiometricId = '')
            ORDER BY e.FirstName
        `);

        return res.status(200).json({
            success: true,
            unmappedBiometricIds: result.recordset,
            employeesWithoutBiometricId: unmappedEmployees.recordset,
            summary: {
                unmappedLogCount: result.recordset.length,
                employeesWithoutId: unmappedEmployees.recordset.length
            }
        });

    } catch (error) {
        console.error('[biometricController][getUnmappedIds]', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch unmapped IDs', error: error.message });
    }
};

/**
 * Manually trigger sync for all devices (same as scheduler)
 * POST /api/biometric/sync-all
 */
exports.syncAll = async (req, res) => {
    if (!credentialsConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'eSSL ADMS credentials not configured. Please set ESSL_ADMS_API_URL and ESSL_ADMS_TOKEN in your .env file.'
        });
    }

    try {
        // Run in background so API returns immediately
        syncAllDevices().catch(err => console.error('[biometricController][syncAll] background error:', err));

        return res.status(202).json({
            success: true,
            message: 'Sync started for all devices. Check server logs for progress.'
        });
    } catch (error) {
        console.error('[biometricController][syncAll]', error);
        return res.status(500).json({ success: false, message: 'Failed to trigger sync', error: error.message });
    }
};

/**
 * Get biometric integration status (health check)
 * GET /api/biometric/status
 */
exports.getStatus = async (req, res) => {
    try {
        const pool = await sql.connect();

        const stats = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM biometric_devices WHERE status = 'active')      AS activeDevices,
                (SELECT COUNT(*) FROM biometric_logs WHERE processed = 0)              AS unprocessedLogs,
                (SELECT COUNT(*) FROM biometric_logs WHERE processed = 1)              AS processedLogs,
                (SELECT MAX(last_sync) FROM biometric_devices)                         AS lastSync,
                (SELECT COUNT(*) FROM Employees WHERE BiometricId IS NOT NULL
                 AND Status = 'Active')                                                AS mappedEmployees,
                (SELECT COUNT(*) FROM Employees WHERE (BiometricId IS NULL OR BiometricId = '')
                 AND Status = 'Active')                                                AS unmappedEmployees
        `);

        return res.status(200).json({
            success: true,
            credentialsConfigured: credentialsConfigured(),
            schedulerEnabled: process.env.BIOMETRIC_SCHEDULER_ENABLED !== 'false',
            syncSchedule:    process.env.BIOMETRIC_SYNC_CRON    || '30 0 * * *',
            processSchedule: process.env.BIOMETRIC_PROCESS_CRON || '0 1 * * *',
            stats: stats.recordset[0]
        });

    } catch (error) {
        console.error('[biometricController][getStatus]', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch status', error: error.message });
    }
};
