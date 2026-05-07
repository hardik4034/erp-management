const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { userValidator } = require('../validators/authValidator');
const userAuthMiddleware = require('../middleware/userAuthMiddleware');
const { authorize, enforcePasswordChange } = require('../middleware/roleMiddleware');

// Apply auth and admin check to all routes in this file
router.use(userAuthMiddleware);
router.use(enforcePasswordChange);
router.use(authorize('admin'));

/**
 * @route   POST /api/users
 * @desc    Create a new user
 */
router.post('/', userValidator.create, userController.create);

/**
 * @route   GET /api/users
 * @desc    List all users
 */
router.get('/', userController.getAll);

/**
 * @route   POST /api/users/provision
 * @desc    Provision a login account for an existing employee
 */
router.post('/provision', userController.provision);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user details
 */
router.put('/:id', userValidator.update, userController.update);

/**
 * @route   PUT /api/users/:id/reset-password
 * @desc    Reset a user's password (Admin Only)
 */
router.put('/:id/reset-password', userValidator.resetPassword, userController.resetPassword);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a system user
 */
router.delete('/:id', userController.delete);

module.exports = router;
