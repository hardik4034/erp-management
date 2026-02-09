const sql = require('mssql');
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get all employees
const getAllEmployees = async (req, res, next) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .execute('sp_GetAllEmployees');

        res.json(successResponse(result.recordset));
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
            salutation, password, country, gender, dateOfBirth, reportingTo, language, userRole,
            address, about, profilePicture, loginAllowed, receiveEmailNotifications,
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
            .input('Password', sql.NVarChar(255), password || null)
            .input('Country', sql.NVarChar(100), country || null)
            .input('Gender', sql.NVarChar(20), gender || null)
            .input('DateOfBirth', sql.Date, dateOfBirth || null)
            .input('ReportingTo', sql.Int, reportingTo || null)
            .input('Language', sql.NVarChar(50), language || null)
            .input('UserRole', sql.NVarChar(50), userRole || null)
            .input('Address', sql.NVarChar(500), address || null)
            .input('About', sql.NVarChar(1000), about || null)
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
            salutation, password, country, gender, dateOfBirth, reportingTo, language, userRole,
            address, about, profilePicture, loginAllowed, receiveEmailNotifications,
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
            .input('Password', sql.NVarChar(255), password || null)
            .input('Country', sql.NVarChar(100), country || null)
            .input('Gender', sql.NVarChar(20), gender || null)
            .input('DateOfBirth', sql.Date, dateOfBirth || null)
            .input('ReportingTo', sql.Int, reportingTo || null)
            .input('Language', sql.NVarChar(50), language || null)
            .input('UserRole', sql.NVarChar(50), userRole || null)
            .input('Address', sql.NVarChar(500), address || null)
            .input('About', sql.NVarChar(1000), about || null)
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

// Delete employee (soft delete)
const deleteEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('EmployeeId', sql.Int, id)
            .execute('sp_DeleteEmployee');

        res.json(successResponse(null, 'Employee deleted successfully'));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
};
