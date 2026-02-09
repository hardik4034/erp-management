-- =============================================
-- Sample Payroll Data for Testing
-- =============================================

USE HRMS;
GO

-- First, let's check if we have employees with salaries configured
PRINT 'Checking employees with salaries...';
SELECT EmployeeId, EmployeeCode, FirstName, LastName, Salary, SalaryType, Currency
FROM Employees
WHERE Salary IS NOT NULL AND Salary > 0;
GO

-- Update some employees with sample salaries if they don't have any
UPDATE Employees
SET Salary = 50000,
    SalaryType = 'Monthly',
    Currency = 'USD'
WHERE EmployeeId = 1 AND (Salary IS NULL OR Salary = 0);

UPDATE Employees
SET Salary = 60000,
    SalaryType = 'Monthly',
    Currency = 'USD'
WHERE EmployeeId = 2 AND (Salary IS NULL OR Salary = 0);

UPDATE Employees
SET Salary = 45000,
    SalaryType = 'Monthly',
    Currency = 'USD'
WHERE EmployeeId = 3 AND (Salary IS NULL OR Salary = 0);

PRINT 'Employee salaries updated!';
GO

-- Generate sample payroll for January 2026
PRINT 'Generating sample payroll records...';
GO

-- Generate payroll for Employee 1
DECLARE @PayrollId1 INT;
BEGIN TRY
    EXEC sp_GeneratePayroll 
        @EmployeeId = 1,
        @PayPeriodStart = '2026-01-01',
        @PayPeriodEnd = '2026-01-31',
        @PayDate = '2026-01-31',
        @IncludeExpenseClaims = 0,
        @AddTimerangeToSalary = 0,
        @UseAttendance = 1;
    PRINT 'Payroll generated for Employee 1';
END TRY
BEGIN CATCH
    PRINT 'Error generating payroll for Employee 1: ' + ERROR_MESSAGE();
END CATCH
GO

-- Generate payroll for Employee 2
BEGIN TRY
    EXEC sp_GeneratePayroll 
        @EmployeeId = 2,
        @PayPeriodStart = '2026-01-01',
        @PayPeriodEnd = '2026-01-31',
        @PayDate = '2026-01-31',
        @IncludeExpenseClaims = 0,
        @AddTimerangeToSalary = 0,
        @UseAttendance = 1;
    PRINT 'Payroll generated for Employee 2';
END TRY
BEGIN CATCH
    PRINT 'Error generating payroll for Employee 2: ' + ERROR_MESSAGE();
END CATCH
GO

-- Generate payroll for Employee 3
BEGIN TRY
    EXEC sp_GeneratePayroll 
        @EmployeeId = 3,
        @PayPeriodStart = '2026-01-01',
        @PayPeriodEnd = '2026-01-31',
        @PayDate = '2026-01-31',
        @IncludeExpenseClaims = 0,
        @AddTimerangeToSalary = 0,
        @UseAttendance = 1;
    PRINT 'Payroll generated for Employee 3';
END TRY
BEGIN CATCH
    PRINT 'Error generating payroll for Employee 3: ' + ERROR_MESSAGE();
END CATCH
GO

-- Update one payroll to Approved status
UPDATE TOP (1) Payroll
SET Status = 'Approved',
    ApprovedBy = 'Admin',
    ApprovedDate = GETDATE()
WHERE Status = 'Draft';

PRINT 'One payroll record approved!';
GO

-- Update one payroll to Paid status
UPDATE TOP (1) Payroll
SET Status = 'Paid',
    ApprovedBy = 'Admin',
    ApprovedDate = GETDATE(),
    PaymentReference = 'PAY-2026-001'
WHERE Status = 'Draft';

PRINT 'One payroll record marked as paid!';
GO

-- Display summary
PRINT '';
PRINT '========================================';
PRINT 'Sample Payroll Data Created!';
PRINT '========================================';
PRINT '';

SELECT 
    'Payroll Summary' AS Info,
    COUNT(*) AS TotalRecords,
    SUM(CASE WHEN Status = 'Draft' THEN 1 ELSE 0 END) AS Draft,
    SUM(CASE WHEN Status = 'Approved' THEN 1 ELSE 0 END) AS Approved,
    SUM(CASE WHEN Status = 'Paid' THEN 1 ELSE 0 END) AS Paid,
    SUM(NetSalary) AS TotalNetSalary
FROM Payroll;

PRINT '';
PRINT 'Payroll Records:';
SELECT 
    p.PayrollId,
    e.EmployeeCode,
    e.FirstName + ' ' + e.LastName AS EmployeeName,
    p.PayPeriodStart,
    p.PayPeriodEnd,
    p.BaseSalary,
    p.TotalEarnings,
    p.TotalDeductions,
    p.NetSalary,
    (p.BaseSalary + p.TotalEarnings) AS CTC,
    p.Status
FROM Payroll p
JOIN Employees e ON p.EmployeeId = e.EmployeeId
ORDER BY p.PayrollId DESC;

PRINT '';
PRINT 'Next Steps:';
PRINT '1. Refresh your browser page';
PRINT '2. Navigate to http://localhost:8080/pages/payroll.html';
PRINT '3. You should see the sample payroll records!';
PRINT '';
GO
