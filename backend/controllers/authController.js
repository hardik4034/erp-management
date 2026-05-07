const userService = require('../services/userService');
const authService = require('../services/authService');
const auditService = require('../services/auditService');
const authConfig = require('../config/auth');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

const authController = {
    /**
     * Login user and set secure refresh cookie + return in-memory access token
     */
    login: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { username, password } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'];
        const userAgent = req.headers['user-agent'];

        try {
            const user = await userService.getUserByUsername(username);

            if (!user) {
                await auditService.logAction({ action: 'LOGIN_FAILURE', details: { username, reason: 'User not found' }, ipAddress });
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Check if account is locked
            if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
                const waitTime = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
                return res.status(423).json({ 
                    success: false, 
                    message: `Account locked. Please try again in ${waitTime} minutes.` 
                });
            }

            // Verify password
            const isMatch = await authService.compareData(password, user.password_hash);
            
            if (!isMatch) {
                const { attempts, lockoutUntil } = await userService.handleFailedLogin(user);
                await auditService.logAction({ action: 'LOGIN_FAILURE', performedBy: user.id, details: { attempts }, ipAddress });
                
                if (lockoutUntil) {
                    return res.status(423).json({ 
                        success: false, 
                        message: 'Too many failed attempts. Account locked for 15 minutes.' 
                    });
                }
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Check status
            if (user.status !== 'Active') {
                return res.status(403).json({ success: false, message: 'Account is deactivated' });
            }

            // Success: Reset failed attempts
            await userService.resetFailedAttempts(user.id);

            // Generate tokens
            const accessToken = authService.generateAccessToken({
                id: user.id,
                username: user.username,
                role: user.role_name,
                employee_id: user.employee_id,
                mustChangePassword: user.must_change_password
            });
            
            const refreshToken = authService.generateRefreshToken(user.id);

            // Store refresh token in DB (Session)
            await authService.createSession({
                userId: user.id,
                token: refreshToken,
                ipAddress,
                userAgent
            });

            // Set HTTP-only Cookies
            res.cookie('refreshToken', refreshToken, {
                ...authConfig.cookies,
                maxAge: authConfig.cookies.maxAgeRefresh
            });

            res.cookie('accessToken', accessToken, {
                ...authConfig.cookies,
                maxAge: authConfig.cookies.maxAgeAccess
            });

            await auditService.logAction({ action: 'LOGIN_SUCCESS', performedBy: user.id, ipAddress });

            // Return user info and ACCESS TOKEN in body (for memory storage)
            res.json({
                success: true,
                accessToken,
                user: {
                    id: user.id,
                    employeeId: user.employee_id || user.id,
                    username: user.username,
                    fullName: user.full_name,
                    role: user.role_name.toLowerCase(),
                    mustChangePassword: !!user.must_change_password
                }
            });

        } catch (error) {
            logger.error('Login Error', { error: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Internal server error during login' });
        }
    },

    /**
     * Refresh access token using secure refresh cookie + rotation
     */
    refreshToken: async (req, res) => {
        const refreshToken = req.cookies.refreshToken;
        const ipAddress = req.ip || req.headers['x-forwarded-for'];
        const userAgent = req.headers['user-agent'];

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token missing' });
        }

        try {
            // Validate and rotate (Invalidates old token, issues new one)
            const rotationResult = await authService.verifyAndRotateSession(refreshToken, ipAddress, userAgent);
            
            if (!rotationResult) {
                return res.status(401).json({ success: false, message: 'Session expired or invalid', code: 'SESSION_EXPIRED' });
            }

            const { userId, newToken } = rotationResult;
            const user = await userService.getUserById(userId);

            if (!user || user.status !== 'Active') {
                return res.status(401).json({ success: false, message: 'User deactivated' });
            }

            // Generate new Access Token
            const accessToken = authService.generateAccessToken({
                id: user.id,
                username: user.username,
                role: user.role_name,
                employee_id: user.employee_id,
                mustChangePassword: user.must_change_password
            });

            // Set Cookies (Rotation)
            res.cookie('refreshToken', newToken, {
                ...authConfig.cookies,
                maxAge: authConfig.cookies.maxAgeRefresh
            });

            res.cookie('accessToken', accessToken, {
                ...authConfig.cookies,
                maxAge: authConfig.cookies.maxAgeAccess
            });

            res.json({
                success: true,
                accessToken
            });

        } catch (error) {
            logger.error('Refresh Token Error', { error: error.message });
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    /**
     * Logout and revoke specific session
     */
    logout: async (req, res) => {
        const refreshToken = req.cookies.refreshToken;
        const userId = req.user?.id;

        try {
            if (refreshToken) {
                await authService.revokeSession(refreshToken);
            }

            res.clearCookie('refreshToken', authConfig.cookies);
            res.clearCookie('accessToken', authConfig.cookies);
            
            if (userId) {
                await auditService.logAction({ action: 'LOGOUT', performedBy: userId });
            }

            res.json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Logout failed' });
        }
    },

    /**
     * Get current user profile
     */
    me: async (req, res) => {
        try {
            const user = await userService.getUserById(req.user.id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    employeeId: user.employee_id || user.id,
                    username: user.username,
                    fullName: user.full_name,
                    role: user.role_name.toLowerCase(),
                    mustChangePassword: !!user.must_change_password
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = authController;
