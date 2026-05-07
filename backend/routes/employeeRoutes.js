const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { employeeValidation } = require('../middleware/validation');
const { extractUserContext, requireRole } = require('../middleware/roleMiddleware');

// Apply user context to all routes
router.use(extractUserContext);



// Get all employees
router.get('/', employeeController.getAllEmployees);

// Get employee by ID
router.get('/:id', employeeController.getEmployeeById);

// Create employee (Admin/HR only)
router.post('/', ...employeeValidation.create, employeeController.createEmployee);

// Update employee (Admin/HR only)
router.put('/:id', ...employeeValidation.update, employeeController.updateEmployee);

// Soft delete employee (Admin/HR only)
router.delete('/:id', requireRole('admin', 'hr'), employeeController.deleteEmployee);

// Restore soft-deleted employee (Admin/HR only)
router.post('/:id/restore', requireRole('admin', 'hr'), employeeController.restoreEmployee);

// Hard (permanent) delete employee (Admin only)
router.delete('/:id/hard', requireRole('admin'), employeeController.hardDeleteEmployee);

// Exit details routes
router.get('/:id/exit-details', employeeController.getExitDetails);
router.post('/:id/exit-details', employeeController.saveExitDetails);

// Approver routes
// GET: Any authenticated user can view approvers for an employee
router.get('/:id/approvers', employeeController.getApprovers);
// POST: Only Admin/HR can assign approvers
router.post('/:id/approvers', requireRole('admin', 'hr'), employeeController.saveApprovers);

module.exports = router;
