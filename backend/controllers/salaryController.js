const { getConnection } = require('../config/database');
const sql = require('mssql');

// Get all employee salaries
const getAllSalaries = async (req, res) => {
    try {
        const { employeeId, salaryGroupId, isActive } = req.query;
        const pool = await getConnection();
        
        // Convert empty strings to null for proper SQL parameter handling
        const empId = employeeId && employeeId !== '' ? parseInt(employeeId) : null;
        const groupId = salaryGroupId && salaryGroupId !== '' ? parseInt(salaryGroupId) : null;
        const active = isActive !== undefined && isActive !== '' ? isActive : null;
        
        const result = await pool.request()
            .input('EmployeeId', sql.Int, empId)
            .input('SalaryGroupId', sql.Int, groupId)
            .input('IsActive', sql.Bit, active)
            .execute('sp_GetAllEmployeeSalaries');
        
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Error getting salaries:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get salary by ID
const getSalaryById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        const result = await pool.request()
            .input('EmployeeSalaryId', sql.Int, id)
            .execute('sp_GetEmployeeSalaryById');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Salary record not found' });
        }
        
        res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
        console.error('Error getting salary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get current salary for employee
const getCurrentSalary = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const pool = await getConnection();
        
        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .execute('sp_GetCurrentEmployeeSalary');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'No active salary found for employee' });
        }
        
        res.json({ success: true, data: result.recordset[0] });
    } catch (error) {
        console.error('Error getting current salary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get salary history for employee
const getSalaryHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const pool = await getConnection();
        
        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .execute('sp_GetEmployeeSalaryHistory');
        
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Error getting salary history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create salary
const createSalary = async (req, res) => {
    try {
        const {
            employeeId,
            salaryGroupId,
            baseSalary,
            salaryCycle,
            currency,
            allowPayrollGenerate,
            netSalaryMonthly,
            effectiveFrom,
            effectiveTo
        } = req.body;

        // Validation
        if (!employeeId || !baseSalary || !effectiveFrom) {
            return res.status(400).json({ 
                success: false, 
                error: 'Employee ID, base salary, and effective from date are required' 
            });
        }

        const pool = await getConnection();
        
        const result = await pool.request()
            .input('EmployeeId', sql.Int, employeeId)
            .input('SalaryGroupId', sql.Int, salaryGroupId || null)
            .input('BaseSalary', sql.Decimal(18, 2), baseSalary)
            .input('SalaryCycle', sql.NVarChar(20), salaryCycle || 'Monthly')
            .input('Currency', sql.NVarChar(10), currency || 'USD')
            .input('AllowPayrollGenerate', sql.Bit, allowPayrollGenerate || 0)
            .input('NetSalaryMonthly', sql.Decimal(18, 2), netSalaryMonthly || null)
            .input('EffectiveFrom', sql.Date, effectiveFrom)
            .input('EffectiveTo', sql.Date, effectiveTo || null)
            .execute('sp_CreateEmployeeSalary');
        
        const newId = result.recordset[0].EmployeeSalaryId;
        res.status(201).json({ 
            success: true, 
            message: 'Salary created successfully',
            data: { employeeSalaryId: newId }
        });
    } catch (error) {
        console.error('Error creating salary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update salary
const updateSalary = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            salaryGroupId,
            baseSalary,
            salaryCycle,
            currency,
            allowPayrollGenerate,
            netSalaryMonthly,
            effectiveFrom,
            effectiveTo
        } = req.body;

        const pool = await getConnection();
        
        await pool.request()
            .input('EmployeeSalaryId', sql.Int, id)
            .input('SalaryGroupId', sql.Int, salaryGroupId || null)
            .input('BaseSalary', sql.Decimal(18, 2), baseSalary)
            .input('SalaryCycle', sql.NVarChar(20), salaryCycle)
            .input('Currency', sql.NVarChar(10), currency)
            .input('AllowPayrollGenerate', sql.Bit, allowPayrollGenerate)
            .input('NetSalaryMonthly', sql.Decimal(18, 2), netSalaryMonthly || null)
            .input('EffectiveFrom', sql.Date, effectiveFrom)
            .input('EffectiveTo', sql.Date, effectiveTo || null)
            .execute('sp_UpdateEmployeeSalary');
        
        res.json({ success: true, message: 'Salary updated successfully' });
    } catch (error) {
        console.error('Error updating salary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete salary
const deleteSalary = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        await pool.request()
            .input('EmployeeSalaryId', sql.Int, id)
            .execute('sp_DeleteEmployeeSalary');
        
        res.json({ success: true, message: 'Salary deleted successfully' });
    } catch (error) {
        console.error('Error deleting salary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all salary groups
const getAllSalaryGroups = async (req, res) => {
    try {
        const pool = await getConnection();
        
        const result = await pool.request()
            .execute('sp_GetAllSalaryGroups');
        
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Error getting salary groups:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create salary group
const createSalaryGroup = async (req, res) => {
    try {
        const { groupName, description } = req.body;

        if (!groupName) {
            return res.status(400).json({ 
                success: false, 
                error: 'Group name is required' 
            });
        }

        const pool = await getConnection();
        
        const result = await pool.request()
            .input('GroupName', sql.NVarChar(100), groupName)
            .input('Description', sql.NVarChar(500), description || null)
            .execute('sp_CreateSalaryGroup');
        
        const newId = result.recordset[0].SalaryGroupId;
        res.status(201).json({ 
            success: true, 
            message: 'Salary group created successfully',
            data: { salaryGroupId: newId }
        });
    } catch (error) {
        console.error('Error creating salary group:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getAllSalaries,
    getSalaryById,
    getCurrentSalary,
    getSalaryHistory,
    createSalary,
    updateSalary,
    deleteSalary,
    getAllSalaryGroups,
    createSalaryGroup
};
