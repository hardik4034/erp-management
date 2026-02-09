-- =============================================
-- Employee Salary Management - Stored Procedures
-- All CRUD operations for employee salary
-- =============================================

USE HRMS;
GO

-- =============================================
-- SALARY GROUP PROCEDURES
-- =============================================

-- Get All Salary Groups
CREATE OR ALTER PROCEDURE sp_GetAllSalaryGroups
AS
BEGIN
    SELECT * FROM SalaryGroups
    WHERE IsActive = 1
    ORDER BY GroupName;
END
GO

-- Create Salary Group
CREATE OR ALTER PROCEDURE sp_CreateSalaryGroup
    @GroupName NVARCHAR(100),
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    INSERT INTO SalaryGroups (GroupName, Description)
    VALUES (@GroupName, @Description);
    
    SELECT SCOPE_IDENTITY() AS SalaryGroupId;
END
GO

-- =============================================
-- EMPLOYEE SALARY PROCEDURES
-- =============================================

-- Get All Employee Salaries
CREATE OR ALTER PROCEDURE sp_GetAllEmployeeSalaries
    @EmployeeId INT = NULL,
    @SalaryGroupId INT = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    SELECT 
        es.*,
        e.EmployeeCode,
        e.FirstName,
        e.LastName,
        e.Email,
        d.DepartmentName,
        des.DesignationName,
        sg.GroupName AS SalaryGroupName
    FROM EmployeeSalary es
    JOIN Employees e ON es.EmployeeId = e.EmployeeId
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN SalaryGroups sg ON es.SalaryGroupId = sg.SalaryGroupId
    WHERE (@EmployeeId IS NULL OR es.EmployeeId = @EmployeeId)
      AND (@SalaryGroupId IS NULL OR es.SalaryGroupId = @SalaryGroupId)
      AND (@IsActive IS NULL OR es.IsActive = @IsActive)
    ORDER BY e.FirstName, e.LastName, es.EffectiveFrom DESC;
END
GO

-- Get Employee Salary By ID
CREATE OR ALTER PROCEDURE sp_GetEmployeeSalaryById
    @EmployeeSalaryId INT
AS
BEGIN
    SELECT 
        es.*,
        e.EmployeeCode,
        e.FirstName,
        e.LastName,
        e.Email,
        d.DepartmentName,
        des.DesignationName,
        sg.GroupName AS SalaryGroupName
    FROM EmployeeSalary es
    JOIN Employees e ON es.EmployeeId = e.EmployeeId
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN SalaryGroups sg ON es.SalaryGroupId = sg.SalaryGroupId
    WHERE es.EmployeeSalaryId = @EmployeeSalaryId;
END
GO

-- Get Current Employee Salary
CREATE OR ALTER PROCEDURE sp_GetCurrentEmployeeSalary
    @EmployeeId INT
AS
BEGIN
    SELECT TOP 1
        es.*,
        e.EmployeeCode,
        e.FirstName,
        e.LastName,
        e.Email,
        d.DepartmentName,
        des.DesignationName,
        sg.GroupName AS SalaryGroupName
    FROM EmployeeSalary es
    JOIN Employees e ON es.EmployeeId = e.EmployeeId
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN SalaryGroups sg ON es.SalaryGroupId = sg.SalaryGroupId
    WHERE es.EmployeeId = @EmployeeId
      AND es.IsActive = 1
      AND es.EffectiveFrom <= GETDATE()
      AND (es.EffectiveTo IS NULL OR es.EffectiveTo >= GETDATE())
    ORDER BY es.EffectiveFrom DESC;
END
GO

-- Create Employee Salary
CREATE OR ALTER PROCEDURE sp_CreateEmployeeSalary
    @EmployeeId INT,
    @SalaryGroupId INT = NULL,
    @BaseSalary DECIMAL(18, 2),
    @SalaryCycle NVARCHAR(20) = 'Monthly',
    @Currency NVARCHAR(10) = 'USD',
    @AllowPayrollGenerate BIT = 0,
    @NetSalaryMonthly DECIMAL(18, 2) = NULL,
    @EffectiveFrom DATE,
    @EffectiveTo DATE = NULL
AS
BEGIN
    -- Deactivate previous active salary records for this employee
    UPDATE EmployeeSalary
    SET IsActive = 0,
        EffectiveTo = DATEADD(DAY, -1, @EffectiveFrom)
    WHERE EmployeeId = @EmployeeId
      AND IsActive = 1
      AND EffectiveFrom < @EffectiveFrom;
    
    -- Insert new salary record
    INSERT INTO EmployeeSalary (
        EmployeeId, SalaryGroupId, BaseSalary, SalaryCycle, Currency,
        AllowPayrollGenerate, NetSalaryMonthly, EffectiveFrom, EffectiveTo
    )
    VALUES (
        @EmployeeId, @SalaryGroupId, @BaseSalary, @SalaryCycle, @Currency,
        @AllowPayrollGenerate, @NetSalaryMonthly, @EffectiveFrom, @EffectiveTo
    );
    
    SELECT SCOPE_IDENTITY() AS EmployeeSalaryId;
END
GO

-- Update Employee Salary
CREATE OR ALTER PROCEDURE sp_UpdateEmployeeSalary
    @EmployeeSalaryId INT,
    @SalaryGroupId INT = NULL,
    @BaseSalary DECIMAL(18, 2),
    @SalaryCycle NVARCHAR(20),
    @Currency NVARCHAR(10),
    @AllowPayrollGenerate BIT,
    @NetSalaryMonthly DECIMAL(18, 2) = NULL,
    @EffectiveFrom DATE,
    @EffectiveTo DATE = NULL
AS
BEGIN
    UPDATE EmployeeSalary
    SET SalaryGroupId = @SalaryGroupId,
        BaseSalary = @BaseSalary,
        SalaryCycle = @SalaryCycle,
        Currency = @Currency,
        AllowPayrollGenerate = @AllowPayrollGenerate,
        NetSalaryMonthly = @NetSalaryMonthly,
        EffectiveFrom = @EffectiveFrom,
        EffectiveTo = @EffectiveTo
    WHERE EmployeeSalaryId = @EmployeeSalaryId;
END
GO

-- Delete Employee Salary (Soft Delete)
CREATE OR ALTER PROCEDURE sp_DeleteEmployeeSalary
    @EmployeeSalaryId INT
AS
BEGIN
    UPDATE EmployeeSalary
    SET IsActive = 0
    WHERE EmployeeSalaryId = @EmployeeSalaryId;
END
GO

-- Get Salary History for Employee
CREATE OR ALTER PROCEDURE sp_GetEmployeeSalaryHistory
    @EmployeeId INT
AS
BEGIN
    SELECT 
        es.*,
        sg.GroupName AS SalaryGroupName
    FROM EmployeeSalary es
    LEFT JOIN SalaryGroups sg ON es.SalaryGroupId = sg.SalaryGroupId
    WHERE es.EmployeeId = @EmployeeId
    ORDER BY es.EffectiveFrom DESC;
END
GO

PRINT 'Employee Salary stored procedures created successfully!';
GO
