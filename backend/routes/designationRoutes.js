const express = require('express');
const router = express.Router();
const designationController = require('../controllers/designationController');
const { designationValidation } = require('../middleware/validation');



// Get all designations
router.get('/', designationController.getAllDesignations);

// Get designation by ID
router.get('/:id', designationController.getDesignationById);

// Create designation (Admin/HR only)
router.post('/', ...designationValidation.create, designationController.createDesignation);

// Update designation (Admin/HR only)
router.put('/:id', designationController.updateDesignation);

// Delete designation (Admin only)
router.delete('/:id', designationController.deleteDesignation);

module.exports = router;
