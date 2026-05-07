const express = require('express');
const router = express.Router();
const appreciationController = require('../controllers/appreciationController');
const { appreciationValidation } = require('../middleware/validation');
const upload = require('../middleware/upload');
const { extractUserContext, requireRole } = require('../middleware/roleMiddleware');

router.use(extractUserContext);

// Get all appreciations
router.get('/', appreciationController.getAllAppreciations);

// Get appreciation by ID
router.get('/:id', appreciationController.getAppreciationById);

// Create appreciation (Admin/HR only)
// Note: Validation middleware might need adjustment if it expects JSON only for validation before multer processes body
router.post('/', upload.single('photo'), appreciationController.createAppreciation);

// Update appreciation (Admin/HR only)
router.put('/:id', upload.single('photo'), appreciationController.updateAppreciation);

// Soft delete appreciation (Admin/HR only)
router.delete('/:id', requireRole('admin', 'hr'), appreciationController.deleteAppreciation);

// Restore soft-deleted appreciation (Admin/HR only)
router.post('/:id/restore', requireRole('admin', 'hr'), appreciationController.restoreAppreciation);

// Hard (permanent) delete appreciation (Admin only)
router.delete('/:id/hard', requireRole('admin'), appreciationController.hardDeleteAppreciation);

module.exports = router;
