const sql = require('mssql');
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get all employees (Paginated)
const getAllEmployees = async (req, res, next) => {
    try {
        const role = req.user.role.toLowerCase();
        const canSeeDeleted = role === 'admin' || role === 'hr';
        
        // Pagination & Search parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || null;
        const showDeleted = canSeeDeleted && req.query.showDeleted === 'true' ? 1 : 0;

        const pool = await getConnection();
        const result = await pool.request()
            .input('ShowDeleted', sql.Bit, showDeleted)
            .input('PageNumber',  sql.Int, page)
            .input('PageSize',    sql.Int, limit)
            .input('SearchTerm',  sql.NVarChar(100), search)
            .execute('sp_GetAllEmployees');

        const totalCount = result.recordsets[0][0].TotalCount;
        const employees = result.recordsets[1];
        const totalPages = Math.ceil(totalCount / limit);

        res.json(successResponse(employees, 'Employees retrieved successfully', {
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalCount: totalCount,
                limit: limit
            }
        }));
    } catch (error) {
        next(error);
    }
};

// Get employee by ID
const getEmployeeById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, id)
            .execute('sp_GetEmployeeById');

        if (result.recordset.length === 0) {
            throw errorResponse('Employee not found', 404);
        }

        res.json(successResponse(result.recordset[0]));
    } catch (error) {
        next(error);
    }
};

// Create employee
const createEmployee = async (req, res, next) => {
    try {
        const { 
            employeeCode, firstName, lastName, email, phone, dateOfJoining, departmentId, designationId,
            salutation, country, gender, dateOfBirth, reportingTo, language, userRole,
            address, permanentAddress, temporaryAddress, profilePicture, loginAllowed, receiveEmailNotifications,
            attendanceApprover, leaveApprover,
            skills, probationEndDate, noticePeriodStartDate, noticePeriodEndDate,
            employmentType, maritalStatus, businessAddress
        } = req.body;
        
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeCode', sql.NVarChar(20), employeeCode)
            .input('FirstName', sql.NVarChar(100), firstName)
            .input('LastName', sql.NVarChar(100), lastName)
            .input('Email', sql.NVarChar(255), email)
            .input('Phone', sql.NVarChar(20), phone || null)
            .input('DateOfJoining', sql.Date, dateOfJoining)
            .input('DepartmentId', sql.Int, departmentId)
            .input('DesignationId', sql.Int, designationId)
            // New fields
            .input('Salutation', sql.NVarChar(10), salutation || null)
            .input('Country', sql.NVarChar(100), country || null)
            .input('Gender', sql.NVarChar(20), gender || null)
            .input('DateOfBirth', sql.Date, dateOfBirth || null)
            .input('ReportingTo', sql.Int, reportingTo || null)
            .input('Language', sql.NVarChar(50), language || null)
            .input('UserRole', sql.NVarChar(50), userRole || null)
            .input('PermanentAddress', sql.NVarChar(500), permanentAddress || address || null)
            .input('TemporaryAddress', sql.NVarChar(500), temporaryAddress || null)
            .input('AttendanceApprover', sql.NVarChar(255), attendanceApprover || null)
            .input('LeaveApprover', sql.NVarChar(255), leaveApprover || null)
            .input('ProfilePicture', sql.NVarChar(500), profilePicture || null)
            .input('LoginAllowed', sql.Bit, loginAllowed !== undefined ? loginAllowed : 1)
            .input('ReceiveEmailNotifications', sql.Bit, receiveEmailNotifications !== undefined ? receiveEmailNotifications : 1)
            .input('Skills', sql.NVarChar(sql.MAX), skills || null)
            .input('ProbationEndDate', sql.Date, probationEndDate || null)
            .input('NoticePeriodStartDate', sql.Date, noticePeriodStartDate || null)
            .input('NoticePeriodEndDate', sql.Date, noticePeriodEndDate || null)
            .input('EmploymentType', sql.NVarChar(50), employmentType || null)
            .input('MaritalStatus', sql.NVarChar(20), maritalStatus || null)
            .input('BusinessAddress', sql.NVarChar(500), businessAddress || null)
            .execute('sp_CreateEmployee');

        const employeeId = result.recordset[0].EmployeeId;

        // Get the created employee
        const createdEmployee = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .execute('sp_GetEmployeeById');

        res.status(201).json(successResponse(createdEmployee.recordset[0], 'Employee created successfully'));
    } catch (error) {
        next(error);
    }
};

// Update employee
const updateEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            firstName, lastName, email, phone, dateOfJoining, departmentId, designationId,
            salutation, country, gender, dateOfBirth, reportingTo, language, userRole,
            address, permanentAddress, temporaryAddress, profilePicture, loginAllowed, receiveEmailNotifications,
            attendanceApprover, leaveApprover,
            skills, probationEndDate, noticePeriodStartDate, noticePeriodEndDate,
            employmentType, maritalStatus, businessAddress
        } = req.body;
        
        const pool = await getConnection();

        await pool.request()
            .input('EmployeeId', sql.Int, id)
            .input('FirstName', sql.NVarChar(100), firstName)
            .input('LastName', sql.NVarChar(100), lastName)
            .input('Email', sql.NVarChar(255), email)
            .input('Phone', sql.NVarChar(20), phone || null)
            .input('DateOfJoining', sql.Date, dateOfJoining)
            .input('DepartmentId', sql.Int, departmentId)
            .input('DesignationId', sql.Int, designationId)
            // New fields
            .input('Salutation', sql.NVarChar(10), salutation || null)
            .input('Country', sql.NVarChar(100), country || null)
            .input('Gender', sql.NVarChar(20), gender || null)
            .input('DateOfBirth', sql.Date, dateOfBirth || null)
            .input('ReportingTo', sql.Int, reportingTo || null)
            .input('Language', sql.NVarChar(50), language || null)
            .input('UserRole', sql.NVarChar(50), userRole || null)
            .input('PermanentAddress', sql.NVarChar(500), permanentAddress || address || null)
            .input('TemporaryAddress', sql.NVarChar(500), temporaryAddress || null)
            .input('AttendanceApprover', sql.NVarChar(255), attendanceApprover || null)
            .input('LeaveApprover', sql.NVarChar(255), leaveApprover || null)
            .input('ProfilePicture', sql.NVarChar(500), profilePicture || null)
            .input('LoginAllowed', sql.Bit, loginAllowed !== undefined ? loginAllowed : 1)
            .input('ReceiveEmailNotifications', sql.Bit, receiveEmailNotifications !== undefined ? receiveEmailNotifications : 1)
            .input('Skills', sql.NVarChar(sql.MAX), skills || null)
            .input('ProbationEndDate', sql.Date, probationEndDate || null)
            .input('NoticePeriodStartDate', sql.Date, noticePeriodStartDate || null)
            .input('NoticePeriodEndDate', sql.Date, noticePeriodEndDate || null)
            .input('EmploymentType', sql.NVarChar(50), employmentType || null)
            .input('MaritalStatus', sql.NVarChar(20), maritalStatus || null)
            .input('BusinessAddress', sql.NVarChar(500), businessAddress || null)
            .execute('sp_UpdateEmployee');

        // Get updated employee
        const updatedEmployee = await pool.request()
            .input('EmployeeId', sql.Int, id)
            .execute('sp_GetEmployeeById');

        res.json(successResponse(updatedEmployee.recordset[0], 'Employee updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Soft delete employee
const deleteEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const deletedBy = req.user?.role || 'admin';
        const pool = await getConnection();

        await pool.request()
            .input('EmployeeId', sql.Int, id)
            .input('DeletedBy', sql.NVarChar(100), deletedBy)
            .input('DeleteReason', sql.NVarChar(500), reason || null)
            .execute('sp_SoftDeleteEmployee');

        res.json(successResponse(null, 'Employee deleted successfully'));
    } catch (error) {
        next(error);
    }
};

// Restore soft-deleted employee (admin/hr only)
const restoreEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('EmployeeId', sql.Int, id)
            .execute('sp_RestoreEmployee');

        res.json(successResponse(null, 'Employee restored successfully'));
    } catch (error) {
        next(error);
    }
};

// Hard delete employee — permanent, admin only
const hardDeleteEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('EmployeeId', sql.Int, id)
            .execute('sp_HardDeleteEmployee');

        res.json(successResponse(null, 'Employee permanently deleted'));
    } catch (error) {
        next(error);
    }
};

// Get employee exit details
const getExitDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, id)
            .execute('sp_GetEmployeeExitDetails');

        if (result.recordset.length === 0) {
            return res.json(successResponse(null, 'No exit details found'));
        }

        res.json(successResponse(result.recordset[0]));
    } catch (error) {
        next(error);
    }
};

// Save employee exit details
const saveExitDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            resignationLetterDate,
            relievingDate,
            exitInterviewDate,
            leaveEncased,
            newWorkplace,
            reasonForLeaving,
            feedback
        } = req.body;
        
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, id)
            .input('ResignationLetterDate', sql.Date, resignationLetterDate || null)
            .input('RelievingDate', sql.Date, relievingDate || null)
            .input('ExitInterviewDate', sql.Date, exitInterviewDate || null)
            .input('LeaveEncased', sql.NVarChar(50), leaveEncased || null)
            .input('NewWorkplace', sql.NVarChar(255), newWorkplace || null)
            .input('ReasonForLeaving', sql.NVarChar(sql.MAX), reasonForLeaving || null)
            .input('Feedback', sql.NVarChar(sql.MAX), feedback || null)
            .execute('sp_SaveEmployeeExitDetails');

        res.json(successResponse(result.recordset[0], 'Exit details saved successfully'));
    } catch (error) {
        next(error);
    }
};

// Get employee approvers
const getApprovers = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, id)
            .execute('sp_GetEmployeeApprovers');

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.json(successResponse(result.recordset[0]));
    } catch (error) {
        next(error);
    }
};

// Save (update) employee approvers — Admin/HR only
const saveApprovers = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { attendanceApproverId, leaveApproverId } = req.body;

        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId',           sql.Int, id)
            .input('AttendanceApproverId', sql.Int, attendanceApproverId || null)
            .input('LeaveApproverId',      sql.Int, leaveApproverId      || null)
            .execute('sp_SaveEmployeeApprovers');

        res.json(successResponse(result.recordset[0], 'Approvers saved successfully'));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    restoreEmployee,
    hardDeleteEmployee,
    getExitDetails,
    saveExitDetails,
    getApprovers,
    saveApprovers
};
