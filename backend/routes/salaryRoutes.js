const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

// Salary Groups Routes
router.get('/groups', salaryController.getAllSalaryGroups);
router.post('/groups', salaryController.createSalaryGroup);

// Employee Salary Routes
router.get('/', salaryController.getAllSalaries);
router.get('/:id', salaryController.getSalaryById);
router.post('/', salaryController.createSalary);
router.put('/:id', salaryController.updateSalary);
router.delete('/:id', salaryController.deleteSalary);

// Employee-specific Routes
router.get('/employee/:employeeId/current', salaryController.getCurrentSalary);
router.get('/employee/:employeeId/history', salaryController.getSalaryHistory);

module.exports = router;
