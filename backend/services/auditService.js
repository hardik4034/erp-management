const { getConnection } = require('../config/database');
const sql = require('mssql');
const logger = require('../utils/logger');

const auditService = {
    /**
     * Log a critical action to the audit_logs table
     */
    logAction: async ({ action, performedBy = null, targetUserId = null, ipAddress = null, details = null }) => {
        try {
            const pool = await getConnection();
            await pool.request()
                .input('action', sql.NVarChar(100), action)
                .input('performedBy', sql.Int, performedBy)
                .input('targetUserId', sql.Int, targetUserId)
                .input('ipAddress', sql.NVarChar(45), ipAddress)
                .input('details', sql.NVarChar(sql.MAX), typeof details === 'object' ? JSON.stringify(details) : details)
                .query(`
                    INSERT INTO audit_logs (action, performed_by, target_user_id, ip_address, details, timestamp)
                    VALUES (@action, @performedBy, @targetUserId, @ipAddress, @details, SYSDATETIMEOFFSET())
                `);
        } catch (error) {
            // We don't want audit logging failure to crash the main request, but we should log it
            logger.error('Audit Logging Failed', { error: error.message });
        }
    }
};

module.exports = auditService;
