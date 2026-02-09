-- Quick fix: Ensure payroll schema and data exist
USE HRMS;
GO

-- Check if PayrollComponents table exists and has data
IF OBJECT_ID('PayrollComponents', 'U') IS NOT NULL
BEGIN
    DECLARE @ComponentCount INT;
    SELECT @ComponentCount = COUNT(*) FROM PayrollComponents WHERE IsActive = 1;
    
    IF @ComponentCount = 0
    BEGIN
        PRINT 'No active payroll components found. Inserting default components...';
        
        INSERT INTO PayrollComponents (ComponentName, ComponentType, CalculationType, DefaultValue, Description) VALUES 
        -- Earnings
        ('Basic Salary', 'Earning', 'Fixed', 0, 'Base salary amount'),
        ('HRA (House Rent Allowance)', 'Earning', 'Percentage', 40, '40% of Basic Salary'),
        ('Transport Allowance', 'Earning', 'Fixed', 1600, 'Fixed transport allowance'),
        ('Medical Allowance', 'Earning', 'Fixed', 1250, 'Fixed medical allowance'),
        ('Special Allowance', 'Earning', 'Percentage', 10, '10% of Basic Salary'),
        
        -- Deductions
        ('Provident Fund (PF)', 'Deduction', 'Percentage', 12, '12% of Basic Salary'),
        ('Professional Tax', 'Deduction', 'Fixed', 200, 'Professional tax deduction'),
        ('Income Tax (TDS)', 'Deduction', 'Percentage', 10, 'Tax deducted at source');
        
        PRINT 'Default payroll components inserted successfully!';
    END
    ELSE
    BEGIN
        PRINT CAST(@ComponentCount AS NVARCHAR(10)) + ' active payroll components found.';
    END
END
ELSE
BEGIN
    PRINT 'ERROR: PayrollComponents table does not exist!';
    PRINT 'Please run payroll-schema.sql first.';
END
GO

-- Check if employees have salary configured
DECLARE @EmployeeWithSalaryCount INT;
SELECT @EmployeeWithSalaryCount = COUNT(*) FROM Employees WHERE Salary IS NOT NULL AND Salary > 0;

IF @EmployeeWithSalaryCount = 0
BEGIN
    PRINT 'WARNING: No employees have salary configured!';
    PRINT 'You need to set salary for employees before generating payroll.';
END
ELSE
BEGIN
    PRINT CAST(@EmployeeWithSalaryCount AS NVARCHAR(10)) + ' employees have salary configured.';
END
GO

PRINT 'Payroll setup check complete!';
GO
