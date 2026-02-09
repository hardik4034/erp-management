/**
 * Biometric Controller
 * Handles biometric device and attendance operations
 */

const sql = require('mssql');
const esslAdmsService = require('../services/esslAdmsService');

/**
 * Connect a new biometric device
 * POST /api/biometric/connect
 * Body: { deviceId: string }
 */
exports.connectDevice = async (req, res) => {
    const { deviceId } = req.body;
    
    // Validation
    if (!deviceId || deviceId.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Device ID is required'
        });
    }
    
    try {
        // Step 1: Validate device with ADMS API
        console.log(`Validating device: ${deviceId}`);
        const validation = await esslAdmsService.validateDevice(deviceId.trim());
        
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: validation.error || 'Device validation failed'
            });
        }
        
        // Step 2: Check if device already exists in database
        const pool = await sql.connect();
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
        
        // Step 3: Save device to database
        const insertResult = await pool.request()
            .input('deviceId', sql.NVarChar, deviceId.trim())
            .input('deviceName', sql.NVarChar, validation.device.deviceName || deviceId)
            .input('status', sql.NVarChar, 'active')
            .query(`
                INSERT INTO biometric_devices (device_id, device_name, status, created_at, updated_at)
                VALUES (@deviceId, @deviceName, @status, GETDATE(), GETDATE());
                
                SELECT id, device_id, device_name, status, created_at 
                FROM biometric_devices 
                WHERE device_id = @deviceId;
            `);
        
        const savedDevice = insertResult.recordset[0];
        
        console.log(`Device connected successfully: ${deviceId}`);
        
        return res.status(201).json({
            success: true,
            message: 'Device connected successfully',
            device: savedDevice
        });
        
    } catch (error) {
        console.error('Error connecting device:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to connect device',
            error: error.message
        });
    }
};

/**
 * Sync attendance logs from device
 * POST /api/biometric/sync/:deviceId
 * Optional query params: startDate, endDate
 */
exports.syncAttendance = async (req, res) => {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Default to last 7 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    try {
        // Step 1: Verify device exists in database
        const pool = await sql.connect();
        const deviceCheck = await pool.request()
            .input('deviceId', sql.NVarChar, deviceId)
            .query('SELECT id, device_id, status FROM biometric_devices WHERE device_id = @deviceId');
        
        if (deviceCheck.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found. Please connect the device first.'
            });
        }
        
        const device = deviceCheck.recordset[0];
        
        if (device.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Device is not active'
            });
        }
        
        // Step 2: Fetch attendance logs from ADMS API
        console.log(`Fetching attendance logs for device ${deviceId} from ${start.toISOString()} to ${end.toISOString()}`);
        const logsResult = await esslAdmsService.fetchAttendanceLogs(deviceId, start, end);
        
        if (!logsResult.success) {
            return res.status(400).json({
                success: false,
                message: logsResult.error || 'Failed to fetch attendance logs'
            });
        }
        
        if (logsResult.logs.length === 0) {
            // Update last_sync even if no logs
            await pool.request()
                .input('deviceId', sql.NVarChar, deviceId)
                .query('UPDATE biometric_devices SET last_sync = GETDATE() WHERE device_id = @deviceId');
            
            return res.status(200).json({
                success: true,
                message: 'No new attendance logs found',
                count: 0
            });
        }
        
        // Step 3: Insert logs into database
        let insertedCount = 0;
        let skippedCount = 0;
        
        for (const log of logsResult.logs) {
            try {
                // Check if log already exists (prevent duplicates)
                const existingLog = await pool.request()
                    .input('deviceId', sql.NVarChar, deviceId)
                    .input('biometricUserId', sql.NVarChar, log.biometricUserId)
                    .input('punchTime', sql.DateTime, log.punchTime)
                    .query(`
                        SELECT id FROM biometric_logs 
                        WHERE device_id = @deviceId 
                        AND biometric_user_id = @biometricUserId 
                        AND punch_time = @punchTime
                    `);
                
                if (existingLog.recordset.length > 0) {
                    skippedCount++;
                    continue;
                }
                
                // Insert new log
                await pool.request()
                    .input('deviceId', sql.NVarChar, deviceId)
                    .input('biometricUserId', sql.NVarChar, log.biometricUserId)
                    .input('punchTime', sql.DateTime, log.punchTime)
                    .input('punchType', sql.NVarChar, log.punchType || 'IN')
                    .input('rawJson', sql.NVarChar, JSON.stringify(log.rawData))
                    .query(`
                        INSERT INTO biometric_logs 
                        (device_id, biometric_user_id, punch_time, punch_type, raw_json, processed, created_at)
                        VALUES 
                        (@deviceId, @biometricUserId, @punchTime, @punchType, @rawJson, 0, GETDATE())
                    `);
                
                insertedCount++;
                
            } catch (logError) {
                console.error('Error inserting log:', logError);
                // Continue with next log
            }
        }
        
        // Step 4: Update last_sync timestamp
        await pool.request()
            .input('deviceId', sql.NVarChar, deviceId)
            .query('UPDATE biometric_devices SET last_sync = GETDATE(), updated_at = GETDATE() WHERE device_id = @deviceId');
        
        console.log(`Sync completed: ${insertedCount} inserted, ${skippedCount} skipped`);
        
        return res.status(200).json({
            success: true,
            message: 'Attendance synced successfully',
            count: insertedCount,
            skipped: skippedCount,
            total: logsResult.logs.length
        });
        
    } catch (error) {
        console.error('Error syncing attendance:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to sync attendance',
            error: error.message
        });
    }
};

/**
 * Get all connected devices
 * GET /api/biometric/devices
 */
exports.getDevices = async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .query(`
                SELECT 
                    id,
                    device_id,
                    device_name,
                    status,
                    last_sync,
                    created_at,
                    (SELECT COUNT(*) FROM biometric_logs WHERE device_id = biometric_devices.device_id) as log_count
                FROM biometric_devices
                ORDER BY created_at DESC
            `);
        
        return res.status(200).json({
            success: true,
            devices: result.recordset
        });
        
    } catch (error) {
        console.error('Error fetching devices:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch devices',
            error: error.message
        });
    }
};

/**
 * Delete a device
 * DELETE /api/biometric/devices/:deviceId
 */
exports.deleteDevice = async (req, res) => {
    const { deviceId } = req.params;
    
    try {
        const pool = await sql.connect();
        
        // Check if device exists
        const checkResult = await pool.request()
            .input('deviceId', sql.NVarChar, deviceId)
            .query('SELECT id FROM biometric_devices WHERE device_id = @deviceId');
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }
        
        // Delete device (logs will be cascade deleted)
        await pool.request()
            .input('deviceId', sql.NVarChar, deviceId)
            .query('DELETE FROM biometric_devices WHERE device_id = @deviceId');
        
        return res.status(200).json({
            success: true,
            message: 'Device deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting device:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to delete device',
            error: error.message
        });
    }
};
