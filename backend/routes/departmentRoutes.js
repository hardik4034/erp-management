const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { departmentValidation } = require('../middleware/validation');



// Get all departments
router.get('/', departmentController.getAllDepartments);

// Get department by ID
router.get('/:id', departmentController.getDepartmentById);

// Create department (Admin/HR only)
router.post('/', ...departmentValidation.create, departmentController.createDepartment);

// Update department (Admin/HR only)
router.put('/:id', departmentController.updateDepartment);

// Delete department (Admin only)
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;
