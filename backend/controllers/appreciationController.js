const sql = require('mssql');
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get all appreciations
const getAllAppreciations = async (req, res, next) => {
    try {
        const { employeeId } = req.query;
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId || null)
            .execute('sp_GetAllAppreciations');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

// Get appreciation by ID
const getAppreciationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .execute('sp_GetAllAppreciations');

        const appreciation = result.recordset.find(a => a.AppreciationId === parseInt(id));
        if (!appreciation) {
            throw errorResponse('Appreciation not found', 404);
        }

        res.json(successResponse(appreciation));
    } catch (error) {
        next(error);
    }
};

// Create appreciation
const createAppreciation = async (req, res, next) => {
    try {
        const { employeeId, title, description, appreciationDate, awardedBy } = req.body;
        const photoPath = req.file ? `/uploads/appreciations/${req.file.filename}` : null;
        
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .input('Title', sql.NVarChar(200), title)
            .input('Description', sql.NVarChar(1000), description || null)
            .input('AppreciationDate', sql.Date, appreciationDate)
            .input('AwardedBy', sql.NVarChar(100), awardedBy || null)
            .input('Photo', sql.NVarChar(500), photoPath)
            .execute('sp_CreateAppreciation');

        res.status(201).json(successResponse(result.recordset[0], 'Appreciation created successfully'));
    } catch (error) {
        next(error);
    }
};

// Update appreciation
const updateAppreciation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, appreciationDate, awardedBy } = req.body;
        const photoPath = req.file ? `/uploads/appreciations/${req.file.filename}` : undefined; // Undefined means don't update if not provided
        
        const pool = await getConnection();

        await pool.request()
            .input('AppreciationId', sql.Int, id)
            .input('Title', sql.NVarChar(200), title)
            .input('Description', sql.NVarChar(1000), description || null)
            .input('AppreciationDate', sql.Date, appreciationDate)
            .input('AwardedBy', sql.NVarChar(100), awardedBy || null)
            .input('Photo', sql.NVarChar(500), photoPath) // Stored procedure should handle NULL if we want to keep existing, but usually NULL updates to NULL. 
                                                          // My SP logic uses ISNULL(@Photo, Photo), so NULL/undefined here works effectively if I pass NULL.
                                                          // Wait, if I pass explicit NULL, ISNULL(@Photo, Photo) returns Photo (existing) ONLY IF @Photo is NULL.
                                                          // Multer: req.file is undefined if no file.
                                                          // So if undefined, I pass NULL (default in input).
            .execute('sp_UpdateAppreciation');

        res.json(successResponse(null, 'Appreciation updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Delete appreciation
const deleteAppreciation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('AppreciationId', sql.Int, id)
            .execute('sp_DeleteAppreciation');

        res.json(successResponse(null, 'Appreciation deleted successfully'));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllAppreciations,
    getAppreciationById,
    createAppreciation,
    updateAppreciation,
    deleteAppreciation
};
