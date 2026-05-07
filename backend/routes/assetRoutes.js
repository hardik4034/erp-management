const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const uploadAsset = require('../middleware/assetUpload');

// CRUD Assets
router.post('/', uploadAsset.single('AssetPhoto'), assetController.createAsset);
router.get('/', assetController.getAllAssets);
router.get('/:id', assetController.getAssetById);
router.put('/:id', uploadAsset.single('AssetPhoto'), assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);

// Assign and Return
router.post('/assign', assetController.assignAsset);
router.post('/return', assetController.returnAsset);

// History and Employee Specific
router.get('/:id/history', assetController.getAssetHistory);
router.get('/employee/:employeeId', assetController.getAssignedAssetsByEmployee);

module.exports = router;
