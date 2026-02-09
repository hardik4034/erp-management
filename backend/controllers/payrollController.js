const sql = require('mssql');
const { getConnection } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get all payroll records
const getAllPayroll = async (req, res, next) => {
    try {
        const { employeeId, status, fromDate, toDate, year, month, salaryCycle } = req.query;
        
        console.log('getAllPayroll called with params:', req.query);
        
        const pool = await getConnection();
        
        // Convert empty strings to null for proper SQL parameter handling
        const empId = employeeId && employeeId !== '' ? parseInt(employeeId) : null;
        const statusVal = status && status !== '' ? status : null;
        
        // Validate dates - only pass if they are valid date strings
        const fromDateVal = fromDate && fromDate !== '' && !isNaN(Date.parse(fromDate)) ? fromDate : null;
        const toDateVal = toDate && toDate !== '' && !isNaN(Date.parse(toDate)) ? toDate : null;
        
        // Parse year and month
        const yearVal = year && year !== '' ? parseInt(year) : null;
        const monthVal = month && month !== '' ? parseInt(month) : null;
        const cycleVal = salaryCycle && salaryCycle !== '' ? salaryCycle : null;
        
        console.log('Executing sp_GetAllPayroll with:', {
            empId, statusVal, fromDateVal, toDateVal, yearVal, monthVal, cycleVal
        });
        
        const result = await pool.request()
            .input('EmployeeId', sql.Int, empId)
            .input('Status', sql.NVarChar(20), statusVal)
            .input('FromDate', sql.Date, fromDateVal)
            .input('ToDate', sql.Date, toDateVal)
            .input('Year', sql.Int, yearVal)
            .input('Month', sql.Int, monthVal)
            .input('SalaryCycle', sql.NVarChar(20), cycleVal)
            .execute('sp_GetAllPayroll');

        console.log(`sp_GetAllPayroll returned ${result.recordset.length} records`);
        
        res.json(successResponse(result.recordset));
    } catch (error) {
        console.error('Error in getAllPayroll:', error);
        next(error);
    }
};

// Get payroll by ID
const getPayrollById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('PayrollId', sql.Int, id)
            .execute('sp_GetPayrollById');

        if (result.recordsets[0].length === 0) {
            throw errorResponse('Payroll not found', 404);
        }

        // Combine header and details
        const payroll = result.recordsets[0][0];
        payroll.details = result.recordsets[1] || [];

        res.json(successResponse(payroll));
    } catch (error) {
        next(error);
    }
};

// Generate payroll for employee
const generatePayroll = async (req, res, next) => {
    try {
        const { 
            employeeId, 
            payPeriodStart, 
            payPeriodEnd, 
            payDate,
            includeExpenseClaims = false,
            addSewerageToSalary = false,
            useAttendance = true
        } = req.body;
        
        console.log('Generate Payroll Request:', {
            employeeId,
            payPeriodStart,
            payPeriodEnd,
            payDate,
            includeExpenseClaims,
            addSewerageToSalary,
            useAttendance
        });
        
        const pool = await getConnection();

        console.log('Executing sp_GeneratePayroll...');
        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .input('PayPeriodStart', sql.Date, payPeriodStart)
            .input('PayPeriodEnd', sql.Date, payPeriodEnd)
            .input('PayDate', sql.Date, payDate)
            .input('IncludeExpenseClaims', sql.Bit, includeExpenseClaims)
            .input('AddSewerageToSalary', sql.Bit, addSewerageToSalary)
            .input('UseAttendance', sql.Bit, useAttendance)
            .execute('sp_GeneratePayroll');

        console.log('sp_GeneratePayroll result:', result.recordset);
        const payrollId = result.recordset[0].PayrollId;

        // Get the created payroll
        const createdPayroll = await pool.request()
            .input('PayrollId', sql.Int, payrollId)
            .execute('sp_GetPayrollById');

        const payroll = createdPayroll.recordsets[0][0];
        payroll.details = createdPayroll.recordsets[1] || [];

        res.status(201).json(successResponse(payroll, 'Payroll generated successfully'));
    } catch (error) {
        console.error('Error in generatePayroll:', error);
        next(error);
    }
};

// Create payroll manually
const createPayroll = async (req, res, next) => {
    try {
        const {
            employeeId, payPeriodStart, payPeriodEnd, payDate,
            baseSalary, totalEarnings, totalDeductions, netSalary,
            workingDays, presentDays, absentDays, leaveDays,
            paymentMethod, notes
        } = req.body;

        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .input('PayPeriodStart', sql.Date, payPeriodStart)
            .input('PayPeriodEnd', sql.Date, payPeriodEnd)
            .input('PayDate', sql.Date, payDate)
            .input('BaseSalary', sql.Decimal(18, 2), baseSalary)
            .input('TotalEarnings', sql.Decimal(18, 2), totalEarnings || 0)
            .input('TotalDeductions', sql.Decimal(18, 2), totalDeductions || 0)
            .input('NetSalary', sql.Decimal(18, 2), netSalary)
            .input('WorkingDays', sql.Int, workingDays || 0)
            .input('PresentDays', sql.Int, presentDays || 0)
            .input('AbsentDays', sql.Int, absentDays || 0)
            .input('LeaveDays', sql.Int, leaveDays || 0)
            .input('PaymentMethod', sql.NVarChar(50), paymentMethod || null)
            .input('Notes', sql.NVarChar(sql.MAX), notes || null)
            .execute('sp_CreatePayroll');

        const payrollId = result.recordset[0].PayrollId;

        // Get the created payroll
        const createdPayroll = await pool.request()
            .input('PayrollId', sql.Int, payrollId)
            .execute('sp_GetPayrollById');

        const payroll = createdPayroll.recordsets[0][0];
        payroll.details = createdPayroll.recordsets[1] || [];

        res.status(201).json(successResponse(payroll, 'Payroll created successfully'));
    } catch (error) {
        next(error);
    }
};

// Update payroll
const updatePayroll = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            payDate, baseSalary, totalEarnings, totalDeductions, netSalary,
            workingDays, presentDays, absentDays, leaveDays,
            paymentMethod, notes
        } = req.body;

        const pool = await getConnection();

        await pool.request()
            .input('PayrollId', sql.Int, id)
            .input('PayDate', sql.Date, payDate)
            .input('BaseSalary', sql.Decimal(18, 2), baseSalary)
            .input('TotalEarnings', sql.Decimal(18, 2), totalEarnings)
            .input('TotalDeductions', sql.Decimal(18, 2), totalDeductions)
            .input('NetSalary', sql.Decimal(18, 2), netSalary)
            .input('WorkingDays', sql.Int, workingDays)
            .input('PresentDays', sql.Int, presentDays)
            .input('AbsentDays', sql.Int, absentDays)
            .input('LeaveDays', sql.Int, leaveDays)
            .input('PaymentMethod', sql.NVarChar(50), paymentMethod || null)
            .input('Notes', sql.NVarChar(sql.MAX), notes || null)
            .execute('sp_UpdatePayroll');

        // Get updated payroll
        const updatedPayroll = await pool.request()
            .input('PayrollId', sql.Int, id)
            .execute('sp_GetPayrollById');

        const payroll = updatedPayroll.recordsets[0][0];
        payroll.details = updatedPayroll.recordsets[1] || [];

        res.json(successResponse(payroll, 'Payroll updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Update payroll status
const updatePayrollStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, approvedBy, paymentReference } = req.body;

        const pool = await getConnection();

        await pool.request()
            .input('PayrollId', sql.Int, id)
            .input('Status', sql.NVarChar(20), status)
            .input('ApprovedBy', sql.NVarChar(100), approvedBy || null)
            .input('PaymentReference', sql.NVarChar(100), paymentReference || null)
            .execute('sp_UpdatePayrollStatus');

        res.json(successResponse(null, 'Payroll status updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Delete payroll
const deletePayroll = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('PayrollId', sql.Int, id)
            .execute('sp_DeletePayroll');

        res.json(successResponse(null, 'Payroll deleted successfully'));
    } catch (error) {
        next(error);
    }
};

// Get all payroll components
const getAllComponents = async (req, res, next) => {
    try {
        const { componentType } = req.query;
        const pool = await getConnection();

        const result = await pool.request()
            .input('ComponentType', sql.NVarChar(20), componentType || null)
            .execute('sp_GetAllPayrollComponents');

        res.json(successResponse(result.recordset));
    } catch (error) {
        next(error);
    }
};

// Add payroll detail
const addPayrollDetail = async (req, res, next) => {
    try {
        const { payrollId, componentId, amount, remarks } = req.body;
        const pool = await getConnection();

        const result = await pool.request()
            .input('PayrollId', sql.Int, payrollId)
            .input('ComponentId', sql.Int, componentId)
            .input('Amount', sql.Decimal(18, 2), amount)
            .input('Remarks', sql.NVarChar(500), remarks || null)
            .execute('sp_AddPayrollDetail');

        res.status(201).json(successResponse(result.recordset[0], 'Payroll detail added successfully'));
    } catch (error) {
        next(error);
    }
};

// Update payroll detail
const updatePayrollDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, remarks } = req.body;
        const pool = await getConnection();

        await pool.request()
            .input('PayrollDetailId', sql.Int, id)
            .input('Amount', sql.Decimal(18, 2), amount)
            .input('Remarks', sql.NVarChar(500), remarks || null)
            .execute('sp_UpdatePayrollDetail');

        res.json(successResponse(null, 'Payroll detail updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Delete payroll detail
const deletePayrollDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        await pool.request()
            .input('PayrollDetailId', sql.Int, id)
            .execute('sp_DeletePayrollDetail');

        res.json(successResponse(null, 'Payroll detail deleted successfully'));
    } catch (error) {
        next(error);
    }
};

// Calculate attendance for period
const calculateAttendance = async (req, res, next) => {
    try {
        const { employeeId, startDate, endDate } = req.query;
        const pool = await getConnection();

        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .input('StartDate', sql.Date, startDate)
            .input('EndDate', sql.Date, endDate)
            .execute('sp_CalculateAttendanceForPeriod');

        res.json(successResponse(result.recordset[0]));
    } catch (error) {
        next(error);
    }
};

// Generate bulk payroll for multiple employees
const generateBulkPayroll = async (req, res, next) => {
    try {
        const {
            employeeIds,
            payPeriodStart,
            payPeriodEnd,
            payDate,
            includeExpenseClaims = false,
            addSewerageToSalary = false,
            useAttendance = true,
            departmentId = null
        } = req.body;

        if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json(errorResponse('Employee IDs are required', 400));
        }

        const pool = await getConnection();

        // Convert array to comma-separated string
        const employeeIdsString = employeeIds.join(',');

        const result = await pool.request()
            .input('EmployeeIds', sql.NVarChar(sql.MAX), employeeIdsString)
            .input('PayPeriodStart', sql.Date, payPeriodStart)
            .input('PayPeriodEnd', sql.Date, payPeriodEnd)
            .input('PayDate', sql.Date, payDate)
            .input('IncludeExpenseClaims', sql.Bit, includeExpenseClaims)
            .input('AddSewerageToSalary', sql.Bit, addSewerageToSalary)
            .input('UseAttendance', sql.Bit, useAttendance)
            .input('DepartmentId', sql.Int, departmentId)
            .execute('sp_GeneratePayrollBulk');

        const generatedPayrollIds = result.recordset;

        res.status(201).json(successResponse(
            generatedPayrollIds,
            `Payroll generated successfully for ${generatedPayrollIds.length} employee(s)`
        ));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllPayroll,
    getPayrollById,
    generatePayroll,
    generateBulkPayroll,
    createPayroll,
    updatePayroll,
    updatePayrollStatus,
    deletePayroll,
    getAllComponents,
    addPayrollDetail,
    updatePayrollDetail,
    deletePayrollDetail,
    calculateAttendance
};
