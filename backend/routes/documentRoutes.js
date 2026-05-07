const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// Define routes
router.get('/:employeeId', documentController.getDocuments);
router.get('/:employeeId/:documentType/download', documentController.downloadDocument);

// Ensure uploadMiddleware handles multer errors properly
router.post('/:employeeId', (req, res, next) => {
    documentController.uploadMiddleware(req, res, (err) => {
        if (err) {
            // Check for specific multer errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, error: 'File size too large. Max 5MB allowed.' });
            }
            return res.status(400).json({ success: false, error: err.message });
        }
        next();
    });
}, documentController.uploadDocument);

router.delete('/:employeeId/:documentType', documentController.deleteDocument);

module.exports = router;
