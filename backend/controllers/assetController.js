const sql = require('mssql');
const { getConnection } = require('../config/database');

// Generate Asset Code like SEL/LAP/001 or SEL/MON/001
const generateAssetCode = async (category, itemName) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT MAX(AssetID) as MaxId FROM Assets');
        const nextId = (result.recordset[0].MaxId || 0) + 1;
        const paddedId = nextId.toString().padStart(3, '0');
        
        let prefix = 'OTH';
        const nameUpper = (itemName || '').toUpperCase();
        if (nameUpper.includes('LAPTOP')) prefix = 'LAP';
        else if (nameUpper.includes('MONITOR')) prefix = 'MON';
        else if (nameUpper.includes('DESKTOP') || nameUpper.includes('CPU')) prefix = 'DSK';
        else if (nameUpper.includes('MOUSE')) prefix = 'MOU';
        else if (nameUpper.includes('KEYBOARD')) prefix = 'KBD';
        else if (nameUpper.includes('ADAPTER')) prefix = 'ADP';
        
        return `SEL/${prefix}/${paddedId}`;
    } catch (error) {
        console.error('Error generating asset code:', error);
        return `SEL/AST/${Date.now()}`;
    }
};

exports.createAsset = async (req, res) => {
    try {
        const { AssetCode, AssetName, Category, Brand, Model, SerialNumber, PurchaseDate, AssetCondition, Processor, RAM, Storage, EmployeeID, AssignDate } = req.body;
        const AssetPhoto = req.file ? `/uploads/assets/${req.file.filename}` : null;
        
        const finalAssetCode = AssetCode || await generateAssetCode(Category, AssetName);

        const pool = await getConnection();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction)
                .input('AssetCode', finalAssetCode)
                .input('AssetName', AssetName)
                .input('Category', Category)
                .input('Brand', Brand || null)
                .input('Model', Model || null)
                .input('SerialNumber', SerialNumber || null)
                .input('PurchaseDate', PurchaseDate || null)
                .input('AssetCondition', AssetCondition || 'New')
                .input('AssetPhoto', AssetPhoto)
                .input('Status', 'Available')
                .input('Processor', Processor || null)
                .input('RAM', RAM || null)
                .input('Storage', Storage || null);

            const result = await request.execute('sp_CreateAsset');
            const newAssetID = result.recordset[0].AssetID;

            // If quick assign is provided
            if (EmployeeID && AssignDate) {
                const assignRequest = new sql.Request(transaction)
                    .input('AssetID', newAssetID)
                    .input('EmployeeID', EmployeeID)
                    .input('AssignDate', AssignDate)
                    .input('ReturnDate', null)
                    .input('Remarks', 'Quick assignment during asset creation');
                
                await assignRequest.execute('sp_AssignAsset');
            }

            await transaction.commit();

            res.status(201).json({
                success: true,
                message: 'Asset created successfully',
                data: { AssetID: newAssetID, AssetCode: finalAssetCode }
            });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (error) {
        console.error('Create asset error:', error);
        res.status(500).json({ success: false, message: 'Failed to create asset', error: error.message });
    }
};

exports.getAllAssets = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().execute('sp_GetAllAssets');
        
        res.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Get all assets error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch assets' });
    }
};

exports.getAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        const result = await pool.request().input('AssetID', id).execute('sp_GetAssetById');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }
        
        res.status(200).json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Get asset by id error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch asset' });
    }
};

exports.updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { AssetName, Category, Brand, Model, SerialNumber, PurchaseDate, AssetCondition, Status, ExistingPhoto, Processor, RAM, Storage } = req.body;
        const AssetPhoto = req.file ? `/uploads/assets/${req.file.filename}` : ExistingPhoto;

        const pool = await getConnection();
        const result = await pool.request()
            .input('AssetID', id)
            .input('AssetName', AssetName)
            .input('Category', Category)
            .input('Brand', Brand || null)
            .input('Model', Model || null)
            .input('SerialNumber', SerialNumber || null)
            .input('PurchaseDate', PurchaseDate || null)
            .input('AssetCondition', AssetCondition)
            .input('AssetPhoto', AssetPhoto === 'null' ? null : AssetPhoto)
            .input('Status', Status)
            .input('Processor', Processor || null)
            .input('RAM', RAM || null)
            .input('Storage', Storage || null)
            .execute('sp_UpdateAsset');
        
        res.status(200).json({
            success: true,
            message: 'Asset updated successfully'
        });
    } catch (error) {
        console.error('Update asset error:', error);
        res.status(500).json({ success: false, message: 'Failed to update asset' });
    }
};

exports.deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        await pool.request().input('AssetID', id).execute('sp_DeleteAsset');
        
        res.status(200).json({ success: true, message: 'Asset deleted successfully' });
    } catch (error) {
        console.error('Delete asset error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete asset' });
    }
};

exports.assignAsset = async (req, res) => {
    try {
        const { AssetID, EmployeeID, AssignDate, ReturnDate, Remarks } = req.body;
        
        const pool = await getConnection();
        await pool.request()
            .input('AssetID', AssetID)
            .input('EmployeeID', EmployeeID)
            .input('AssignDate', AssignDate)
            .input('ReturnDate', ReturnDate || null)
            .input('Remarks', Remarks || null)
            .execute('sp_AssignAsset');
            
        res.status(200).json({ success: true, message: 'Asset assigned successfully' });
    } catch (error) {
        console.error('Assign asset error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign asset' });
    }
};

exports.returnAsset = async (req, res) => {
    try {
        const { AssetID, ReturnDate, AssetCondition, Remarks } = req.body;
        
        const pool = await getConnection();
        await pool.request()
            .input('AssetID', AssetID)
            .input('ReturnDate', ReturnDate)
            .input('AssetCondition', AssetCondition)
            .input('Remarks', Remarks || null)
            .execute('sp_ReturnAsset');
            
        res.status(200).json({ success: true, message: 'Asset returned successfully' });
    } catch (error) {
        console.error('Return asset error:', error);
        res.status(500).json({ success: false, message: 'Failed to return asset' });
    }
};

exports.getAssetHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        const result = await pool.request().input('AssetID', id).execute('sp_GetAssetHistory');
        
        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Get asset history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch asset history' });
    }
};

exports.getAssignedAssetsByEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const pool = await getConnection();
        const result = await pool.request().input('EmployeeID', employeeId).execute('sp_GetAssignedAssetsByEmployee');
        
        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Get assigned assets error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch assigned assets for employee' });
    }
};
