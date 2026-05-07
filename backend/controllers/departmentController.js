const sql = require('mssql');
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get all departments
const getAllDepartments = async (req, res, next) => {
    try {
        const showDeleted = req.query.showDeleted === 'true' ? 1 : 0;
        const canSeeDeleted = req.user && (req.user.isAdmin() || req.user.isHR());
        const pool = await getConnection();

        const result = await pool.request()
            .input('ShowDeleted', sql.Bit, canSeeDeleted ? showDeleted : 0)
            .execute('sp_GetAllDepartments');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

// Get department by ID
const getDepartmentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .execute('sp_GetAllDepartments');

        const department = result.recordset.find(d => d.DepartmentId === parseInt(id));
        if (!department) {
            throw errorResponse('Department not found', 404);
        }

        res.json(successResponse(department));
    } catch (error) {
        next(error);
    }
};

// Create department
const createDepartment = async (req, res, next) => {
    try {
        const { departmentName, description } = req.body;
        const pool = await getConnection();

        const result = await pool.request()
            .input('DepartmentName', sql.NVarChar(100), departmentName)
            .input('Description', sql.NVarChar(500), description || null)
            .execute('sp_CreateDepartment');

        res.status(201).json(successResponse(result.recordset[0], 'Department created successfully'));
    } catch (error) {
        next(error);
    }
};

// Update department
const updateDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { departmentName, description } = req.body;
        const pool = await getConnection();

        await pool.request()
            .input('DepartmentId', sql.Int, id)
            .input('DepartmentName', sql.NVarChar(100), departmentName)
            .input('Description', sql.NVarChar(500), description || null)
            .execute('sp_UpdateDepartment');

        res.json(successResponse(null, 'Department updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Soft delete department
const deleteDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const deletedBy = req.user?.role || 'admin';
        const pool = await getConnection();

        await pool.request()
            .input('DepartmentId', sql.Int, id)
            .input('DeletedBy', sql.NVarChar(100), deletedBy)
            .input('DeleteReason', sql.NVarChar(500), reason || null)
            .execute('sp_SoftDeleteDepartment');

        res.json(successResponse(null, 'Department deleted successfully'));
    } catch (error) {
        next(error);
    }
};

// Restore soft-deleted department (admin/hr only)
const restoreDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('DepartmentId', sql.Int, id)
            .execute('sp_RestoreDepartment');

        res.json(successResponse(null, 'Department restored successfully'));
    } catch (error) {
        next(error);
    }
};

// Hard delete department (admin only)
const hardDeleteDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('DepartmentId', sql.Int, id)
            .execute('sp_HardDeleteDepartment');

        res.json(successResponse(null, 'Department permanently deleted'));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    restoreDepartment,
    hardDeleteDepartment
};
