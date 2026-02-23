/**
 * Biometric Scheduler Service
 * Automatically syncs punch logs from eSSL ADMS devices
 * and processes them into Attendance records via stored procedure.
 *
 * Schedule (configurable via .env):
 *   BIOMETRIC_SYNC_CRON     – pull raw logs from all active devices  (default: 00:30 daily)
 *   BIOMETRIC_PROCESS_CRON  – convert logs → Attendance records       (default: 01:00 daily)
 *
 * Usage: require('./schedulerService') inside server.js
 */

const cron = require('node-cron');
const sql  = require('mssql');
const esslAdmsService = require('./esslAdmsService');

// ── Helper: validate credentials before scheduling ──────────────────────────
function credentialsConfigured() {
    const token  = process.env.ESSL_ADMS_TOKEN  || '';
    const apiKey = process.env.ESSL_ADMS_API_KEY || '';
    const apiUrl = process.env.ESSL_ADMS_API_URL || '';

    if (!apiUrl || apiUrl.includes('your_') ) return false;
    if ((!token || token.includes('your_')) && (!apiKey || apiKey.includes('your_'))) return false;
    return true;
}

// ── Sync all active devices ──────────────────────────────────────────────────
async function syncAllDevices() {
    const jobName = '[BiometricScheduler][Sync]';
    console.log(`${jobName} Starting automatic sync — ${new Date().toISOString()}`);

    if (!credentialsConfigured()) {
        console.warn(`${jobName} ⚠️  eSSL ADMS credentials not configured. Skipping sync.`);
        console.warn(`${jobName}    Set ESSL_ADMS_API_URL and ESSL_ADMS_TOKEN in .env`);
        return;
    }

    try {
        const pool = await sql.connect();

        // Fetch all active devices
        const devicesResult = await pool.request().query(`
            SELECT device_id, device_name
            FROM biometric_devices
            WHERE status = 'active'
        `);

        if (devicesResult.recordset.length === 0) {
            console.log(`${jobName} No active devices found. Skipping.`);
            return;
        }

        const daysBack = parseInt(process.env.BIOMETRIC_SYNC_DAYS_BACK || '7', 10);
        const endDate  = new Date();
        const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

        let totalInserted = 0;
        let totalSkipped  = 0;

        for (const device of devicesResult.recordset) {
            try {
                console.log(`${jobName} Syncing device: ${device.device_id} (${device.device_name})`);

                const logsResult = await esslAdmsService.fetchAttendanceLogs(
                    device.device_id, startDate, endDate
                );

                if (!logsResult.success || logsResult.logs.length === 0) {
                    console.log(`${jobName} No new logs for device ${device.device_id}`);
                    continue;
                }

                let deviceInserted = 0;
                let deviceSkipped  = 0;

                for (const log of logsResult.logs) {
                    try {
                        // Prevent duplicates
                        const existing = await pool.request()
                            .input('deviceId',        sql.NVarChar, device.device_id)
                            .input('biometricUserId', sql.NVarChar, log.biometricUserId)
                            .input('punchTime',       sql.DateTime, log.punchTime)
                            .query(`
                                SELECT id FROM biometric_logs
                                WHERE device_id           = @deviceId
                                  AND biometric_user_id   = @biometricUserId
                                  AND punch_time          = @punchTime
                            `);

                        if (existing.recordset.length > 0) {
                            deviceSkipped++;
                            continue;
                        }

                        await pool.request()
                            .input('deviceId',        sql.NVarChar,  device.device_id)
                            .input('biometricUserId', sql.NVarChar,  log.biometricUserId)
                            .input('punchTime',       sql.DateTime,  log.punchTime)
                            .input('punchType',       sql.NVarChar,  log.punchType || 'IN')
                            .input('rawJson',         sql.NVarChar,  JSON.stringify(log.rawData))
                            .query(`
                                INSERT INTO biometric_logs
                                    (device_id, biometric_user_id, punch_time, punch_type, raw_json, processed, created_at)
                                VALUES
                                    (@deviceId, @biometricUserId, @punchTime, @punchType, @rawJson, 0, GETDATE())
                            `);

                        deviceInserted++;
                    } catch (logErr) {
                        console.error(`${jobName} Error inserting log: ${logErr.message}`);
                    }
                }

                // Update last_sync timestamp
                await pool.request()
                    .input('deviceId', sql.NVarChar, device.device_id)
                    .query(`
                        UPDATE biometric_devices
                        SET last_sync  = GETDATE(),
                            updated_at = GETDATE()
                        WHERE device_id = @deviceId
                    `);

                console.log(`${jobName} Device ${device.device_id}: ${deviceInserted} inserted, ${deviceSkipped} skipped`);
                totalInserted += deviceInserted;
                totalSkipped  += deviceSkipped;

            } catch (deviceErr) {
                console.error(`${jobName} Error syncing device ${device.device_id}: ${deviceErr.message}`);
                // Continue with next device
            }
        }

        console.log(`${jobName} ✅ Sync complete — Total inserted: ${totalInserted}, skipped: ${totalSkipped}`);

    } catch (err) {
        console.error(`${jobName} ❌ Fatal sync error: ${err.message}`);
    }
}

// ── Process punch logs → Attendance records ──────────────────────────────────
async function processLogs() {
    const jobName = '[BiometricScheduler][Process]';
    console.log(`${jobName} Starting log processing — ${new Date().toISOString()}`);

    try {
        const pool = await sql.connect();

        const result = await pool.request().execute('sp_ProcessBiometricLogs');

        const summary = result.recordset && result.recordset[0];
        if (summary) {
            console.log(`${jobName} ✅ Processing complete:`);
            console.log(`${jobName}    Logs marked processed   : ${summary.LogsMarkedProcessed}`);
            console.log(`${jobName}    Employees processed      : ${summary.EmployeesProcessed}`);
            console.log(`${jobName}    Attendance records touched: ${summary.AttendanceRecordsTouched}`);
            console.log(`${jobName}    Date range               : ${summary.ProcessedFromDate} → ${summary.ProcessedToDate}`);
        } else {
            console.log(`${jobName} ✅ Processing complete. No summary returned (no unprocessed logs?).`);
        }

    } catch (err) {
        console.error(`${jobName} ❌ Fatal process error: ${err.message}`);
    }
}

// ── Register cron jobs ────────────────────────────────────────────────────────
function initBiometricScheduler() {
    const enabled = process.env.BIOMETRIC_SCHEDULER_ENABLED !== 'false';

    if (!enabled) {
        console.log('[BiometricScheduler] Scheduler is DISABLED (BIOMETRIC_SCHEDULER_ENABLED=false)');
        return;
    }

    const syncCron    = process.env.BIOMETRIC_SYNC_CRON    || '30 0 * * *'; // 12:30 AM
    const processCron = process.env.BIOMETRIC_PROCESS_CRON || '0 1 * * *';  // 01:00 AM

    // Validate cron expressions
    if (!cron.validate(syncCron)) {
        console.error(`[BiometricScheduler] ❌ Invalid BIOMETRIC_SYNC_CRON: "${syncCron}"`);
        return;
    }
    if (!cron.validate(processCron)) {
        console.error(`[BiometricScheduler] ❌ Invalid BIOMETRIC_PROCESS_CRON: "${processCron}"`);
        return;
    }

    // Job 1: Sync raw punch logs from all devices
    cron.schedule(syncCron, syncAllDevices, {
        scheduled: true,
        timezone: 'Asia/Kolkata'  // Change to your timezone (e.g. 'UTC', 'America/New_York')
    });

    // Job 2: Process logs into Attendance records (runs after sync)
    cron.schedule(processCron, processLogs, {
        scheduled: true,
        timezone: 'Asia/Kolkata'
    });

    console.log('='.repeat(50));
    console.log('🕐 Biometric Scheduler Initialized');
    console.log(`   Sync job    : ${syncCron} (Asia/Kolkata)`);
    console.log(`   Process job : ${processCron} (Asia/Kolkata)`);
    if (!credentialsConfigured()) {
        console.warn('   ⚠️  WARNING: eSSL ADMS credentials not configured!');
        console.warn('      Sync job will skip until ESSL_ADMS_TOKEN is set in .env');
    }
    console.log('='.repeat(50));
}

module.exports = { initBiometricScheduler, syncAllDevices, processLogs };
