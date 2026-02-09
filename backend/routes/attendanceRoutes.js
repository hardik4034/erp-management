const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { attendanceValidation } = require('../middleware/validation');




// Get attendance grid for calendar view
router.get('/grid', attendanceController.getAttendanceGrid);

// Bulk import attendance
router.post('/import', attendanceController.bulkImportAttendance);

// Export attendance as CSV
router.get('/export', attendanceController.exportAttendance);

// Get all attendance records
router.get('/', attendanceController.getAllAttendance);

// Get monthly report
router.get('/report/monthly', attendanceController.getMonthlyReport);

// Get attendance by ID
router.get('/:id', attendanceController.getAttendanceById);

// Mark attendance (Admin/HR only)
router.post('/', ...attendanceValidation.create, attendanceController.createAttendance);

// Update attendance (Admin/HR only)
router.put('/:id', attendanceController.updateAttendance);

// Delete attendance (Admin only)
router.delete('/:id', attendanceController.deleteAttendance);

module.exports = router;
