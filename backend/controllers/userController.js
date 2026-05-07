const userService = require('../services/userService');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const { validationResult } = require('express-validator');
const { getConnection } = require('../config/database');
const sql = require('mssql');
const { invalidateUserCache } = require('../middleware/userAuthMiddleware');
const logger = require('../utils/logger');

const userController = {
    /**
     * Create a new user (Admin Only)
     */
    create: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { username, password, fullName, email, roleId } = req.body;
        const adminId = req.user.id;
        const ipAddress = req.ip;

        try {
            // Check if user already exists
            const existingUser = await userService.getUserByUsername(username);
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Username already exists' });
            }

            // Hash password
            const passwordHash = await authService.hashData(password);

            const userId = await userService.createUser({
                username,
                passwordHash,
                fullName,
                email,
                roleId
            }, adminId);

            await auditService.logAction({ 
                action: 'USER_CREATE', 
                performedBy: adminId, 
                targetUserId: userId, 
                details: { username, roleId },
                ipAddress 
            });

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                userId
            });
        } catch (error) {
            logger.error('User Creation Error', { error: error.message });
            res.status(500).json({ success: false, message: 'Failed to create user' });
        }
    },

    /**
     * List all users (Admin Only)
     */
    getAll: async (req, res) => {
        try {
            // 1. Fetch System Users from HRMS database ( consolidated)
            const users = await userService.getAllUsers();
            
            // 2. Fetch Employees from HRMS database
            const pool = await getConnection();
            const employeeResult = await pool.request().execute('sp_GetAllEmployees');
            const employees = employeeResult.recordset;

            // 3. Merge them. Robust matching using EmployeeId and Username (EmployeeCode).
            // Map users for fast lookup with robust type/string handling
            const userByEmpId = {};
            const userByUsername = {};
            users.forEach(u => {
                if (u.employee_id) {
                    userByEmpId[Number(u.employee_id)] = u;
                }
                if (u.username) {
                    userByUsername[u.username.trim().toLowerCase()] = u;
                }
            });

            // Map each employee to a "System User View"
            const combinedData = employees.map(emp => {
                // 1. Try matching by employeeId (Robust cast)
                let matchedUser = userByEmpId[Number(emp.EmployeeId)];
                
                // 2. Fallback to username matching (EmployeeCode) - robust trim/case
                if (!matchedUser && emp.EmployeeCode) {
                    matchedUser = userByUsername[emp.EmployeeCode.trim().toLowerCase()];
                }

                return {
                    id: matchedUser ? matchedUser.id : null,
                    username: matchedUser ? matchedUser.username : (emp.EmployeeCode || 'No Login'),
                    full_name: `${emp.FirstName} ${emp.LastName}`,
                    email: matchedUser ? (matchedUser.email || emp.Email) : emp.Email,
                    role_name: matchedUser ? matchedUser.role_name : (emp.UserRole || emp.Designation || 'Employee'),
                    status: matchedUser ? matchedUser.status : 'No Account',
                    must_change_password: matchedUser ? matchedUser.must_change_password : false,
                    employee_id: emp.EmployeeId,
                    has_account: !!matchedUser
                };
            });

            res.json({ success: true, data: combinedData });
        } catch (error) {
            logger.error('Error in userController.getAll', { error: error.message });
            res.status(500).json({ success: false, message: 'Failed to fetch merged users and employees list' });
        }
    },

    /**
     * Reset a user's password (Admin Only)
     */
    resetPassword: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { password } = req.body;
        const adminId = req.user.id;
        const ipAddress = req.ip;

        try {
            const user = await userService.getUserById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const passwordHash = await authService.hashData(password);
            
            // Sets must_change_password to 1 when reset by admin
            await userService.updatePassword(id, passwordHash, 1);

            await auditService.logAction({ 
                action: 'USER_PASSWORD_RESET_ADMIN', 
                performedBy: adminId, 
                targetUserId: id,
                ipAddress 
            });
            
            invalidateUserCache(id);

            res.json({ success: true, message: 'Password reset successfully' });
        } catch (error) {
            logger.error('Password Reset Error', { error: error.message });
            res.status(500).json({ success: false, message: 'Failed to reset password' });
        }
    },

    /**
     * Change own password (Used for forced change)
     */
    changePassword: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const ipAddress = req.ip;

        try {
            const user = await userService.getUserById(userId);
            
            const isMatch = await authService.compareData(currentPassword, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Current password incorrect' });
            }

            const passwordHash = await authService.hashData(newPassword);
            await userService.updatePassword(userId, passwordHash, 0); // Sets must_change_password to 0

            await auditService.logAction({ 
                action: 'USER_PASSWORD_CHANGE_SELF', 
                performedBy: userId, 
                ipAddress 
            });

            invalidateUserCache(userId);

            res.json({ success: true, message: 'Password updated successfully' });
        } catch (error) {
            logger.error('Password Change Error', { error: error.message });
            res.status(500).json({ success: false, message: 'Failed to change password' });
        }
    },

    /**
     * Provision a new user account for an existing employee
     */
    provision: async (req, res) => {
        const { employeeId, password } = req.body;
        const adminId = req.user.id;
        const ipAddress = req.ip;

        try {
            // 1. Fetch Employee details from HRMS database
            const pool = await getConnection();
            const employeeResult = await pool.request()
                .input('EmployeeId', sql.Int, employeeId)
                .query('SELECT * FROM Employees WHERE EmployeeId = @EmployeeId');

            if (employeeResult.recordset.length === 0) {
                return res.status(404).json({ success: false, message: 'Employee not found' });
            }

            const emp = employeeResult.recordset[0];
            const username = emp.EmployeeCode;
            const email = emp.Email;
            const fullName = `${emp.FirstName} ${emp.LastName}`;

            // Fetch role ID based on employee UserRole (matching UserRoles table in HRMS)
            const roleName = emp.UserRole || 'Employee';
            const roleResult = await pool.request()
                .input('roleName', sql.NVarChar, roleName)
                .query('SELECT id FROM UserRoles WHERE name = @roleName');
            
            const roleId = roleResult.recordset.length > 0 ? roleResult.recordset[0].id : 4; // Default to Employee (4) in new schema

            // 2. Check if user already exists (Dual-Check by Username and EmployeeId)
            const existingUser = await userService.getUserByUsername(username);
            const existingByEmp = await userService.getUserByEmployeeId(employeeId);

            if (existingUser || existingByEmp) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee already has an account'
                });
            }

            // 3. Create account in HRMS-Users
            const passwordHash = await authService.hashData(password);
            const userId = await userService.createUser({
                username,
                passwordHash,
                fullName,
                email,
                roleId,
                employeeId
            }, adminId);

            // 4. Update Employee to allow login
            await pool.request()
                .input('EmployeeId', sql.Int, employeeId)
                .query('UPDATE Employees SET LoginAllowed = 1 WHERE EmployeeId = @EmployeeId');

            await auditService.logAction({ 
                action: 'USER_PROVISION', 
                performedBy: adminId, 
                targetUserId: userId, 
                details: { employeeId, username, roleId },
                ipAddress 
            });

            res.status(201).json({
                success: true,
                message: `Account created successfully for ${username}`,
                userId
            });
        } catch (error) {
            logger.error('Provision Error', { error: error.message });
            res.status(500).json({ success: false, message: error.message || 'Failed to provision account' });
        }
    },

    /**
     * Update user details (Admin Only)
     */
    update: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { id } = req.params;
        const { fullName, email, roleId, status } = req.body;
        const adminId = req.user.id;
        const ipAddress = req.ip;

        try {
            const user = await userService.getUserById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            await userService.updateUser(id, { fullName, email, roleId, status });

            await auditService.logAction({ 
                action: 'USER_UPDATE', 
                performedBy: adminId, 
                targetUserId: id, 
                details: { roleId, status },
                ipAddress 
            });

            invalidateUserCache(id);

            res.json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            logger.error('User Update Error', { error: error.message });
            res.status(500).json({ success: false, message: 'Failed to update user' });
        }
    },

    /**
     * Delete user (Admin Only)
     */
    delete: async (req, res) => {
        const { id } = req.params;
        const adminId = req.user.id;
        const ipAddress = req.ip;

        try {
            // Prevent deleting self
            if (parseInt(id) === parseInt(adminId)) {
                return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
            }

            const user = await userService.getUserById(id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            await userService.deleteUser(id);

            await auditService.logAction({ 
                action: 'USER_DELETE', 
                performedBy: adminId, 
                targetUserId: id, 
                details: { username: user.username },
                ipAddress 
            });

            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            logger.error('User Delete Error', { error: error.message });
            res.status(500).json({ success: false, message: 'Failed to delete user' });
        }
    }
};

module.exports = userController;
