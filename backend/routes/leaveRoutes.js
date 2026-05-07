const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { leaveValidation } = require('../middleware/validation');
const { extractUserContext, requireRole } = require('../middleware/roleMiddleware');

// Apply role middleware to all routes
router.use(extractUserContext);

// Get all leaves
router.get('/', leaveController.getAllLeaves);

// Get leave types
router.get('/types/all', leaveController.getLeaveTypes);

// Get leave balance for employee
router.get('/balance/:employeeId', leaveController.getLeaveBalance);

// Get leave by ID
router.get('/:id', leaveController.getLeaveById);

// Apply for leave
router.post('/', ...leaveValidation.create, leaveController.applyLeave);

// Update existing leave (Pending only for employees)
router.put('/:id', ...leaveValidation.create, leaveController.updateLeave);

// Update leave status (Admin/HR/Manager only)
router.put('/:id/status', requireRole('admin', 'hr', 'manager'), ...leaveValidation.updateStatus, leaveController.updateLeaveStatus);

// Soft delete leave (Admin/HR or own leave for Employee)
router.delete('/:id', leaveController.deleteLeave);

// Restore soft-deleted leave (Admin/HR only)
router.post('/:id/restore', requireRole('admin', 'hr'), leaveController.restoreLeave);

// Hard (permanent) delete leave (Admin only)
router.delete('/:id/hard', requireRole('admin'), leaveController.hardDeleteLeave);

module.exports = router;
