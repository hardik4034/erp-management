const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Get all audit logs, restricted to Admin and HR
router.get('/', authorizeRoles('admin', 'hr'), auditController.getAuditLogs);

module.exports = router;
