const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { employeeValidation } = require('../middleware/validation');



// Get all employees
router.get('/', employeeController.getAllEmployees);

// Get employee by ID
router.get('/:id', employeeController.getEmployeeById);

// Create employee (Admin/HR only)
router.post('/', ...employeeValidation.create, employeeController.createEmployee);

// Update employee (Admin/HR only)
router.put('/:id', ...employeeValidation.update, employeeController.updateEmployee);

// Delete employee (Admin/HR only)
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;
