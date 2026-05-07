const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { departmentValidation } = require('../middleware/validation');
const { extractUserContext, requireRole } = require('../middleware/roleMiddleware');

router.use(extractUserContext);



// Get all departments
router.get('/', departmentController.getAllDepartments);

// Get department by ID
router.get('/:id', departmentController.getDepartmentById);

// Create department (Admin/HR only)
router.post('/', ...departmentValidation.create, departmentController.createDepartment);

// Update department (Admin/HR only)
router.put('/:id', departmentController.updateDepartment);

// Soft delete department (Admin only)
router.delete('/:id', requireRole('admin', 'hr'), departmentController.deleteDepartment);

// Restore soft-deleted department (Admin/HR only)
router.post('/:id/restore', requireRole('admin', 'hr'), departmentController.restoreDepartment);

// Hard (permanent) delete department (Admin only)
router.delete('/:id/hard', requireRole('admin'), departmentController.hardDeleteDepartment);

module.exports = router;
