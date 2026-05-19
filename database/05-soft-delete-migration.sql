-- =============================================
-- Soft Delete Migration
-- HRMS Database
-- Run this ONCE against the live HRMS database
-- =============================================
USE HRMS;
GO

PRINT 'Adding soft-delete columns to all main tables...';

-- =============================================
-- Employees
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'IsDeleted' AND Object_ID = OBJECT_ID(N'Employees'))
BEGIN
    ALTER TABLE Employees ADD IsDeleted BIT NOT NULL DEFAULT 0;
    PRINT '  Added IsDeleted to Employees';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedAt' AND Object_ID = OBJECT_ID(N'Employees'))
BEGIN
    ALTER TABLE Employees ADD DeletedAt DATETIME NULL;
    PRINT '  Added DeletedAt to Employees';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedBy' AND Object_ID = OBJECT_ID(N'Employees'))
BEGIN
    ALTER TABLE Employees ADD DeletedBy NVARCHAR(100) NULL;
    PRINT '  Added DeletedBy to Employees';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeleteReason' AND Object_ID = OBJECT_ID(N'Employees'))
BEGIN
    ALTER TABLE Employees ADD DeleteReason NVARCHAR(500) NULL;
    PRINT '  Added DeleteReason to Employees';
END
GO

-- =============================================
-- Departments
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'IsDeleted' AND Object_ID = OBJECT_ID(N'Departments'))
BEGIN
    ALTER TABLE Departments ADD IsDeleted BIT NOT NULL DEFAULT 0;
    PRINT '  Added IsDeleted to Departments';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedAt' AND Object_ID = OBJECT_ID(N'Departments'))
BEGIN
    ALTER TABLE Departments ADD DeletedAt DATETIME NULL;
    PRINT '  Added DeletedAt to Departments';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedBy' AND Object_ID = OBJECT_ID(N'Departments'))
BEGIN
    ALTER TABLE Departments ADD DeletedBy NVARCHAR(100) NULL;
    PRINT '  Added DeletedBy to Departments';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeleteReason' AND Object_ID = OBJECT_ID(N'Departments'))
BEGIN
    ALTER TABLE Departments ADD DeleteReason NVARCHAR(500) NULL;
    PRINT '  Added DeleteReason to Departments';
END
GO

-- =============================================
-- Designations
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'IsDeleted' AND Object_ID = OBJECT_ID(N'Designations'))
BEGIN
    ALTER TABLE Designations ADD IsDeleted BIT NOT NULL DEFAULT 0;
    PRINT '  Added IsDeleted to Designations';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedAt' AND Object_ID = OBJECT_ID(N'Designations'))
BEGIN
    ALTER TABLE Designations ADD DeletedAt DATETIME NULL;
    PRINT '  Added DeletedAt to Designations';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedBy' AND Object_ID = OBJECT_ID(N'Designations'))
BEGIN
    ALTER TABLE Designations ADD DeletedBy NVARCHAR(100) NULL;
    PRINT '  Added DeletedBy to Designations';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeleteReason' AND Object_ID = OBJECT_ID(N'Designations'))
BEGIN
    ALTER TABLE Designations ADD DeleteReason NVARCHAR(500) NULL;
    PRINT '  Added DeleteReason to Designations';
END
GO

-- =============================================
-- Holidays
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'IsDeleted' AND Object_ID = OBJECT_ID(N'Holidays'))
BEGIN
    ALTER TABLE Holidays ADD IsDeleted BIT NOT NULL DEFAULT 0;
    PRINT '  Added IsDeleted to Holidays';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedAt' AND Object_ID = OBJECT_ID(N'Holidays'))
BEGIN
    ALTER TABLE Holidays ADD DeletedAt DATETIME NULL;
    PRINT '  Added DeletedAt to Holidays';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedBy' AND Object_ID = OBJECT_ID(N'Holidays'))
BEGIN
    ALTER TABLE Holidays ADD DeletedBy NVARCHAR(100) NULL;
    PRINT '  Added DeletedBy to Holidays';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeleteReason' AND Object_ID = OBJECT_ID(N'Holidays'))
BEGIN
    ALTER TABLE Holidays ADD DeleteReason NVARCHAR(500) NULL;
    PRINT '  Added DeleteReason to Holidays';
END
GO

-- =============================================
-- Leaves
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'IsDeleted' AND Object_ID = OBJECT_ID(N'Leaves'))
BEGIN
    ALTER TABLE Leaves ADD IsDeleted BIT NOT NULL DEFAULT 0;
    PRINT '  Added IsDeleted to Leaves';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedAt' AND Object_ID = OBJECT_ID(N'Leaves'))
BEGIN
    ALTER TABLE Leaves ADD DeletedAt DATETIME NULL;
    PRINT '  Added DeletedAt to Leaves';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedBy' AND Object_ID = OBJECT_ID(N'Leaves'))
BEGIN
    ALTER TABLE Leaves ADD DeletedBy NVARCHAR(100) NULL;
    PRINT '  Added DeletedBy to Leaves';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeleteReason' AND Object_ID = OBJECT_ID(N'Leaves'))
BEGIN
    ALTER TABLE Leaves ADD DeleteReason NVARCHAR(500) NULL;
    PRINT '  Added DeleteReason to Leaves';
END
GO

-- =============================================
-- Appreciations
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'IsDeleted' AND Object_ID = OBJECT_ID(N'Appreciations'))
BEGIN
    ALTER TABLE Appreciations ADD IsDeleted BIT NOT NULL DEFAULT 0;
    PRINT '  Added IsDeleted to Appreciations';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedAt' AND Object_ID = OBJECT_ID(N'Appreciations'))
BEGIN
    ALTER TABLE Appreciations ADD DeletedAt DATETIME NULL;
    PRINT '  Added DeletedAt to Appreciations';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeletedBy' AND Object_ID = OBJECT_ID(N'Appreciations'))
BEGIN
    ALTER TABLE Appreciations ADD DeletedBy NVARCHAR(100) NULL;
    PRINT '  Added DeletedBy to Appreciations';
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DeleteReason' AND Object_ID = OBJECT_ID(N'Appreciations'))
BEGIN
    ALTER TABLE Appreciations ADD DeleteReason NVARCHAR(500) NULL;
    PRINT '  Added DeleteReason to Appreciations';
END
GO

PRINT '✅ Soft-delete migration complete!';
