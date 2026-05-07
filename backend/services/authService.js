const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const authConfig = require('../config/auth');
const { getAdminConnection } = require('../config/adminDatabase');
const sql = require('mssql');
const logger = require('../utils/logger');

const authService = {
    /**
     * Generate Access Token (Short-lived)
     */
    generateAccessToken: (user) => {
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role.toLowerCase(),
            employee_id: user.employee_id,
            mustChangePassword: !!user.mustChangePassword
        };

        return jwt.sign(payload, authConfig.jwt.accessSecret, {
            expiresIn: authConfig.jwt.accessExpiration
        });
    },

    /**
     * Generate Refresh Token (Long-lived)
     * Embeds a unique jti so we can do a single DB lookup instead of bcrypt scanning all sessions.
     */
    generateRefreshToken: (userId) => {
        const jti = crypto.randomBytes(16).toString('hex');
        return jwt.sign({ id: userId, type: 'refresh', jti }, authConfig.jwt.refreshSecret, {
            expiresIn: authConfig.jwt.refreshExpiration
        });
    },

    /**
     * Store Refresh Token in DB
     * Stores a bcrypt hash of the raw token AND the jti for fast lookup.
     */
    createSession: async ({ userId, token, ipAddress, userAgent }) => {
        const pool = await getAdminConnection();
        // Reduce bcrypt rounds to 8 (still secure, 4× faster than 10)
        const tokenHash = await bcrypt.hash(token, 8);
        const expiresAt = new Date(Date.now() + authConfig.cookies.maxAgeRefresh);

        // Decode to extract jti (already generated in generateRefreshToken)
        let jti = null;
        try {
            const decoded = jwt.decode(token);
            jti = decoded && decoded.jti ? decoded.jti : null;
        } catch (_) {}

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('tokenHash', sql.NVarChar, tokenHash)
            .input('expiresAt', sql.DateTimeOffset, expiresAt)
            .input('ipAddress', sql.NVarChar, ipAddress)
            .input('userAgent', sql.NVarChar, userAgent)
            .input('jti', sql.NVarChar(50), jti)
            .query(`
                INSERT INTO RefreshTokens (user_id, token_hash, expires_at, ip_address, user_agent, jti)
                VALUES (@userId, @tokenHash, @expiresAt, @ipAddress, @userAgent, @jti)
            `);
    },

    /**
     * Verify Access Token
     */
    verifyAccessToken: (token) => {
        try {
            return jwt.verify(token, authConfig.jwt.accessSecret);
        } catch (error) {
            return null;
        }
    },

    /**
     * Verify Refresh Token and handle Rotation
     * Uses jti for a fast single-row DB lookup (no bcrypt loop over all sessions).
     */
    verifyAndRotateSession: async (token, ipAddress, userAgent) => {
        try {
            const decoded = jwt.verify(token, authConfig.jwt.refreshSecret);
            const pool = await getAdminConnection();

            let currentSession = null;

            if (decoded.jti) {
                // Fast path: look up by jti directly
                const result = await pool.request()
                    .input('userId', sql.Int, decoded.id)
                    .input('jti', sql.NVarChar(50), decoded.jti)
                    .query('SELECT * FROM RefreshTokens WHERE user_id = @userId AND jti = @jti AND revoked_at IS NULL AND expires_at > SYSDATETIMEOFFSET()');

                if (result.recordset.length > 0) {
                    const session = result.recordset[0];
                    // Still verify the hash to detect tampering
                    const isMatch = await bcrypt.compare(token, session.token_hash);
                    if (isMatch) currentSession = session;
                }
            } else {
                // Fallback for old tokens without jti (slow path, kept for backward compat)
                const result = await pool.request()
                    .input('userId', sql.Int, decoded.id)
                    .query('SELECT * FROM RefreshTokens WHERE user_id = @userId AND revoked_at IS NULL AND expires_at > SYSDATETIMEOFFSET()');

                for (const session of result.recordset) {
                    const isMatch = await bcrypt.compare(token, session.token_hash);
                    if (isMatch) { currentSession = session; break; }
                }
            }

            if (!currentSession) {
                return null;
            }

            // Revoke current session (Rotation)
            const newToken = authService.generateRefreshToken(decoded.id);
            const newDecoded = jwt.decode(newToken);
            const newJti = newDecoded && newDecoded.jti ? newDecoded.jti : null;
            const newTokenHash = await bcrypt.hash(newToken, 8);
            const newExpiresAt = new Date(Date.now() + authConfig.cookies.maxAgeRefresh);

            await pool.request()
                .input('sessionId', sql.Int, currentSession.id)
                .input('userId', sql.Int, decoded.id)          // FIX: parameterized, was ${decoded.id}
                .input('newTokenHash', sql.NVarChar, newTokenHash)
                .input('newExpiresAt', sql.DateTimeOffset, newExpiresAt)
                .input('ipAddress', sql.NVarChar, ipAddress)
                .input('userAgent', sql.NVarChar, userAgent)
                .input('newJti', sql.NVarChar(50), newJti)
                .query(`
                    UPDATE RefreshTokens 
                    SET revoked_at = SYSDATETIMEOFFSET(), 
                        replaced_by_token = @newTokenHash 
                    WHERE id = @sessionId;

                    INSERT INTO RefreshTokens (user_id, token_hash, expires_at, ip_address, user_agent, jti)
                    VALUES (@userId, @newTokenHash, @newExpiresAt, @ipAddress, @userAgent, @newJti);
                `);

            return { userId: decoded.id, newToken };
        } catch (error) {
            logger.error('Refresh Token Verification Error', { error: error.message });
            return null;
        }
    },

    /**
     * Revoke Current Session
     */
    revokeSession: async (token) => {
        try {
            const decoded = jwt.verify(token, authConfig.jwt.refreshSecret);
            const pool = await getAdminConnection();

            // Fast-path: use jti for a direct single-row lookup (avoids bcrypt scanning all sessions)
            if (decoded.jti) {
                await pool.request()
                    .input('userId', sql.Int, decoded.id)
                    .input('jti', sql.NVarChar(50), decoded.jti)
                    .query(`UPDATE RefreshTokens
                            SET revoked_at = SYSDATETIMEOFFSET()
                            WHERE user_id = @userId AND jti = @jti AND revoked_at IS NULL`);
            } else {
                // Fallback for old tokens without jti (backward compat)
                const result = await pool.request()
                    .input('userId', sql.Int, decoded.id)
                    .query('SELECT * FROM RefreshTokens WHERE user_id = @userId AND revoked_at IS NULL');

                for (const session of result.recordset) {
                    if (await bcrypt.compare(token, session.token_hash)) {
                        await pool.request()
                            .input('sessionId', sql.Int, session.id)
                            .query('UPDATE RefreshTokens SET revoked_at = SYSDATETIMEOFFSET() WHERE id = @sessionId');
                        break;
                    }
                }
            }
        } catch (error) {
            // Silently ignore — expired or malformed tokens don't need to be revoked
        }
    },

    /**
     * Hash data
     */
    hashData: async (data) => {
        return await bcrypt.hash(data, authConfig.bcryptRounds);
    },

    /**
     * Compare data
     */
    compareData: async (data, hash) => {
        if (!data || !hash) return false;
        return await bcrypt.compare(data, hash);
    }
};

module.exports = authService;
