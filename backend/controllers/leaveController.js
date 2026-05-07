const sql = require('mssql');
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// Get all leaves
const getAllLeaves = async (req, res, next) => {
    try {
        let { employeeId, status } = req.query;
        const showDeleted = req.query.showDeleted === 'true' ? 1 : 0;
        const canSeeDeleted = req.user && (req.user.isAdmin() || req.user.isHR());
        const pool = await getConnection();

        // SECURITY: Role-based filtering
        // Employee role can ONLY see their own leaves
        if (req.user && req.user.isEmployee()) {
            if (!req.user.employeeId) {
                return res.status(400).json(errorResponse('Employee ID not found in user context', 400));
            }
            // Force filter to logged-in employee's data
            employeeId = req.user.employeeId;
            logger.debug('Employee role detected: filtering leaves', { employeeId });
        }
        // Manager role: filter to team data (handled in frontend for now, can add team logic here)
        // HR/Admin: no filtering, see all data

        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId || null)
            .input('Status', sql.NVarChar(20), status || null)
            .input('UserRole', sql.NVarChar(50), req.user?.role || null)
            .input('RequestingEmployeeId', sql.Int, req.user?.employeeId || null)
            .input('ShowDeleted', sql.Bit, canSeeDeleted ? showDeleted : 0)
            .execute('sp_GetAllLeaves');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

// Get leave by ID
const getLeaveById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('LeaveId', sql.Int, id)
            .query('SELECT l.*, lt.LeaveTypeName, e.FirstName, e.LastName FROM Leaves l LEFT JOIN LeaveTypes lt ON l.LeaveTypeId = lt.LeaveTypeId LEFT JOIN Employees e ON l.EmployeeId = e.EmployeeId WHERE l.LeaveId = @LeaveId AND l.IsDeleted = 0');

        const leave = result.recordset[0];
        if (!leave) {
            throw errorResponse('Leave not found', 404);
        }

        // SECURITY: Validate ownership for Employee role
        if (req.user && req.user.isEmployee()) {
            if (leave.EmployeeId !== req.user.employeeId) {
                console.warn(`⚠️ Unauthorized access attempt: Employee ${req.user.employeeId} tried to access leave ${id} belonging to employee ${leave.EmployeeId}`);
                return res.status(403).json(errorResponse('You can only access your own leave records', 403));
            }
        }

        res.json(successResponse(leave));
    } catch (error) {
        next(error);
    }
};

// Apply for leave
const applyLeave = async (req, res, next) => {
    try {
        let { employeeId, leaveTypeId, fromDate, toDate, reason, status } = req.body;
        const pool = await getConnection();

        // SECURITY: Employee role can only apply leave for themselves
        if (req.user && req.user.isEmployee()) {
            if (!req.user.employeeId) {
                return res.status(400).json(errorResponse('Employee ID not found in user context', 400));
            }
            // Force employee ID to logged-in user
            employeeId = req.user.employeeId;
            
            // SECURITY: Force status to Pending for employees
            status = 'Pending';
            
            console.log(`🔒 Employee role: Auto-setting employee ID to ${employeeId} and status to Pending`);
        } else if (req.user && (req.user.isHR() || req.user.isAdmin() || req.user.isManager())) {
            // HR/Admin/Manager can apply leave for any employee
            if (!employeeId) {
                return res.status(400).json(errorResponse('Employee ID is required', 400));
            }
            // Allow them to set status, default to Pending if not provided
            status = status || 'Pending';
        } else {
             // Default fallback if no user context (should verify auth middleware covers this)
             status = 'Pending';
        }

        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .input('LeaveTypeId', sql.Int, leaveTypeId)
            .input('FromDate', sql.Date, fromDate)
            .input('ToDate', sql.Date, toDate)
            .input('Reason', sql.NVarChar(500), reason)
            .input('Status', sql.NVarChar(20), status)
            .execute('sp_CreateLeave');

        res.status(201).json(successResponse(result.recordset[0], 'Leave applied successfully'));
    } catch (error) {
        next(error);
    }
};

// Update existing leave details
const updateLeave = async (req, res, next) => {
    try {
        const { id } = req.params;
        let { leaveTypeId, fromDate, toDate, reason } = req.body;
        const pool = await getConnection();

        // 1. Check if leave exists and validate ownership/permission
        const leaveResult = await pool.request()
            .input('LeaveId', sql.Int, id)
            .query('SELECT * FROM Leaves WHERE LeaveId = @LeaveId');
        
        const leave = leaveResult.recordset[0];
        if (!leave) {
            return res.status(404).json(errorResponse('Leave record not found', 404));
        }

        // 2. Security Checks
        if (req.user.isEmployee()) {
            // Employee can only edit their own leaves (use loose equality for safety)
            if (leave.EmployeeId != req.user.employeeId) {
                return res.status(403).json(errorResponse('You can only edit your own leave requests', 403));
            }
            // Employee can only edit PENDING leaves
            if (leave.Status !== 'Pending') {
                return res.status(400).json(errorResponse('You can only edit pending leave requests', 400));
            }
        } 

        // 3. Update the leave
        const updateResult = await pool.request()
            .input('LeaveId', sql.Int, id)
            .input('LeaveTypeId', sql.Int, leaveTypeId)
            .input('FromDate', sql.Date, fromDate)
            .input('ToDate', sql.Date, toDate)
            .input('Reason', sql.NVarChar(500), reason)
            .execute('sp_UpdateLeave');

        if (!updateResult.recordset || updateResult.recordset.length === 0 || updateResult.recordset[0].RowsAffected === 0) {
            return res.status(400).json(errorResponse('Failed to update leave or leave is not in Pending status', 400));
        }

        logger.debug('Leave updated', { leaveId: id, by: req.user?.username });
        res.json(successResponse(null, 'Leave record updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Update leave status (approve/reject)
const updateLeaveStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, approvedBy, rejectionReason } = req.body;
        const pool = await getConnection();

        // SECURITY: Only Admin, HR, Manager can approve/reject leaves
        if (req.user && !req.user.canApproveLeaves()) {
            console.warn(`⚠️ Unauthorized approval attempt by role: ${req.user.role}`);
            return res.status(403).json(errorResponse('You do not have permission to approve or reject leave requests', 403));
        }

        await pool.request()
            .input('LeaveId', sql.Int, id)
            .input('Status', sql.NVarChar(20), status)
            .input('ApprovedBy', sql.NVarChar(100), approvedBy || null)
            .input('RejectionReason', sql.NVarChar(500), rejectionReason || null)
            .execute('sp_UpdateLeaveStatus');

        logger.debug('Leave status updated', { leaveId: id, status, by: req.user?.role });
        res.json(successResponse(null, `Leave ${status.toLowerCase()} successfully`));
    } catch (error) {
        next(error);
    }
};

// Soft delete leave
const deleteLeave = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const deletedBy = req.user?.role || 'user';
        const pool = await getConnection();

        // SECURITY: Check ownership/permission
        const leaveCheck = await pool.request()
            .input('LeaveId', sql.Int, id)
            .query('SELECT EmployeeId, Status FROM Leaves WHERE LeaveId = @LeaveId');
        
        const leave = leaveCheck.recordset[0];
        if (!leave) {
            return res.status(404).json(errorResponse('Leave not found', 404));
        }

        if (req.user.isEmployee()) {
            if (leave.EmployeeId !== req.user.employeeId) {
                console.warn(`⚠️ Unauthorized delete attempt: Employee ${req.user.employeeId} tried to delete leave ${id} belonging to employee ${leave.EmployeeId}`);
                return res.status(403).json(errorResponse('You can only delete your own leave requests', 403));
            }
            if (leave.Status !== 'Pending') {
                return res.status(400).json(errorResponse('You can only delete pending leave requests', 400));
            }
        }

        await pool.request()
            .input('LeaveId', sql.Int, id)
            .input('DeletedBy', sql.NVarChar(100), deletedBy)
            .input('DeleteReason', sql.NVarChar(500), reason || null)
            .execute('sp_SoftDeleteLeave');

        logger.debug('Leave soft-deleted', { leaveId: id, by: req.user?.role });
        res.json(successResponse(null, 'Leave deleted successfully'));
    } catch (error) {
        next(error);
    }
};

// Restore soft-deleted leave (admin/hr only)
const restoreLeave = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('LeaveId', sql.Int, id)
            .execute('sp_RestoreLeave');

        res.json(successResponse(null, 'Leave restored successfully'));
    } catch (error) {
        next(error);
    }
};

// Hard delete leave (admin only)
const hardDeleteLeave = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('LeaveId', sql.Int, id)
            .execute('sp_HardDeleteLeave');

        res.json(successResponse(null, 'Leave permanently deleted'));
    } catch (error) {
        next(error);
    }
};

// Get all leave types
const getLeaveTypes = async (req, res, next) => {
    try {
        const pool = await getConnection();

        const result = await pool.request()
            .execute('sp_GetAllLeaveTypes');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

// Get leave balance for employee
const getLeaveBalance = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .execute('sp_GetLeaveBalance');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllLeaves,
    getLeaveById,
    applyLeave,
    updateLeave,
    updateLeaveStatus,
    deleteLeave,
    restoreLeave,
    hardDeleteLeave,
    getLeaveTypes,
    getLeaveBalance
};
