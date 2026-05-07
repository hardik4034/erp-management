const express = require('express');
const router = express.Router();
const designationController = require('../controllers/designationController');
const { designationValidation } = require('../middleware/validation');
const { extractUserContext, requireRole } = require('../middleware/roleMiddleware');

router.use(extractUserContext);



// Get all designations
router.get('/', designationController.getAllDesignations);

// Get designation by ID
router.get('/:id', designationController.getDesignationById);

// Create designation (Admin/HR only)
router.post('/', ...designationValidation.create, designationController.createDesignation);

// Update designation (Admin/HR only)
router.put('/:id', designationController.updateDesignation);

// Soft delete designation (Admin/HR only)
router.delete('/:id', requireRole('admin', 'hr'), designationController.deleteDesignation);

// Restore soft-deleted designation (Admin/HR only)
router.post('/:id/restore', requireRole('admin', 'hr'), designationController.restoreDesignation);

// Hard (permanent) delete designation (Admin only)
router.delete('/:id/hard', requireRole('admin'), designationController.hardDeleteDesignation);

module.exports = router;
