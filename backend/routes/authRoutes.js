const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const { authValidator } = require('../validators/authValidator');
const userAuthMiddleware = require('../middleware/userAuthMiddleware');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & set secure cookies
 */
router.post('/login', authValidator.login, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Clear cookies and invalidate session
 */
router.post('/logout', userAuthMiddleware, authController.logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Rotate access and refresh tokens
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 */
router.get('/me', userAuthMiddleware, authController.me);

/**
 * @route   POST /api/auth/change-password
 * @desc    Allow user to change their own password (forced or voluntary)
 */
router.post('/change-password', userAuthMiddleware, authValidator.changePassword, userController.changePassword);

module.exports = router;
