const express = require('express');
const router = express.Router();
const appreciationController = require('../controllers/appreciationController');
const { appreciationValidation } = require('../middleware/validation');
const upload = require('../middleware/upload');

// Get all appreciations
router.get('/', appreciationController.getAllAppreciations);

// Get appreciation by ID
router.get('/:id', appreciationController.getAppreciationById);

// Create appreciation (Admin/HR only)
// Note: Validation middleware might need adjustment if it expects JSON only for validation before multer processes body
router.post('/', upload.single('photo'), appreciationController.createAppreciation);

// Update appreciation (Admin/HR only)
router.put('/:id', upload.single('photo'), appreciationController.updateAppreciation);

// Delete appreciation (Admin/HR only)
router.delete('/:id', appreciationController.deleteAppreciation);

module.exports = router;
