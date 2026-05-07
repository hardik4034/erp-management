const sql = require('mssql');
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get all holidays
const getAllHolidays = async (req, res, next) => {
    try {
        const { year } = req.query;
        const showDeleted = req.query.showDeleted === 'true' ? 1 : 0;
        const canSeeDeleted = req.user && (req.user.isAdmin() || req.user.isHR());
        const pool = await getConnection();

        const result = await pool.request()
            .input('Year', sql.Int, year || null)
            .input('ShowDeleted', sql.Bit, canSeeDeleted ? showDeleted : 0)
            .execute('sp_GetAllHolidays');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

// Get holiday by ID
const getHolidayById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .execute('sp_GetAllHolidays');

        const holiday = result.recordset.find(h => h.HolidayId === parseInt(id));
        if (!holiday) {
            throw errorResponse('Holiday not found', 404);
        }

        res.json(successResponse(holiday));
    } catch (error) {
        next(error);
    }
};

// Create holiday
const createHoliday = async (req, res, next) => {
    try {
        const { holidayName, holidayDate, description } = req.body;
        const pool = await getConnection();

        const result = await pool.request()
            .input('HolidayName', sql.NVarChar(100), holidayName)
            .input('HolidayDate', sql.Date, holidayDate)
            .input('Description', sql.NVarChar(500), description || null)
            .execute('sp_CreateHoliday');

        res.status(201).json(successResponse(result.recordset[0], 'Holiday created successfully'));
    } catch (error) {
        next(error);
    }
};

// Update holiday
const updateHoliday = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { holidayName, holidayDate, description } = req.body;
        const pool = await getConnection();

        await pool.request()
            .input('HolidayId', sql.Int, id)
            .input('HolidayName', sql.NVarChar(100), holidayName)
            .input('HolidayDate', sql.Date, holidayDate)
            .input('Description', sql.NVarChar(500), description || null)
            .execute('sp_UpdateHoliday');

        res.json(successResponse(null, 'Holiday updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Soft delete holiday
const deleteHoliday = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const deletedBy = req.user?.role || 'admin';
        const pool = await getConnection();

        await pool.request()
            .input('HolidayId', sql.Int, id)
            .input('DeletedBy', sql.NVarChar(100), deletedBy)
            .input('DeleteReason', sql.NVarChar(500), reason || null)
            .execute('sp_SoftDeleteHoliday');

        res.json(successResponse(null, 'Holiday deleted successfully'));
    } catch (error) {
        next(error);
    }
};

// Restore soft-deleted holiday (admin/hr only)
const restoreHoliday = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('HolidayId', sql.Int, id)
            .execute('sp_RestoreHoliday');

        res.json(successResponse(null, 'Holiday restored successfully'));
    } catch (error) {
        next(error);
    }
};

// Hard delete holiday (admin only)
const hardDeleteHoliday = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('HolidayId', sql.Int, id)
            .execute('sp_HardDeleteHoliday');

        res.json(successResponse(null, 'Holiday permanently deleted'));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllHolidays,
    getHolidayById,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    restoreHoliday,
    hardDeleteHoliday
};
