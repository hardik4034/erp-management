const sql = require('mssql');
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get all designations
const getAllDesignations = async (req, res, next) => {
    try {
        const { departmentId } = req.query;
        const pool = await getConnection();

        const result = await pool.request()
            .input('DepartmentId', sql.Int, departmentId || null)
            .execute('sp_GetAllDesignations');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

// Get designation by ID
const getDesignationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .execute('sp_GetAllDesignations');

        const designation = result.recordset.find(d => d.DesignationId === parseInt(id));
        if (!designation) {
            throw errorResponse('Designation not found', 404);
        }

        res.json(successResponse(designation));
    } catch (error) {
        next(error);
    }
};

// Create designation
const createDesignation = async (req, res, next) => {
    try {
        const { designationName, departmentId, description } = req.body;
        const pool = await getConnection();

        const result = await pool.request()
            .input('DesignationName', sql.NVarChar(100), designationName)
            .input('DepartmentId', sql.Int, departmentId)
            .input('Description', sql.NVarChar(500), description || null)
            .execute('sp_CreateDesignation');

        res.status(201).json(successResponse(result.recordset[0], 'Designation created successfully'));
    } catch (error) {
        next(error);
    }
};

// Update designation
const updateDesignation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { designationName, departmentId, description } = req.body;
        const pool = await getConnection();

        await pool.request()
            .input('DesignationId', sql.Int, id)
            .input('DesignationName', sql.NVarChar(100), designationName)
            .input('DepartmentId', sql.Int, departmentId)
            .input('Description', sql.NVarChar(500), description || null)
            .execute('sp_UpdateDesignation');

        res.json(successResponse(null, 'Designation updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Delete designation
const deleteDesignation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('DesignationId', sql.Int, id)
            .execute('sp_DeleteDesignation');

        res.json(successResponse(null, 'Designation deleted successfully'));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllDesignations,
    getDesignationById,
    createDesignation,
    updateDesignation,
    deleteDesignation
};
