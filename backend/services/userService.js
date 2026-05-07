const { getAdminConnection } = require('../config/adminDatabase');
const sql = require('mssql');
const authConfig = require('../config/auth');

const userService = {
    /**
     * Get user by employee ID
     */
    getUserByEmployeeId: async (employeeId) => {
        const pool = await getAdminConnection();
        const result = await pool.request()
            .input('employeeId', sql.Int, employeeId)
            .query(`
                SELECT u.*, r.name as role_name 
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.employee_id = @employeeId
            `);
        return result.recordset[0];
    },

    /**
     * Get user by username with role details
     */
    getUserByUsername: async (username) => {
        const pool = await getAdminConnection();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(`
                SELECT u.*, r.name as role_name 
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.username = @username
            `);
        return result.recordset[0];
    },

    /**
     * Get user by ID
     */
    getUserById: async (id) => {
        const pool = await getAdminConnection();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT u.*, r.name as role_name 
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = @id
            `);
        return result.recordset[0];
    },

    /**
     * Update failed login attempts and handle lockout
     */
    handleFailedLogin: async (user) => {
        const pool = await getAdminConnection();
        const attempts = (user.failed_login_attempts || 0) + 1;
        let lockoutUntil = null;

        if (attempts >= authConfig.lockout.maxAttempts) {
            lockoutUntil = new Date(Date.now() + authConfig.lockout.duration);
        }

        await pool.request()
            .input('id', sql.Int, user.id)
            .input('attempts', sql.Int, attempts)
            .input('lockoutUntil', sql.DateTimeOffset, lockoutUntil)
            .query(`
                UPDATE users 
                SET failed_login_attempts = @attempts,
                    lockout_until = @lockoutUntil,
                    updated_at = SYSDATETIMEOFFSET()
                WHERE id = @id
            `);
            
        return { attempts, lockoutUntil };
    },

    /**
     * Reset failed attempts after successful login
     */
    resetFailedAttempts: async (userId) => {
        const pool = await getAdminConnection();
        await pool.request()
            .input('id', sql.Int, userId)
            .query(`
                UPDATE users 
                SET failed_login_attempts = 0,
                    lockout_until = NULL,
                    updated_at = SYSDATETIMEOFFSET()
                WHERE id = @id
            `);
    },

    /**
     * Create new user (Admin only)
     */
    createUser: async (userData, createdBy) => {
        const pool = await getAdminConnection();
        const result = await pool.request()
            .input('username', sql.NVarChar, userData.username)
            .input('password', sql.NVarChar, userData.passwordHash)
            .input('fullName', sql.NVarChar, userData.fullName)
            .input('email', sql.NVarChar, userData.email)
            .input('roleId', sql.Int, userData.roleId)
            .input('status', sql.NVarChar, 'Active')
            .input('mustChange', sql.Bit, 1) // Always true for new users
            .input('createdBy', sql.Int, createdBy)
            .input('employeeId', sql.Int, userData.employeeId || null)
            .query(`
                INSERT INTO users (username, password_hash, full_name, email, role_id, status, must_change_password, created_by, employee_id, created_at, updated_at)
                OUTPUT INSERTED.id
                VALUES (@username, @password, @fullName, @email, @roleId, @status, @mustChange, @createdBy, @employeeId, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET())
            `);
        return result.recordset[0].id;
    },

    /**
     * Update user password
     */
    updatePassword: async (userId, passwordHash, mustChange = 0) => {
        const pool = await getAdminConnection();
        await pool.request()
            .input('id', sql.Int, userId)
            .input('password', sql.NVarChar, passwordHash)
            .input('mustChange', sql.Bit, mustChange)
            .query(`
                UPDATE users 
                SET password_hash = @password,
                    must_change_password = @mustChange,
                    updated_at = SYSDATETIMEOFFSET()
                WHERE id = @id
            `);
    },

    /**
     * List users
     */
    getAllUsers: async () => {
        const pool = await getAdminConnection();
        const result = await pool.request().query(`
            SELECT u.id, u.username, u.full_name, u.email, u.status, u.role_id, r.name as role_name, u.employee_id, u.must_change_password, u.created_at, u.last_login
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `);
        return result.recordset;
    },

    /**
     * Update user details
     */
    updateUser: async (id, userData) => {
        const pool = await getAdminConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('fullName', sql.NVarChar, userData.fullName)
            .input('email', sql.NVarChar, userData.email)
            .input('roleId', sql.Int, userData.roleId)
            .input('status', sql.NVarChar, userData.status || 'Active')
            .query(`
                UPDATE users 
                SET full_name = @fullName,
                    email = @email,
                    role_id = @roleId,
                    status = @status,
                    updated_at = SYSDATETIMEOFFSET()
                WHERE id = @id
            `);
    },

    /**
     * Permanent delete user
     */
    deleteUser: async (id) => {
        const pool = await getAdminConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM users WHERE id = @id');
    }
};

module.exports = userService;
