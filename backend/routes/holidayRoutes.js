const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { holidayValidation } = require('../middleware/validation');
const { extractUserContext, requireRole } = require('../middleware/roleMiddleware');

// Apply user context to all routes
router.use(extractUserContext);

// Get all holidays (Public/All authenticated)
router.get('/', holidayController.getAllHolidays);

// Get holiday by ID
router.get('/:id', holidayController.getHolidayById);

// Create holiday (Admin/HR only)
router.post('/', requireRole(['admin', 'hr']), ...holidayValidation.create, holidayController.createHoliday);

// Update holiday (Admin/HR only)
router.put('/:id', requireRole(['admin', 'hr']), holidayController.updateHoliday);

// Delete holiday (Admin/HR only)
router.delete('/:id', requireRole(['admin', 'hr']), holidayController.deleteHoliday);

module.exports = router;
