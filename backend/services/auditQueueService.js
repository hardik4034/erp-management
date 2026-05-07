const { sql, getConnection } = require('../config/database');
const logger = require('../utils/logger');

class AuditQueueService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.batchSize = 50;
        this.flushIntervalMs = 5000; // Flush every 5 seconds
    }

    /**
     * Pushes a new audit log into the queue
     */
    enqueue(logPayload) {
        this.queue.push(logPayload);
        if (this.queue.length >= this.batchSize) {
            // Use setImmediate to not block the current event loop execution
            setImmediate(() => this.flush());
        }
    }

    /**
     * Flushes the current queue to the database
     */
    async flush() {
        if (this.queue.length === 0 || this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        // Extract a batch from the queue
        const batch = this.queue.splice(0, this.batchSize);

        try {
            const pool = await getConnection();
            
            const transaction = new sql.Transaction(pool);
            await transaction.begin();

            try {
                const request = new sql.Request(transaction);
                
                for (const log of batch) {
                    await request
                        .input('ActorUserId', sql.Int, log.actorUserId)
                        .input('ActorName', sql.NVarChar(150), log.actorName)
                        .input('ActorEmployeeId', sql.NVarChar(50), log.actorEmployeeId)
                        .input('ActorRole', sql.NVarChar(50), log.actorRole)
                        .input('Module', sql.NVarChar(100), log.module)
                        .input('Action', sql.NVarChar(50), log.action)
                        .input('Endpoint', sql.NVarChar(500), log.endpoint)
                        .input('TargetRecordId', sql.NVarChar(100), log.targetRecordId ? String(log.targetRecordId) : null)
                        .input('TargetEmployeeId', sql.NVarChar(50), log.targetEmployeeId)
                        .input('TargetEmployeeName', sql.NVarChar(150), log.targetEmployeeName)
                        .input('Payload', sql.NVarChar(sql.MAX), log.payload ? JSON.stringify(log.payload) : null)
                        .input('IpAddress', sql.NVarChar(50), log.ipAddress ? log.ipAddress.substring(0, 50) : null)
                        .input('UserAgent', sql.NVarChar(500), log.userAgent ? log.userAgent.substring(0, 500) : null)
                        .query(`
                            INSERT INTO AuditLogs (
                                ActorUserId, ActorName, ActorEmployeeId, ActorRole, 
                                Module, Action, Endpoint, RecordId, TargetEmployeeId, TargetEmployeeName,
                                Payload, IpAddress, UserAgent, CreatedAt,
                                -- Legacy fallback columns (keeping them NULL or using the new data where possible to avoid schema errors if strict)
                                UserId, Role
                            )
                            VALUES (
                                @ActorUserId, @ActorName, @ActorEmployeeId, @ActorRole, 
                                @Module, @Action, @Endpoint, @TargetRecordId, @TargetEmployeeId, @TargetEmployeeName,
                                @Payload, @IpAddress, @UserAgent, GETUTCDATE(),
                                @ActorUserId, @ActorRole
                            )
                        `);
                    
                    // Clear parameters for next iteration
                    request.parameters = {};
                }

                await transaction.commit();
            } catch (err) {
                logger.error('Audit batch transaction failed, rolling back', { error: err.message });
                await transaction.rollback();
            }

        } catch (error) {
            logger.error('Audit Flush Error — writing to fallback log', { error: error.message });
            // Fallback: Write batch to local file if DB is down
            const fs = require('fs');
            const path = require('path');
            const fallbackPath = path.join(__dirname, '../logs', 'audit_fallback.log');
            
            if (!fs.existsSync(path.dirname(fallbackPath))) {
                fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
            }

            fs.appendFileSync(fallbackPath, JSON.stringify(batch) + '\n');
        } finally {
            this.isProcessing = false;
            
            if (this.queue.length > 0) {
                setImmediate(() => this.flush());
            }
        }
    }
    /**
     * Stops the periodic flush interval (useful for tests)
     */
    stop() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }
}

const auditQueue = new AuditQueueService();
// Start the interval and store it
auditQueue.flushInterval = setInterval(() => auditQueue.flush(), auditQueue.flushIntervalMs);

module.exports = auditQueue;
