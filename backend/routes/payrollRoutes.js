const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

// Payroll routes - specific routes MUST come before dynamic :id routes
// Payroll components routes
router.get('/components/all', payrollController.getAllComponents);

// Utility routes
router.get('/calculate/attendance', payrollController.calculateAttendance);

// Payroll generation routes
router.post('/generate', payrollController.generatePayroll);
router.post('/generate-bulk', payrollController.generateBulkPayroll);

// Payroll details routes
router.post('/details', payrollController.addPayrollDetail);
router.put('/details/:id', payrollController.updatePayrollDetail);
router.delete('/details/:id', payrollController.deletePayrollDetail);

// Main payroll CRUD routes
router.get('/', payrollController.getAllPayroll);
router.get('/:id', payrollController.getPayrollById);
router.post('/', payrollController.createPayroll);
router.put('/:id', payrollController.updatePayroll);
router.patch('/:id/status', payrollController.updatePayrollStatus);
router.delete('/:id', payrollController.deletePayroll);

module.exports = router;
