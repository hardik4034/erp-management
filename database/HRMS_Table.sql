-- ============================================================================
-- HR MANAGEMENT SYSTEM (HRMS) - MASTER INITIALIZATION SCRIPT
-- ============================================================================
-- Run this script to create the database, schemas, seed data, and procedures.
-- ============================================================================

-- =============================================
-- STEP 1: CREATE DATABASE AND LOGIN
-- =============================================
USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'HRMS')
BEGIN
    CREATE DATABASE HRMS;
    PRINT '✅ Database HRMS created successfully';
END
ELSE
BEGIN
    PRINT '✅ Database HRMS already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'hrms_user')
BEGIN
    CREATE LOGIN hrms_user WITH PASSWORD = 'Hrms@2026';
    PRINT '✅ Login hrms_user created';
END
GO

USE HRMS;
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'hrms_user')
BEGIN
    CREATE USER hrms_user FOR LOGIN hrms_user;
    ALTER ROLE db_owner ADD MEMBER hrms_user;
    PRINT '✅ User hrms_user created and granted db_owner';
END
GO

-- =============================================
-- STEP 2: CREATE TABLES (Dependency Order)
-- =============================================

-- 1. Departments
IF OBJECT_ID('Departments', 'U') IS NULL
BEGIN
    CREATE TABLE Departments (
        DepartmentId INT PRIMARY KEY IDENTITY(1,1),
        DepartmentName NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(500),
        Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME NULL,
        DeletedBy NVARCHAR(100) NULL,
        DeleteReason NVARCHAR(500) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 2. Designations
IF OBJECT_ID('Designations', 'U') IS NULL
BEGIN
    CREATE TABLE Designations (
        DesignationId INT PRIMARY KEY IDENTITY(1,1),
        DesignationName NVARCHAR(100) NOT NULL,
        DepartmentId INT NOT NULL,
        Description NVARCHAR(500),
        Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME NULL,
        DeletedBy NVARCHAR(100) NULL,
        DeleteReason NVARCHAR(500) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Designations_Departments FOREIGN KEY (DepartmentId) REFERENCES Departments(DepartmentId),
        CONSTRAINT UQ_Designation_Department UNIQUE (DesignationName, DepartmentId)
    );
END
GO

-- 3. Employees
IF OBJECT_ID('Employees', 'U') IS NULL
BEGIN
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
        Salutation NVARCHAR(10),
        Country NVARCHAR(100),
        Gender NVARCHAR(20),
        DateOfBirth DATE,
        ReportingTo INT,
        Language NVARCHAR(50),
        UserRole NVARCHAR(50),
        PermanentAddress NVARCHAR(500),
        TemporaryAddress NVARCHAR(500),
        Address NVARCHAR(500), -- Kept for backward compatibility
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
        Salary DECIMAL(18, 2) NULL,
        SalaryType NVARCHAR(20) DEFAULT 'Monthly' CHECK (SalaryType IN ('Hourly', 'Monthly', 'Annual')),
        Currency NVARCHAR(10) DEFAULT 'USD',
        biometric_id NVARCHAR(50) NULL UNIQUE,
        AttendanceApproverId INT NULL,
        LeaveApproverId INT NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME NULL,
        DeletedBy NVARCHAR(100) NULL,
        DeleteReason NVARCHAR(500) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_Employees_Departments FOREIGN KEY (DepartmentId) REFERENCES Departments(DepartmentId),
        CONSTRAINT FK_Employees_Designations FOREIGN KEY (DesignationId) REFERENCES Designations(DesignationId),
        CONSTRAINT FK_Employees_ReportingTo FOREIGN KEY (ReportingTo) REFERENCES Employees(EmployeeId),
        CONSTRAINT FK_Employees_AttendanceApprover FOREIGN KEY (AttendanceApproverId) REFERENCES Employees(EmployeeId),
        CONSTRAINT FK_Employees_LeaveApprover FOREIGN KEY (LeaveApproverId) REFERENCES Employees(EmployeeId)
    );
END
GO

-- 4. Attendance
IF OBJECT_ID('Attendance', 'U') IS NULL
BEGIN
    CREATE TABLE Attendance (
        AttendanceId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        AttendanceDate DATE NOT NULL,
        Status NVARCHAR(20) NOT NULL,
        CheckInTime TIME,
        CheckOutTime TIME,
        Remarks NVARCHAR(500),
        Notes NVARCHAR(1000),
        CheckInLocation NVARCHAR(100),
        CheckOutLocation NVARCHAR(100),
        WorkingFrom NVARCHAR(50),
        WorkingFromOut NVARCHAR(50),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Attendance_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
        CONSTRAINT UQ_Employee_Date UNIQUE (EmployeeId, AttendanceDate),
        CONSTRAINT CK_Attendance_Status CHECK (Status IN ('Present', 'Absent', 'Half Day', 'Late', 'On Leave'))
    );
END
GO

-- 5. LeaveTypes
IF OBJECT_ID('LeaveTypes', 'U') IS NULL
BEGIN
    CREATE TABLE LeaveTypes (
        LeaveTypeId INT PRIMARY KEY IDENTITY(1,1),
        TypeName NVARCHAR(50) NOT NULL UNIQUE,
        MaxDaysPerYear INT DEFAULT 0,
        MonthlyLimit INT DEFAULT 0,
        Description NVARCHAR(255),
        Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 6. Leaves
IF OBJECT_ID('Leaves', 'U') IS NULL
BEGIN
    CREATE TABLE Leaves (
        LeaveId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        LeaveTypeId INT NOT NULL,
        FromDate DATE NOT NULL,
        ToDate DATE NOT NULL,
        Reason NVARCHAR(500),
        Status NVARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Rejected', 'Deleted')),
        ApprovedBy NVARCHAR(100),
        ApprovedDate DATETIME,
        RejectionReason NVARCHAR(500),
        AppliedDate DATETIME DEFAULT GETDATE(),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME NULL,
        DeletedBy NVARCHAR(100) NULL,
        DeleteReason NVARCHAR(500) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Leaves_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
        CONSTRAINT FK_Leaves_LeaveTypes FOREIGN KEY (LeaveTypeId) REFERENCES LeaveTypes(LeaveTypeId),
        CONSTRAINT CHK_Leave_Dates CHECK (ToDate >= FromDate)
    );
END
GO

-- 7. Holidays
IF OBJECT_ID('Holidays', 'U') IS NULL
BEGIN
    CREATE TABLE Holidays (
        HolidayId INT PRIMARY KEY IDENTITY(1,1),
        HolidayName NVARCHAR(100) NOT NULL,
        HolidayDate DATE NOT NULL,
        Description NVARCHAR(500),
        Year INT NOT NULL,
        Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME NULL,
        DeletedBy NVARCHAR(100) NULL,
        DeleteReason NVARCHAR(500) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 8. Appreciations
IF OBJECT_ID('Appreciations', 'U') IS NULL
BEGIN
    CREATE TABLE Appreciations (
        AppreciationId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        Description NVARCHAR(1000),
        AppreciationDate DATE NOT NULL,
        AwardedBy NVARCHAR(100),
        Photo NVARCHAR(500),
        Status NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME NULL,
        DeletedBy NVARCHAR(100) NULL,
        DeleteReason NVARCHAR(500) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Appreciations_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId)
    );
END
GO

-- 9. SalaryGroups
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
END
GO

-- 10. EmployeeSalary
IF OBJECT_ID('EmployeeSalary', 'U') IS NULL
BEGIN
    CREATE TABLE EmployeeSalary (
        EmployeeSalaryId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        SalaryGroupId INT,
        BaseSalary DECIMAL(18, 2) NOT NULL,
        SalaryCycle NVARCHAR(20) DEFAULT 'Monthly' CHECK (SalaryCycle IN ('Monthly', 'Weekly', 'Bi-Weekly', 'Annual')),
        Currency NVARCHAR(10) DEFAULT 'USD',
        AllowPayrollGenerate BIT DEFAULT 0,
        NetSalaryMonthly DECIMAL(18, 2),
        EffectiveFrom DATE NOT NULL,
        EffectiveTo DATE,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_EmployeeSalary_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
        CONSTRAINT FK_EmployeeSalary_SalaryGroups FOREIGN KEY (SalaryGroupId) REFERENCES SalaryGroups(SalaryGroupId)
    );
END
GO

-- 11. TaxConfiguration
IF OBJECT_ID('TaxConfiguration', 'U') IS NULL
BEGIN
    CREATE TABLE TaxConfiguration (
        ConfigKey VARCHAR(50) PRIMARY KEY,
        ConfigValue DECIMAL(10,2) NOT NULL,
        EffectiveDate DATE DEFAULT GETDATE(),
        IsActive BIT DEFAULT 1,
        Description NVARCHAR(255),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 12. PayrollComponents
IF OBJECT_ID('PayrollComponents', 'U') IS NULL
BEGIN
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
END
GO

-- 13. Payroll
IF OBJECT_ID('Payroll', 'U') IS NULL
BEGIN
    CREATE TABLE Payroll (
        PayrollId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        PayPeriodStart DATE NOT NULL,
        PayPeriodEnd DATE NOT NULL,
        PayDate DATE NOT NULL,
        BaseSalary DECIMAL(18, 2) NOT NULL,
        TotalEarnings DECIMAL(18, 2) DEFAULT 0,
        TotalDeductions DECIMAL(18, 2) DEFAULT 0,
        NetSalary DECIMAL(18, 2) NOT NULL,
        CTC AS (BaseSalary + TotalEarnings) PERSISTED,
        WorkingDays INT DEFAULT 0,
        PresentDays INT DEFAULT 0,
        AbsentDays INT DEFAULT 0,
        LeaveDays INT DEFAULT 0,
        Status NVARCHAR(20) DEFAULT 'Draft' CHECK (Status IN ('Draft', 'Approved', 'Paid', 'Cancelled')),
        ApprovedBy NVARCHAR(100),
        ApprovedDate DATETIME,
        PaymentMethod NVARCHAR(50),
        PaymentReference NVARCHAR(100),
        Notes NVARCHAR(MAX),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Payroll_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
        CONSTRAINT UQ_Payroll_Employee_Period UNIQUE (EmployeeId, PayPeriodStart, PayPeriodEnd)
    );
END
GO

-- 14. PayrollDetails
IF OBJECT_ID('PayrollDetails', 'U') IS NULL
BEGIN
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
END
GO

-- 15. Assets
IF OBJECT_ID('Assets', 'U') IS NULL
BEGIN
    CREATE TABLE Assets (
        AssetID INT IDENTITY(1,1) PRIMARY KEY,
        AssetCode VARCHAR(50) UNIQUE NOT NULL,
        AssetName VARCHAR(100) NOT NULL,
        Category VARCHAR(50) NOT NULL,
        Brand VARCHAR(100),
        Model VARCHAR(100),
        SerialNumber VARCHAR(100),
        PurchaseDate DATE,
        AssetCondition VARCHAR(50) DEFAULT 'New',
        AssetPhoto VARCHAR(255),
        Status VARCHAR(50) DEFAULT 'Available',
        Processor VARCHAR(100),
        RAM VARCHAR(50),
        Storage VARCHAR(100),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 16. AssetAssign
IF OBJECT_ID('AssetAssign', 'U') IS NULL
BEGIN
    CREATE TABLE AssetAssign (
        AssignID INT IDENTITY(1,1) PRIMARY KEY,
        AssetID INT FOREIGN KEY REFERENCES Assets(AssetID),
        EmployeeID INT FOREIGN KEY REFERENCES Employees(EmployeeID),
        AssignDate DATE NOT NULL,
        ReturnDate DATE,
        AssetCondition VARCHAR(50),
        Remarks NVARCHAR(MAX),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 17. EmployeeDocuments
IF OBJECT_ID('EmployeeDocuments', 'U') IS NULL
BEGIN
    CREATE TABLE EmployeeDocuments (
        DocumentId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        DocumentType NVARCHAR(50) NOT NULL,
        OriginalName NVARCHAR(255) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        MimeType NVARCHAR(50) NOT NULL,
        FileSize INT NOT NULL,
        FileUrl NVARCHAR(500) NOT NULL,
        FileData VARBINARY(MAX) NOT NULL,
        UploadDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_EmployeeDocuments_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
        CONSTRAINT UQ_Employee_DocumentType UNIQUE (EmployeeId, DocumentType)
    );
END
GO

-- 18. NoteTypes
IF OBJECT_ID('NoteTypes', 'U') IS NULL
BEGIN
    CREATE TABLE NoteTypes (
        NoteTypeId INT PRIMARY KEY IDENTITY(1,1),
        NoteTypeName VARCHAR(100) NOT NULL,
        IsVisibleToEmployee BIT DEFAULT 1,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 19. EmployeeNotes
IF OBJECT_ID('EmployeeNotes', 'U') IS NULL
BEGIN
    CREATE TABLE EmployeeNotes (
        NoteId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        NoteTypeId INT NOT NULL,
        Title VARCHAR(200) NOT NULL,
        Description VARCHAR(MAX) NOT NULL,
        CreatedBy INT NOT NULL,
        CreatedByRole VARCHAR(50) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedBy INT NULL,
        UpdatedByRole VARCHAR(50) NULL,
        UpdatedAt DATETIME NULL,
        IsActive BIT DEFAULT 1,
        CONSTRAINT FK_EmployeeNotes_NoteTypes FOREIGN KEY (NoteTypeId) REFERENCES NoteTypes(NoteTypeId)
    );
END
GO

-- 20. EmployeeNotesHistory
IF OBJECT_ID('EmployeeNotesHistory', 'U') IS NULL
BEGIN
    CREATE TABLE EmployeeNotesHistory (
        HistoryId INT PRIMARY KEY IDENTITY(1,1),
        NoteId INT,
        Title VARCHAR(200),
        Description VARCHAR(MAX),
        ModifiedBy INT,
        ModifiedByRole VARCHAR(50),
        ModifiedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 21. Notes (Alternative Notes table from script)
IF OBJECT_ID('Notes', 'U') IS NULL
BEGIN
    CREATE TABLE Notes (
        NoteId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        Title NVARCHAR(100),
        NoteType NVARCHAR(50) NULL,
        WarningType NVARCHAR(50) NULL,
        Description NVARCHAR(MAX) NULL,
        Visibility NVARCHAR(50) NULL,
        NoteDate DATE DEFAULT CAST(GETDATE() AS DATE),
        AddedBy INT NULL,
        Attachment NVARCHAR(500) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Notes_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
        CONSTRAINT FK_Notes_AddedBy FOREIGN KEY (AddedBy) REFERENCES Employees(EmployeeId)
    );
END
GO

-- 22. biometric_devices
IF OBJECT_ID('biometric_devices', 'U') IS NULL
BEGIN
    CREATE TABLE biometric_devices (
        id INT IDENTITY(1,1) PRIMARY KEY,
        device_id NVARCHAR(100) NOT NULL UNIQUE,
        device_name NVARCHAR(200) NULL,
        status NVARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
        last_sync DATETIME NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- 23. biometric_logs
IF OBJECT_ID('biometric_logs', 'U') IS NULL
BEGIN
    CREATE TABLE biometric_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        device_id NVARCHAR(100) NOT NULL,
        biometric_user_id NVARCHAR(50) NOT NULL,
        punch_time DATETIME NOT NULL,
        punch_type NVARCHAR(20) NULL,
        raw_json NVARCHAR(MAX) NULL,
        processed BIT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_biometric_logs_device FOREIGN KEY (device_id) REFERENCES biometric_devices(device_id) ON DELETE CASCADE
    );
END
GO

-- 24. CalendarEvents
IF OBJECT_ID('CalendarEvents', 'U') IS NULL
BEGIN
    CREATE TABLE CalendarEvents (
        EventId INT PRIMARY KEY IDENTITY(1,1),
        Title NVARCHAR(200) NOT NULL,
        Description NVARCHAR(1000),
        EventDate DATE NOT NULL,
        EventTime TIME,
        EventType NVARCHAR(50) NOT NULL,
        Color NVARCHAR(20),
        CreatedBy INT,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_CalendarEvents_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Employees(EmployeeId)
    );
END
GO

-- 25. Timesheets
IF OBJECT_ID('Timesheets', 'U') IS NULL
BEGIN
    CREATE TABLE Timesheets (
        TimesheetId INT PRIMARY KEY IDENTITY(1,1),
        EmployeeId INT NOT NULL,
        Date DATE NOT NULL,
        Project NVARCHAR(200),
        Task NVARCHAR(200),
        Description NVARCHAR(1000),
        StartTime TIME,
        EndTime TIME,
        TotalHours DECIMAL(5,2),
        Status NVARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
        ApprovedBy INT,
        Remarks NVARCHAR(500),
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Timesheets_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
        CONSTRAINT FK_Timesheets_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES Employees(EmployeeId)
    );
END
GO


-- =============================================
-- STEP 3: CREATE INDEXES
-- =============================================
CREATE INDEX IX_Employees_Email ON Employees(Email);
CREATE INDEX IX_Employees_EmployeeCode ON Employees(EmployeeCode);
CREATE INDEX IX_Employees_DepartmentId ON Employees(DepartmentId);
CREATE INDEX IX_Employees_DesignationId ON Employees(DesignationId);
CREATE INDEX IX_Attendance_EmployeeId ON Attendance(EmployeeId);
CREATE INDEX IX_Attendance_Date ON Attendance(AttendanceDate);
CREATE INDEX IX_Attendance_Date_Employee ON Attendance(AttendanceDate, EmployeeId);
CREATE INDEX IX_Leaves_EmployeeId ON Leaves(EmployeeId);
CREATE INDEX IX_Leaves_Status ON Leaves(Status);
CREATE INDEX IX_Holidays_Year ON Holidays(Year);
CREATE INDEX IX_Appreciations_EmployeeId ON Appreciations(EmployeeId);
CREATE INDEX IX_EmployeeSalary_EmployeeId ON EmployeeSalary(EmployeeId);
CREATE INDEX IX_EmployeeSalary_EffectiveFrom ON EmployeeSalary(EffectiveFrom);
CREATE INDEX IX_EmployeeSalary_IsActive ON EmployeeSalary(IsActive);
CREATE INDEX IX_Payroll_EmployeeId ON Payroll(EmployeeId);
CREATE INDEX IX_Payroll_PayPeriod ON Payroll(PayPeriodStart, PayPeriodEnd);
CREATE INDEX IX_Payroll_Status ON Payroll(Status);
CREATE INDEX IX_PayrollDetails_PayrollId ON PayrollDetails(PayrollId);
CREATE INDEX IX_CalendarEvents_EventDate ON CalendarEvents(EventDate);
CREATE INDEX IX_CalendarEvents_EventType ON CalendarEvents(EventType);
CREATE INDEX IX_Timesheets_EmployeeId ON Timesheets(EmployeeId);
CREATE INDEX IX_Timesheets_Date ON Timesheets(Date);
CREATE INDEX IX_Timesheets_Status ON Timesheets(Status);
CREATE INDEX IX_biometric_logs_device_user ON biometric_logs(device_id, biometric_user_id);
CREATE INDEX IX_biometric_logs_punch_time ON biometric_logs(punch_time);
CREATE INDEX IX_biometric_logs_processed ON biometric_logs(processed);
GO


-- =============================================
-- STEP 4: CREATE TRIGGERS
-- =============================================
CREATE OR ALTER TRIGGER trg_Employees_UpdatedAt ON Employees AFTER UPDATE AS
BEGIN UPDATE Employees SET UpdatedAt = GETDATE() FROM Employees e INNER JOIN inserted i ON e.EmployeeId = i.EmployeeId; END
GO
CREATE OR ALTER TRIGGER trg_Departments_UpdatedAt ON Departments AFTER UPDATE AS
BEGIN UPDATE Departments SET UpdatedAt = GETDATE() FROM Departments d INNER JOIN inserted i ON d.DepartmentId = i.DepartmentId; END
GO
CREATE OR ALTER TRIGGER trg_Designations_UpdatedAt ON Designations AFTER UPDATE AS
BEGIN UPDATE Designations SET UpdatedAt = GETDATE() FROM Designations d INNER JOIN inserted i ON d.DesignationId = i.DesignationId; END
GO
CREATE OR ALTER TRIGGER trg_Attendance_UpdatedAt ON Attendance AFTER UPDATE AS
BEGIN UPDATE Attendance SET UpdatedAt = GETDATE() FROM Attendance a INNER JOIN inserted i ON a.AttendanceId = i.AttendanceId; END
GO
CREATE OR ALTER TRIGGER trg_Leaves_UpdatedAt ON Leaves AFTER UPDATE AS
BEGIN UPDATE Leaves SET UpdatedAt = GETDATE() FROM Leaves l INNER JOIN inserted i ON l.LeaveId = i.LeaveId; END
GO
CREATE OR ALTER TRIGGER trg_Holidays_UpdatedAt ON Holidays AFTER UPDATE AS
BEGIN UPDATE Holidays SET UpdatedAt = GETDATE() FROM Holidays h INNER JOIN inserted i ON h.HolidayId = i.HolidayId; END
GO
CREATE OR ALTER TRIGGER trg_Appreciations_UpdatedAt ON Appreciations AFTER UPDATE AS
BEGIN UPDATE Appreciations SET UpdatedAt = GETDATE() FROM Appreciations a INNER JOIN inserted i ON a.AppreciationId = i.AppreciationId; END
GO
CREATE OR ALTER TRIGGER trg_EmployeeSalary_UpdatedAt ON EmployeeSalary AFTER UPDATE AS
BEGIN UPDATE EmployeeSalary SET UpdatedAt = GETDATE() FROM EmployeeSalary es INNER JOIN inserted i ON es.EmployeeSalaryId = i.EmployeeSalaryId; END
GO
CREATE OR ALTER TRIGGER trg_SalaryGroups_UpdatedAt ON SalaryGroups AFTER UPDATE AS
BEGIN UPDATE SalaryGroups SET UpdatedAt = GETDATE() FROM SalaryGroups sg INNER JOIN inserted i ON sg.SalaryGroupId = i.SalaryGroupId; END
GO
CREATE OR ALTER TRIGGER trg_SyncEmployeeSalary ON EmployeeSalary AFTER INSERT, UPDATE AS
BEGIN UPDATE Employees SET Salary = i.BaseSalary, SalaryType = i.SalaryCycle, Currency = i.Currency FROM Employees e INNER JOIN inserted i ON e.EmployeeId = i.EmployeeId WHERE i.IsActive = 1; END
GO
CREATE OR ALTER TRIGGER trg_Payroll_UpdatedAt ON Payroll AFTER UPDATE AS
BEGIN UPDATE Payroll SET UpdatedAt = GETDATE() FROM Payroll p INNER JOIN inserted i ON p.PayrollId = i.PayrollId; END
GO
CREATE OR ALTER TRIGGER trg_PayrollComponents_UpdatedAt ON PayrollComponents AFTER UPDATE AS
BEGIN UPDATE PayrollComponents SET UpdatedAt = GETDATE() FROM PayrollComponents pc INNER JOIN inserted i ON pc.ComponentId = i.ComponentId; END
GO
CREATE OR ALTER TRIGGER trg_Timesheets_UpdatedAt ON Timesheets AFTER UPDATE AS
BEGIN UPDATE Timesheets SET UpdatedAt = GETDATE() FROM Timesheets t INNER JOIN inserted i ON t.TimesheetId = i.TimesheetId; END
GO


-- =============================================
-- STEP 5: SEED DATA
-- =============================================
INSERT INTO LeaveTypes (TypeName, MaxDaysPerYear, Description) VALUES 
('Casual', 12, 'Casual Leave'), ('Sick', 10, 'Sick Leave'), ('Paid', 15, 'Paid Leave');
GO
INSERT INTO Departments (DepartmentName, Description) VALUES 
('IT', 'Information Technology'), ('HR', 'Human Resources'), ('Finance', 'Finance and Accounting'), ('Sales', 'Sales and Marketing');
GO
INSERT INTO Designations (DesignationName, DepartmentId, Description) VALUES 
('Software Engineer', 1, 'Software Development'), ('HR Manager', 2, 'Human Resources Management'), ('Accountant', 3, 'Financial Accounting'), ('Sales Executive', 4, 'Sales and Business Development');
GO
INSERT INTO SalaryGroups (GroupName, Description) VALUES 
('Standard', 'Standard salary group'), ('Executive', 'Executive level salary group'), ('Contract', 'Contract workers salary group'), ('Intern', 'Internship salary group');
GO
INSERT INTO TaxConfiguration (ConfigKey, ConfigValue, Description) VALUES
('INCOME_TAX_RATE', 10.00, 'Default Income Tax percentage (TDS)'), ('PROFESSIONAL_TAX_AMOUNT', 200.00, 'Fixed Professional Tax amount'), ('PROVIDENT_FUND_RATE', 12.00, 'Default PF percentage');
GO
INSERT INTO PayrollComponents (ComponentName, ComponentType, CalculationType, DefaultValue, Description) VALUES 
('Basic Salary', 'Earning', 'Fixed', 0, 'Base salary amount'), ('HRA (House Rent Allowance)', 'Earning', 'Percentage', 40, '40% of Basic Salary'), ('Transport Allowance', 'Earning', 'Fixed', 1600, 'Fixed transport allowance'), ('Medical Allowance', 'Earning', 'Fixed', 1250, 'Fixed medical allowance'), ('Special Allowance', 'Earning', 'Percentage', 10, '10% of Basic Salary'), ('Performance Bonus', 'Earning', 'Fixed', 0, 'Performance-based bonus'), ('Overtime Pay', 'Earning', 'Fixed', 0, 'Overtime compensation'),
('Provident Fund (PF)', 'Deduction', 'Percentage', 12, '12% of Basic Salary'), ('Professional Tax', 'Deduction', 'Fixed', 200, 'Professional tax deduction'), ('Income Tax (TDS)', 'Deduction', 'Percentage', 10, 'Tax deducted at source'), ('Insurance Premium', 'Deduction', 'Fixed', 500, 'Health insurance premium'), ('Loan Repayment', 'Deduction', 'Fixed', 0, 'Employee loan repayment'), ('Other Deductions', 'Deduction', 'Fixed', 0, 'Miscellaneous deductions');
GO
INSERT INTO NoteTypes (NoteTypeName, IsVisibleToEmployee) VALUES
('Appreciation', 1), ('Warning', 1), ('Manager Feedback', 1), ('HR Internal Note', 0), ('Admin Remark', 0);
GO


-- =============================================
-- STEP 6: FUNCTIONS & VIEWS
-- =============================================
CREATE OR ALTER FUNCTION dbo.GenerateEmployeeCode()
RETURNS NVARCHAR(20)
AS
BEGIN
    DECLARE @Year NVARCHAR(4) = CAST(YEAR(GETDATE()) AS NVARCHAR(4));
    DECLARE @Sequence INT;
    SELECT @Sequence = ISNULL(MAX(CAST(RIGHT(EmployeeCode, 3) AS INT)), 0) + 1
    FROM Employees WHERE EmployeeCode LIKE 'EMP' + @Year + '%';
    RETURN 'EMP' + @Year + RIGHT('000' + CAST(@Sequence AS NVARCHAR(3)), 3);
END
GO

CREATE OR ALTER VIEW [dbo].[vw_employee_biometric_attendance]
AS
SELECT e.EmployeeId AS employee_id, e.FirstName + ' ' + e.LastName AS employee_name, e.biometric_id, bl.device_id, bl.punch_time, bl.punch_type, bl.processed, bl.created_at
FROM [dbo].[Employees] e
INNER JOIN [dbo].[biometric_logs] bl ON e.biometric_id = bl.biometric_user_id
WHERE e.biometric_id IS NOT NULL;
GO


-- =============================================
-- STEP 7: MASTER STORED PROCEDURES
-- =============================================

-- [Employees]
CREATE OR ALTER PROCEDURE sp_GetAllEmployees
    @ShowDeleted BIT = 0, @PageNumber INT = 1, @PageSize INT = 50, @SearchTerm NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    SELECT COUNT(*) AS TotalCount FROM Employees e
    WHERE (@ShowDeleted = 1 OR e.IsDeleted = 0) AND (@SearchTerm IS NULL OR (e.FirstName + ' ' + e.LastName LIKE '%' + @SearchTerm + '%') OR e.EmployeeCode LIKE '%' + @SearchTerm + '%' OR e.Email LIKE '%' + @SearchTerm + '%');
    
    SELECT e.*, d.DepartmentName, des.DesignationName,
        m.FirstName + ' ' + m.LastName AS ReportingToName, aa.FirstName + ' ' + aa.LastName AS AttendanceApproverName, la.FirstName + ' ' + la.LastName AS LeaveApproverName
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN Employees m ON e.ReportingTo = m.EmployeeId
    LEFT JOIN Employees aa ON e.AttendanceApproverId = aa.EmployeeId
    LEFT JOIN Employees la ON e.LeaveApproverId = la.EmployeeId
    WHERE (@ShowDeleted = 1 OR e.IsDeleted = 0) AND (@SearchTerm IS NULL OR (e.FirstName + ' ' + e.LastName LIKE '%' + @SearchTerm + '%') OR e.EmployeeCode LIKE '%' + @SearchTerm + '%' OR e.Email LIKE '%' + @SearchTerm + '%')
    ORDER BY e.CreatedAt DESC OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE sp_GetEmployeeById @EmployeeId INT
AS
BEGIN
    SELECT e.*, d.DepartmentName, des.DesignationName, m.FirstName + ' ' + m.LastName AS ReportingToName,
        aa.FirstName + ' ' + aa.LastName AS AttendanceApproverName, aa.EmployeeCode AS AttendanceApproverCode,
        la.FirstName + ' ' + la.LastName AS LeaveApproverName, la.EmployeeCode AS LeaveApproverCode
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN Employees m ON e.ReportingTo = m.EmployeeId
    LEFT JOIN Employees aa ON e.AttendanceApproverId = aa.EmployeeId
    LEFT JOIN Employees la ON e.LeaveApproverId = la.EmployeeId
    WHERE e.EmployeeId = @EmployeeId;
END
GO

CREATE OR ALTER PROCEDURE sp_CreateEmployee
    @EmployeeCode NVARCHAR(20), @FirstName NVARCHAR(100), @LastName NVARCHAR(100), @Email NVARCHAR(255), @Phone NVARCHAR(20), @DateOfJoining DATE, @DepartmentId INT = NULL, @DesignationId INT = NULL, @Salutation NVARCHAR(10) = NULL, @Country NVARCHAR(100) = NULL, @Gender NVARCHAR(20) = NULL, @DateOfBirth DATE = NULL, @ReportingTo INT = NULL, @Language NVARCHAR(50) = NULL, @UserRole NVARCHAR(50) = NULL, @PermanentAddress NVARCHAR(500) = NULL, @TemporaryAddress NVARCHAR(500) = NULL, @About NVARCHAR(1000) = NULL, @ProfilePicture NVARCHAR(500) = NULL, @LoginAllowed BIT = 1, @ReceiveEmailNotifications BIT = 1, @Skills NVARCHAR(MAX) = NULL, @ProbationEndDate DATE = NULL, @NoticePeriodStartDate DATE = NULL, @NoticePeriodEndDate DATE = NULL, @EmploymentType NVARCHAR(50) = NULL, @MaritalStatus NVARCHAR(20) = NULL, @BusinessAddress NVARCHAR(500) = NULL, @AttendanceApproverId INT = NULL, @LeaveApproverId INT = NULL
AS
BEGIN
    IF @EmployeeCode IS NULL OR LTRIM(RTRIM(@EmployeeCode)) = '' THROW 50001, 'Employee Code is required.', 1;
    IF EXISTS (SELECT 1 FROM Employees WHERE EmployeeCode = @EmployeeCode) THROW 50002, 'Employee Code already exists.', 1;
    
    INSERT INTO Employees (EmployeeCode, FirstName, LastName, Email, Phone, DateOfJoining, DepartmentId, DesignationId, Salutation, Country, Gender, DateOfBirth, ReportingTo, Language, UserRole, PermanentAddress, TemporaryAddress, About, ProfilePicture, LoginAllowed, ReceiveEmailNotifications, Skills, ProbationEndDate, NoticePeriodStartDate, NoticePeriodEndDate, EmploymentType, MaritalStatus, BusinessAddress, Address, AttendanceApproverId, LeaveApproverId)
    VALUES (@EmployeeCode, @FirstName, @LastName, @Email, @Phone, @DateOfJoining, @DepartmentId, @DesignationId, @Salutation, @Country, @Gender, @DateOfBirth, @ReportingTo, @Language, @UserRole, @PermanentAddress, @TemporaryAddress, @About, @ProfilePicture, @LoginAllowed, @ReceiveEmailNotifications, @Skills, @ProbationEndDate, @NoticePeriodStartDate, @NoticePeriodEndDate, @EmploymentType, @MaritalStatus, @BusinessAddress, @PermanentAddress, @AttendanceApproverId, @LeaveApproverId);
    SELECT SCOPE_IDENTITY() AS EmployeeId;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateEmployee
    @EmployeeId INT, @FirstName NVARCHAR(100), @LastName NVARCHAR(100), @Email NVARCHAR(255), @Phone NVARCHAR(20), @DateOfJoining DATE, @DepartmentId INT = NULL, @DesignationId INT = NULL, @Salutation NVARCHAR(10) = NULL, @Country NVARCHAR(100) = NULL, @Gender NVARCHAR(20) = NULL, @DateOfBirth DATE = NULL, @ReportingTo INT = NULL, @Language NVARCHAR(50) = NULL, @UserRole NVARCHAR(50) = NULL, @PermanentAddress NVARCHAR(500) = NULL, @TemporaryAddress NVARCHAR(500) = NULL, @About NVARCHAR(1000) = NULL, @ProfilePicture NVARCHAR(500) = NULL, @LoginAllowed BIT = 1, @ReceiveEmailNotifications BIT = 1, @Skills NVARCHAR(MAX) = NULL, @ProbationEndDate DATE = NULL, @NoticePeriodStartDate DATE = NULL, @NoticePeriodEndDate DATE = NULL, @EmploymentType NVARCHAR(50) = NULL, @MaritalStatus NVARCHAR(20) = NULL, @BusinessAddress NVARCHAR(500) = NULL, @AttendanceApproverId INT = NULL, @LeaveApproverId INT = NULL
AS
BEGIN
    UPDATE Employees
    SET FirstName = @FirstName, LastName = @LastName, Email = @Email, Phone = @Phone, DateOfJoining = @DateOfJoining, DepartmentId = @DepartmentId, DesignationId = @DesignationId, Salutation = @Salutation, Country = @Country, Gender = @Gender, DateOfBirth = @DateOfBirth, ReportingTo = @ReportingTo, Language = @Language, UserRole = @UserRole, PermanentAddress = @PermanentAddress, TemporaryAddress = @TemporaryAddress, About = @About, ProfilePicture = @ProfilePicture, LoginAllowed = @LoginAllowed, ReceiveEmailNotifications = @ReceiveEmailNotifications, Skills = @Skills, ProbationEndDate = @ProbationEndDate, NoticePeriodStartDate = @NoticePeriodStartDate, NoticePeriodEndDate = @NoticePeriodEndDate, EmploymentType = @EmploymentType, MaritalStatus = @MaritalStatus, BusinessAddress = @BusinessAddress, Address = @PermanentAddress, AttendanceApproverId = @AttendanceApproverId, LeaveApproverId = @LeaveApproverId
    WHERE EmployeeId = @EmployeeId;
END
GO

CREATE OR ALTER PROCEDURE sp_SoftDeleteEmployee @EmployeeId INT, @DeletedBy NVARCHAR(100), @DeleteReason NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE Employees SET IsDeleted = 1, DeletedAt = GETDATE(), DeletedBy = @DeletedBy, DeleteReason = @DeleteReason, UpdatedAt = GETDATE() WHERE EmployeeId = @EmployeeId AND IsDeleted = 0;
END
GO

-- [Payroll]
CREATE OR ALTER PROCEDURE sp_GeneratePayroll
    @EmployeeId INT, @PayPeriodStart DATE, @PayPeriodEnd DATE, @PayDate DATE, @IncludeExpenseClaims BIT = 0, @AddSewerageToSalary BIT = 0, @UseAttendance BIT = 1
AS
BEGIN
    DECLARE @BaseSalary DECIMAL(18, 2), @WorkingDays INT, @PresentDays INT, @AbsentDays INT, @LeaveDays INT, @TotalEarnings DECIMAL(18, 2) = 0, @TotalDeductions DECIMAL(18, 2) = 0, @NetSalary DECIMAL(18, 2), @PayrollId INT;
    SELECT @BaseSalary = ISNULL(Salary, 0) FROM Employees WHERE EmployeeId = @EmployeeId;
    IF @BaseSalary = 0 THROW 50003, 'Employee salary not configured.', 1;
    
    -- Fast path for full month
    SET @WorkingDays = DATEDIFF(DAY, @PayPeriodStart, @PayPeriodEnd) + 1;
    SET @PresentDays = @WorkingDays; SET @AbsentDays = 0; SET @LeaveDays = 0;
    
    INSERT INTO Payroll (EmployeeId, PayPeriodStart, PayPeriodEnd, PayDate, BaseSalary, TotalEarnings, TotalDeductions, NetSalary, WorkingDays, PresentDays, AbsentDays, LeaveDays)
    VALUES (@EmployeeId, @PayPeriodStart, @PayPeriodEnd, @PayDate, @BaseSalary, 0, 0, @BaseSalary, @WorkingDays, @PresentDays, @AbsentDays, @LeaveDays);
    SET @PayrollId = SCOPE_IDENTITY();
    
    INSERT INTO PayrollDetails (PayrollId, ComponentId, ComponentName, ComponentType, Amount)
    SELECT @PayrollId, ComponentId, ComponentName, ComponentType, CASE WHEN CalculationType = 'Fixed' THEN DefaultValue WHEN CalculationType = 'Percentage' THEN (@BaseSalary * DefaultValue / 100) END
    FROM PayrollComponents WHERE IsActive = 1;
    
    SELECT @TotalEarnings = ISNULL(SUM(Amount), 0) FROM PayrollDetails WHERE PayrollId = @PayrollId AND ComponentType = 'Earning';
    SELECT @TotalDeductions = ISNULL(SUM(Amount), 0) FROM PayrollDetails WHERE PayrollId = @PayrollId AND ComponentType = 'Deduction';
    SET @NetSalary = @BaseSalary + @TotalEarnings - @TotalDeductions;
    
    UPDATE Payroll SET TotalEarnings = @TotalEarnings, TotalDeductions = @TotalDeductions, NetSalary = @NetSalary WHERE PayrollId = @PayrollId;
    SELECT @PayrollId AS PayrollId;
END
GO

PRINT '✅ ALL SCHEMAS AND PROCEDURES CREATED SUCCESSFULLY.';
GO