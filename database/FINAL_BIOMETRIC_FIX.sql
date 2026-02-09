-- =============================================
-- FINAL FIX: Biometric Schema
-- Execute this entire script in SSMS
-- =============================================

USE HRMS;
GO

-- Step 1: Add BiometricId Column
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'Employees') 
    AND name = 'BiometricId'
)
BEGIN
    ALTER TABLE Employees ADD BiometricId NVARCHAR(50) NULL;
    PRINT 'BiometricId column added';
END
ELSE
BEGIN
    PRINT 'BiometricId column already exists';
END
GO

-- Step 2: Create Unique Index
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_Employees_BiometricId'
)
BEGIN
    CREATE UNIQUE INDEX IX_Employees_BiometricId 
        ON Employees(BiometricId)
        WHERE BiometricId IS NOT NULL;
    PRINT 'Unique index created';
END
ELSE
BEGIN
    PRINT 'Index already exists';
END
GO

-- Step 3: Drop Old View
IF OBJECT_ID('vw_employee_biometric_attendance', 'V') IS NOT NULL
BEGIN
    DROP VIEW vw_employee_biometric_attendance;
    PRINT 'Old view dropped';
END
GO

-- Step 4: Create View (in separate batch)
CREATE VIEW vw_employee_biometric_attendance
AS
SELECT 
    e.EmployeeId,
    e.EmployeeCode,
    e.FirstName,
    e.LastName,
    (e.FirstName + ' ' + e.LastName) AS FullName,
    e.Email,
    e.BiometricId,
    e.DepartmentId,
    e.DesignationId,
    e.Status AS EmployeeStatus,
    bl.id AS LogId,
    bl.device_id AS DeviceId,
    bl.biometric_user_id AS BiometricUserId,
    bl.punch_time AS PunchTime,
    bl.punch_type AS PunchType,
    bl.processed AS IsProcessed,
    bl.created_at AS LogCreatedAt,
    CAST(bl.punch_time AS DATE) AS PunchDate,
    CAST(bl.punch_time AS TIME) AS PunchTimeOnly,
    DATENAME(WEEKDAY, bl.punch_time) AS DayOfWeek,
    bd.device_name AS DeviceName,
    bd.status AS DeviceStatus
FROM 
    Employees e
    INNER JOIN biometric_logs bl ON e.BiometricId = bl.biometric_user_id
    LEFT JOIN biometric_devices bd ON bl.device_id = bd.device_id
WHERE 
    e.BiometricId IS NOT NULL
    AND e.Status = 'Active';
GO

PRINT 'View created successfully';
GO

-- Verification
PRINT '';
PRINT '=== VERIFICATION ===';

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Employees') AND name = 'BiometricId')
    PRINT 'PASS: BiometricId column exists';
ELSE
    PRINT 'FAIL: BiometricId column missing';

IF OBJECT_ID('vw_employee_biometric_attendance', 'V') IS NOT NULL
    PRINT 'PASS: View exists';
ELSE
    PRINT 'FAIL: View does not exist';

BEGIN TRY
    SELECT TOP 0 * FROM vw_employee_biometric_attendance;
    PRINT 'PASS: View is queryable';
END TRY
BEGIN CATCH
    PRINT 'FAIL: ' + ERROR_MESSAGE();
END CATCH

PRINT '';
PRINT 'SETUP COMPLETE!';
PRINT 'Next: UPDATE Employees SET BiometricId = ''12345'' WHERE EmployeeId = 1;';
GO
