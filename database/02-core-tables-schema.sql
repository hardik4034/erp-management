-- =============================================
-- HR Management System - Database Schema (No Authentication)
-- Database: HRMS
-- MSSQL Server
-- =============================================

-- Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'HRMS')
BEGIN
    CREATE DATABASE HRMS;
END
GO

USE HRMS;
GO

-- =============================================
-- Drop existing tables (in reverse order of dependencies)
-- =============================================
IF OBJECT_ID('Appreciations', 'U') IS NOT NULL DROP TABLE Appreciations;
IF OBJECT_ID('Leaves', 'U') IS NOT NULL DROP TABLE Leaves;
IF OBJECT_ID('LeaveTypes', 'U') IS NOT NULL DROP TABLE LeaveTypes;
IF OBJECT_ID('Attendance', 'U') IS NOT NULL DROP TABLE Attendance;
IF OBJECT_ID('Holidays', 'U') IS NOT NULL DROP TABLE Holidays;
IF OBJECT_ID('Employees', 'U') IS NOT NULL DROP TABLE Employees;
IF OBJECT_ID('Designations', 'U') IS NOT NULL DROP TABLE Designations;
IF OBJECT_ID('Departments', 'U') IS NOT NULL DROP TABLE Departments;
GO

-- =============================================
-- Table: Departments
-- =============================================
CREATE TABLE Departments (
    DepartmentId INT PRIMARY KEY IDENTITY(1,1),
    DepartmentName NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(500),
    Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- =============================================
-- Table: Designations
-- =============================================
CREATE TABLE Designations (
    DesignationId INT PRIMARY KEY IDENTITY(1,1),
    DesignationName NVARCHAR(100) NOT NULL,
    DepartmentId INT NOT NULL,
    Description NVARCHAR(500),
    Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Designations_Departments FOREIGN KEY (DepartmentId) REFERENCES Departments(DepartmentId),
    CONSTRAINT UQ_Designation_Department UNIQUE (DesignationName, DepartmentId)
);
GO

-- =============================================
-- Table: Employees
-- =============================================
CREATE TABLE Employees (
    EmployeeId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeCode NVARCHAR(20) NOT NULL UNIQUE,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    Phone NVARCHAR(20),
    DateOfJoining DATE NOT NULL,
    DepartmentId INT,
    DesignationId INT,
    -- New Fields
    Salutation NVARCHAR(10),
    Password NVARCHAR(255),
    Country NVARCHAR(100),
    Gender NVARCHAR(20),
    DateOfBirth DATE,
    ReportingTo INT,
    Language NVARCHAR(50),
    UserRole NVARCHAR(50),
    Address NVARCHAR(500),
    About NVARCHAR(1000),
    ProfilePicture NVARCHAR(500),
    LoginAllowed BIT DEFAULT 1,
    ReceiveEmailNotifications BIT DEFAULT 1,
    HourlyRate DECIMAL(18, 2),
    SlackMemberId NVARCHAR(50),
    Skills NVARCHAR(MAX),
    ProbationEndDate DATE,
    NoticePeriodStartDate DATE,
    NoticePeriodEndDate DATE,
    EmploymentType NVARCHAR(50),
    MaritalStatus NVARCHAR(20),
    BusinessAddress NVARCHAR(500),
    
    Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_Employees_Departments FOREIGN KEY (DepartmentId) REFERENCES Departments(DepartmentId),
    CONSTRAINT FK_Employees_Designations FOREIGN KEY (DesignationId) REFERENCES Designations(DesignationId),
    CONSTRAINT FK_Employees_ReportingTo FOREIGN KEY (ReportingTo) REFERENCES Employees(EmployeeId)
);
GO

-- =============================================
-- Table: Attendance
-- =============================================
CREATE TABLE Attendance (
    AttendanceId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    AttendanceDate DATE NOT NULL,
    Status NVARCHAR(20) NOT NULL CHECK (Status IN ('Present', 'Absent', 'Half Day')),
    CheckInTime TIME,
    CheckOutTime TIME,
    Remarks NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Attendance_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
    CONSTRAINT UQ_Employee_Date UNIQUE (EmployeeId, AttendanceDate)
);
GO

-- =============================================
-- Table: LeaveTypes
-- =============================================
CREATE TABLE LeaveTypes (
    LeaveTypeId INT PRIMARY KEY IDENTITY(1,1),
    TypeName NVARCHAR(50) NOT NULL UNIQUE,
    MaxDaysPerYear INT DEFAULT 0,
    Description NVARCHAR(255),
    Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- =============================================
-- Table: Leaves
-- =============================================
CREATE TABLE Leaves (
    LeaveId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    LeaveTypeId INT NOT NULL,
    FromDate DATE NOT NULL,
    ToDate DATE NOT NULL,
    Reason NVARCHAR(500),
    Status NVARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
    ApprovedBy NVARCHAR(100),
    ApprovedDate DATETIME,
    RejectionReason NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Leaves_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
    CONSTRAINT FK_Leaves_LeaveTypes FOREIGN KEY (LeaveTypeId) REFERENCES LeaveTypes(LeaveTypeId),
    CONSTRAINT CHK_Leave_Dates CHECK (ToDate >= FromDate)
);
GO

-- =============================================
-- Table: Holidays
-- =============================================
CREATE TABLE Holidays (
    HolidayId INT PRIMARY KEY IDENTITY(1,1),
    HolidayName NVARCHAR(100) NOT NULL,
    HolidayDate DATE NOT NULL,
    Description NVARCHAR(500),
    Year INT NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- =============================================
-- Table: Appreciations
-- =============================================
CREATE TABLE Appreciations (
    AppreciationId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    AppreciationDate DATE NOT NULL,
    AwardedBy NVARCHAR(100),
    Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Appreciations_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId)
);
GO

-- =============================================
-- Create Indexes for Performance
-- =============================================
CREATE INDEX IX_Employees_Email ON Employees(Email);
CREATE INDEX IX_Employees_EmployeeCode ON Employees(EmployeeCode);
CREATE INDEX IX_Employees_DepartmentId ON Employees(DepartmentId);
CREATE INDEX IX_Employees_DesignationId ON Employees(DesignationId);
CREATE INDEX IX_Attendance_EmployeeId ON Attendance(EmployeeId);
CREATE INDEX IX_Attendance_Date ON Attendance(AttendanceDate);
CREATE INDEX IX_Leaves_EmployeeId ON Leaves(EmployeeId);
CREATE INDEX IX_Leaves_Status ON Leaves(Status);
CREATE INDEX IX_Holidays_Year ON Holidays(Year);
CREATE INDEX IX_Appreciations_EmployeeId ON Appreciations(EmployeeId);
GO

-- =============================================
-- Insert Default Leave Types
-- =============================================
INSERT INTO LeaveTypes (TypeName, MaxDaysPerYear, Description) VALUES 
('Casual', 12, 'Casual Leave'),
('Sick', 10, 'Sick Leave'),
('Paid', 15, 'Paid Leave');
GO

-- =============================================
-- Insert Sample Departments
-- =============================================
INSERT INTO Departments (DepartmentName, Description) VALUES 
('IT', 'Information Technology'),
('HR', 'Human Resources'),
('Finance', 'Finance and Accounting'),
('Sales', 'Sales and Marketing');
GO

-- =============================================
-- Insert Sample Designations
-- =============================================
INSERT INTO Designations (DesignationName, DepartmentId, Description) VALUES 
('Software Engineer', 1, 'Software Development'),
('HR Manager', 2, 'Human Resources Management'),
('Accountant', 3, 'Financial Accounting'),
('Sales Executive', 4, 'Sales and Business Development');
GO

-- =============================================
-- Create Function to Generate Employee Code
-- =============================================
GO
CREATE FUNCTION dbo.GenerateEmployeeCode()
RETURNS NVARCHAR(20)
AS
BEGIN
    DECLARE @Year NVARCHAR(4) = CAST(YEAR(GETDATE()) AS NVARCHAR(4));
    DECLARE @Sequence INT;
    
    -- Get the last sequence number for current year
    SELECT @Sequence = ISNULL(MAX(CAST(RIGHT(EmployeeCode, 3) AS INT)), 0) + 1
    FROM Employees
    WHERE EmployeeCode LIKE 'EMP' + @Year + '%';
    
    -- Format: EMP{YEAR}{SEQUENCE} (e.g., EMP2026001)
    RETURN 'EMP' + @Year + RIGHT('000' + CAST(@Sequence AS NVARCHAR(3)), 3);
END
GO

-- =============================================
-- Create Triggers to Update UpdatedAt timestamp
-- =============================================
GO
CREATE TRIGGER trg_Employees_UpdatedAt ON Employees
AFTER UPDATE
AS
BEGIN
    UPDATE Employees
    SET UpdatedAt = GETDATE()
    FROM Employees e
    INNER JOIN inserted i ON e.EmployeeId = i.EmployeeId;
END
GO

CREATE TRIGGER trg_Departments_UpdatedAt ON Departments
AFTER UPDATE
AS
BEGIN
    UPDATE Departments
    SET UpdatedAt = GETDATE()
    FROM Departments d
    INNER JOIN inserted i ON d.DepartmentId = i.DepartmentId;
END
GO

CREATE TRIGGER trg_Designations_UpdatedAt ON Designations
AFTER UPDATE
AS
BEGIN
    UPDATE Designations
    SET UpdatedAt = GETDATE()
    FROM Designations d
    INNER JOIN inserted i ON d.DesignationId = i.DesignationId;
END
GO

CREATE TRIGGER trg_Attendance_UpdatedAt ON Attendance
AFTER UPDATE
AS
BEGIN
    UPDATE Attendance
    SET UpdatedAt = GETDATE()
    FROM Attendance a
    INNER JOIN inserted i ON a.AttendanceId = i.AttendanceId;
END
GO

CREATE TRIGGER trg_Leaves_UpdatedAt ON Leaves
AFTER UPDATE
AS
BEGIN
    UPDATE Leaves
    SET UpdatedAt = GETDATE()
    FROM Leaves l
    INNER JOIN inserted i ON l.LeaveId = i.LeaveId;
END
GO

CREATE TRIGGER trg_Holidays_UpdatedAt ON Holidays
AFTER UPDATE
AS
BEGIN
    UPDATE Holidays
    SET UpdatedAt = GETDATE()
    FROM Holidays h
    INNER JOIN inserted i ON h.HolidayId = i.HolidayId;
END
GO

CREATE TRIGGER trg_Appreciations_UpdatedAt ON Appreciations
AFTER UPDATE
AS
BEGIN
    UPDATE Appreciations
    SET UpdatedAt = GETDATE()
    FROM Appreciations a
    INNER JOIN inserted i ON a.AppreciationId = i.AppreciationId;
END
GO

PRINT 'Database schema created successfully!';
PRINT 'Pure HR Management System - No Authentication Required';
GO
