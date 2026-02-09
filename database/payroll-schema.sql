-- =============================================
-- Payroll Management System - Database Schema
-- Database: HRMS
-- MSSQL Server
-- =============================================

USE HRMS;
GO

-- =============================================
-- Add Salary field to Employees table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'Salary')
BEGIN
    ALTER TABLE Employees ADD Salary DECIMAL(18, 2) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'SalaryType')
BEGIN
    ALTER TABLE Employees ADD SalaryType NVARCHAR(20) DEFAULT 'Monthly' CHECK (SalaryType IN ('Hourly', 'Monthly', 'Annual'));
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'Currency')
BEGIN
    ALTER TABLE Employees ADD Currency NVARCHAR(10) DEFAULT 'USD';
END
GO

-- =============================================
-- Table: PayrollComponents
-- Stores earning and deduction components
-- =============================================
IF OBJECT_ID('PayrollComponents', 'U') IS NOT NULL DROP TABLE PayrollComponents;
GO

CREATE TABLE PayrollComponents (
    ComponentId INT PRIMARY KEY IDENTITY(1,1),
    ComponentName NVARCHAR(100) NOT NULL UNIQUE,
    ComponentType NVARCHAR(20) NOT NULL CHECK (ComponentType IN ('Earning', 'Deduction')),
    CalculationType NVARCHAR(20) NOT NULL CHECK (CalculationType IN ('Fixed', 'Percentage')),
    DefaultValue DECIMAL(18, 2) DEFAULT 0,
    Description NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- =============================================
-- Table: Payroll
-- Main payroll records
-- =============================================
IF OBJECT_ID('Payroll', 'U') IS NOT NULL DROP TABLE Payroll;
GO

CREATE TABLE Payroll (
    PayrollId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    PayPeriodStart DATE NOT NULL,
    PayPeriodEnd DATE NOT NULL,
    PayDate DATE NOT NULL,
    
    -- Salary Details
    BaseSalary DECIMAL(18, 2) NOT NULL,
    TotalEarnings DECIMAL(18, 2) DEFAULT 0,
    TotalDeductions DECIMAL(18, 2) DEFAULT 0,
    NetSalary DECIMAL(18, 2) NOT NULL,
    CTC AS (BaseSalary + TotalEarnings) PERSISTED, -- Computed column for CTC
    
    -- Working Days
    WorkingDays INT DEFAULT 0,
    PresentDays INT DEFAULT 0,
    AbsentDays INT DEFAULT 0,
    LeaveDays INT DEFAULT 0,
    
    -- Status
    Status NVARCHAR(20) DEFAULT 'Draft' CHECK (Status IN ('Draft', 'Approved', 'Paid', 'Cancelled')),
    ApprovedBy NVARCHAR(100),
    ApprovedDate DATETIME,
    
    -- Payment Details
    PaymentMethod NVARCHAR(50),
    PaymentReference NVARCHAR(100),
    
    -- Metadata
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_Payroll_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
    CONSTRAINT UQ_Payroll_Employee_Period UNIQUE (EmployeeId, PayPeriodStart, PayPeriodEnd)
);
GO

-- =============================================
-- Table: PayrollDetails
-- Individual payroll component details
-- =============================================
IF OBJECT_ID('PayrollDetails', 'U') IS NOT NULL DROP TABLE PayrollDetails;
GO

CREATE TABLE PayrollDetails (
    PayrollDetailId INT PRIMARY KEY IDENTITY(1,1),
    PayrollId INT NOT NULL,
    ComponentId INT NOT NULL,
    ComponentName NVARCHAR(100) NOT NULL,
    ComponentType NVARCHAR(20) NOT NULL,
    Amount DECIMAL(18, 2) NOT NULL,
    Remarks NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_PayrollDetails_Payroll FOREIGN KEY (PayrollId) REFERENCES Payroll(PayrollId) ON DELETE CASCADE,
    CONSTRAINT FK_PayrollDetails_Components FOREIGN KEY (ComponentId) REFERENCES PayrollComponents(ComponentId)
);
GO

-- =============================================
-- Create Indexes for Performance
-- =============================================
CREATE INDEX IX_Payroll_EmployeeId ON Payroll(EmployeeId);
CREATE INDEX IX_Payroll_PayPeriod ON Payroll(PayPeriodStart, PayPeriodEnd);
CREATE INDEX IX_Payroll_Status ON Payroll(Status);
CREATE INDEX IX_PayrollDetails_PayrollId ON PayrollDetails(PayrollId);
GO

-- =============================================
-- Insert Default Payroll Components
-- =============================================
INSERT INTO PayrollComponents (ComponentName, ComponentType, CalculationType, DefaultValue, Description) VALUES 
-- Earnings
('Basic Salary', 'Earning', 'Fixed', 0, 'Base salary amount'),
('HRA (House Rent Allowance)', 'Earning', 'Percentage', 40, '40% of Basic Salary'),
('Transport Allowance', 'Earning', 'Fixed', 1600, 'Fixed transport allowance'),
('Medical Allowance', 'Earning', 'Fixed', 1250, 'Fixed medical allowance'),
('Special Allowance', 'Earning', 'Percentage', 10, '10% of Basic Salary'),
('Performance Bonus', 'Earning', 'Fixed', 0, 'Performance-based bonus'),
('Overtime Pay', 'Earning', 'Fixed', 0, 'Overtime compensation'),

-- Deductions
('Provident Fund (PF)', 'Deduction', 'Percentage', 12, '12% of Basic Salary'),
('Professional Tax', 'Deduction', 'Fixed', 200, 'Professional tax deduction'),
('Income Tax (TDS)', 'Deduction', 'Percentage', 10, 'Tax deducted at source'),
('Insurance Premium', 'Deduction', 'Fixed', 500, 'Health insurance premium'),
('Loan Repayment', 'Deduction', 'Fixed', 0, 'Employee loan repayment'),
('Other Deductions', 'Deduction', 'Fixed', 0, 'Miscellaneous deductions');
GO

-- =============================================
-- Create Triggers
-- =============================================
CREATE TRIGGER trg_Payroll_UpdatedAt ON Payroll
AFTER UPDATE
AS
BEGIN
    UPDATE Payroll
    SET UpdatedAt = GETDATE()
    FROM Payroll p
    INNER JOIN inserted i ON p.PayrollId = i.PayrollId;
END
GO

CREATE TRIGGER trg_PayrollComponents_UpdatedAt ON PayrollComponents
AFTER UPDATE
AS
BEGIN
    UPDATE PayrollComponents
    SET UpdatedAt = GETDATE()
    FROM PayrollComponents pc
    INNER JOIN inserted i ON pc.ComponentId = i.ComponentId;
END
GO

PRINT 'Payroll schema created successfully!';
GO
