-- =============================================
-- Employee Salary Management - Database Schema
-- Database: HRMS
-- MSSQL Server
-- =============================================

USE HRMS;
GO

-- =============================================
-- Table: SalaryGroups
-- Stores salary group configurations
-- =============================================
IF OBJECT_ID('SalaryGroups', 'U') IS NULL
BEGIN
    CREATE TABLE SalaryGroups (
        SalaryGroupId INT PRIMARY KEY IDENTITY(1,1),
        GroupName NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(500),
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'SalaryGroups table created successfully!';
END
ELSE
BEGIN
    PRINT 'SalaryGroups table already exists.';
END
GO

-- =============================================
-- Table: EmployeeSalary
-- Stores employee salary configurations
-- =============================================
IF OBJECT_ID('EmployeeSalary', 'U') IS NULL
BEGIN
    CREATE TABLE EmployeeSalary (
        EmployeeSalaryId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        SalaryGroupId INT,
        
        -- Salary Details
        BaseSalary DECIMAL(18, 2) NOT NULL,
        SalaryCycle NVARCHAR(20) DEFAULT 'Monthly' CHECK (SalaryCycle IN ('Monthly', 'Weekly', 'Bi-Weekly', 'Annual')),
        Currency NVARCHAR(10) DEFAULT 'USD',
        
        -- Payroll Settings
        AllowPayrollGenerate BIT DEFAULT 0,
        NetSalaryMonthly DECIMAL(18, 2),
        
        -- Effective Dates
        EffectiveFrom DATE NOT NULL,
        EffectiveTo DATE,
        
        -- Status
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_EmployeeSalary_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
        CONSTRAINT FK_EmployeeSalary_SalaryGroups FOREIGN KEY (SalaryGroupId) REFERENCES SalaryGroups(SalaryGroupId)
    );
    PRINT 'EmployeeSalary table created successfully!';
END
ELSE
BEGIN
    PRINT 'EmployeeSalary table already exists.';
END
GO

-- =============================================
-- Create Indexes for Performance
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EmployeeSalary_EmployeeId' AND object_id = OBJECT_ID('EmployeeSalary'))
BEGIN
    CREATE INDEX IX_EmployeeSalary_EmployeeId ON EmployeeSalary(EmployeeId);
    PRINT 'Index IX_EmployeeSalary_EmployeeId created.';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EmployeeSalary_EffectiveFrom' AND object_id = OBJECT_ID('EmployeeSalary'))
BEGIN
    CREATE INDEX IX_EmployeeSalary_EffectiveFrom ON EmployeeSalary(EffectiveFrom);
    PRINT 'Index IX_EmployeeSalary_EffectiveFrom created.';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EmployeeSalary_IsActive' AND object_id = OBJECT_ID('EmployeeSalary'))
BEGIN
    CREATE INDEX IX_EmployeeSalary_IsActive ON EmployeeSalary(IsActive);
    PRINT 'Index IX_EmployeeSalary_IsActive created.';
END
GO

-- =============================================
-- Insert Default Salary Groups (only if they don't exist)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM SalaryGroups WHERE GroupName = 'Standard')
    INSERT INTO SalaryGroups (GroupName, Description) VALUES ('Standard', 'Standard salary group');

IF NOT EXISTS (SELECT 1 FROM SalaryGroups WHERE GroupName = 'Executive')
    INSERT INTO SalaryGroups (GroupName, Description) VALUES ('Executive', 'Executive level salary group');

IF NOT EXISTS (SELECT 1 FROM SalaryGroups WHERE GroupName = 'Contract')
    INSERT INTO SalaryGroups (GroupName, Description) VALUES ('Contract', 'Contract workers salary group');

IF NOT EXISTS (SELECT 1 FROM SalaryGroups WHERE GroupName = 'Intern')
    INSERT INTO SalaryGroups (GroupName, Description) VALUES ('Intern', 'Internship salary group');

PRINT 'Default salary groups verified.';
GO

-- =============================================
-- Create Triggers
-- =============================================
IF OBJECT_ID('trg_EmployeeSalary_UpdatedAt', 'TR') IS NOT NULL
    DROP TRIGGER trg_EmployeeSalary_UpdatedAt;
GO

CREATE TRIGGER trg_EmployeeSalary_UpdatedAt ON EmployeeSalary
AFTER UPDATE
AS
BEGIN
    UPDATE EmployeeSalary
    SET UpdatedAt = GETDATE()
    FROM EmployeeSalary es
    INNER JOIN inserted i ON es.EmployeeSalaryId = i.EmployeeSalaryId;
END
GO
PRINT 'Trigger trg_EmployeeSalary_UpdatedAt created.';
GO

IF OBJECT_ID('trg_SalaryGroups_UpdatedAt', 'TR') IS NOT NULL
    DROP TRIGGER trg_SalaryGroups_UpdatedAt;
GO

CREATE TRIGGER trg_SalaryGroups_UpdatedAt ON SalaryGroups
AFTER UPDATE
AS
BEGIN
    UPDATE SalaryGroups
    SET UpdatedAt = GETDATE()
    FROM SalaryGroups sg
    INNER JOIN inserted i ON sg.SalaryGroupId = i.SalaryGroupId;
END
GO
PRINT 'Trigger trg_SalaryGroups_UpdatedAt created.';
GO

IF OBJECT_ID('trg_SyncEmployeeSalary', 'TR') IS NOT NULL
    DROP TRIGGER trg_SyncEmployeeSalary;
GO

CREATE TRIGGER trg_SyncEmployeeSalary ON EmployeeSalary
AFTER INSERT, UPDATE
AS
BEGIN
    UPDATE Employees
    SET Salary = i.BaseSalary,
        SalaryType = i.SalaryCycle,
        Currency = i.Currency
    FROM Employees e
    INNER JOIN inserted i ON e.EmployeeId = i.EmployeeId
    WHERE i.IsActive = 1;
END
GO
PRINT 'Trigger trg_SyncEmployeeSalary created.';
GO

PRINT '========================================';
PRINT 'Employee Salary schema setup complete!';
PRINT '========================================';
GO
