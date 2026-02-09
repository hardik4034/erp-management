-- =============================================
-- BIOMETRIC FIX - CORRECTED VERSION
-- Fixes batch separator issues
-- =============================================

USE HRMS;
GO

-- =============================================
-- Step 1: Add BiometricId Column
-- =============================================
PRINT '========================================';
PRINT 'Step 1: Adding BiometricId Column';
PRINT '========================================';

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') 
    AND name = 'BiometricId'
)
BEGIN
    ALTER TABLE [dbo].[Employees]
    ADD [BiometricId] NVARCHAR(50) NULL;
    
    PRINT 'BiometricId column added';
END
ELSE
BEGIN
    PRINT 'BiometricId column already exists';
END
GO

-- =============================================
-- Step 2: Create Unique Index
-- =============================================
PRINT 'Step 2: Creating Unique Index';
PRINT '========================================';

IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_Employees_BiometricId' 
    AND object_id = OBJECT_ID(N'[dbo].[Employees]')
)
BEGIN
    CREATE UNIQUE INDEX [IX_Employees_BiometricId] 
        ON [dbo].[Employees]([BiometricId])
        WHERE [BiometricId] IS NOT NULL;
    
    PRINT 'Unique index created';
END
ELSE
BEGIN
    PRINT 'Unique index already exists';
END
GO

-- =============================================
-- Step 3: Drop Broken View
-- =============================================
PRINT 'Step 3: Dropping Broken View';
PRINT '========================================';

IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[vw_employee_biometric_attendance]'))
BEGIN
    DROP VIEW [dbo].[vw_employee_biometric_attendance];
    PRINT 'Old view dropped';
END
ELSE
BEGIN
    PRINT 'No existing view to drop';
END
GO

-- =============================================
-- Step 4: Create View (MUST be in own batch)
-- =============================================
PRINT 'Step 4: Creating View';
PRINT '========================================';
GO

CREATE VIEW [dbo].[vw_employee_biometric_attendance]
AS
SELECT 
    -- Employee Information
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
    
    -- Biometric Log Information
    bl.id AS LogId,
    bl.device_id AS DeviceId,
    bl.biometric_user_id AS BiometricUserId,
    bl.punch_time AS PunchTime,
    bl.punch_type AS PunchType,
    bl.processed AS IsProcessed,
    bl.created_at AS LogCreatedAt,
    
    -- Computed Fields
    CAST(bl.punch_time AS DATE) AS PunchDate,
    CAST(bl.punch_time AS TIME) AS PunchTimeOnly,
    DATENAME(WEEKDAY, bl.punch_time) AS DayOfWeek,
    
    -- Device Information
    bd.device_name AS DeviceName,
    bd.status AS DeviceStatus
FROM 
    [dbo].[Employees] e
    INNER JOIN [dbo].[biometric_logs] bl 
        ON e.BiometricId = bl.biometric_user_id
    LEFT JOIN [dbo].[biometric_devices] bd
        ON bl.device_id = bd.device_id
WHERE 
    e.BiometricId IS NOT NULL
    AND e.Status = 'Active';
GO

PRINT 'View created successfully';
GO

-- =============================================
-- Step 5: Verification
-- =============================================
PRINT '';
PRINT 'Verification Tests';
PRINT '========================================';

-- Test 1: BiometricId column exists
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') 
    AND name = 'BiometricId'
)
BEGIN
    PRINT 'Test 1 PASSED: BiometricId column exists';
END
ELSE
BEGIN
    PRINT 'Test 1 FAILED: BiometricId column missing';
END

-- Test 2: View exists
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[vw_employee_biometric_attendance]'))
BEGIN
    PRINT 'Test 2 PASSED: View exists';
END
ELSE
BEGIN
    PRINT 'Test 2 FAILED: View does not exist';
END

-- Test 3: View is queryable
BEGIN TRY
    SELECT TOP 0 * FROM [dbo].[vw_employee_biometric_attendance];
    PRINT 'Test 3 PASSED: View is queryable';
END TRY
BEGIN CATCH
    PRINT 'Test 3 FAILED: ' + ERROR_MESSAGE();
END CATCH

GO

PRINT '';
PRINT '========================================';
PRINT 'BIOMETRIC FIX COMPLETED';
PRINT '========================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Assign BiometricId to employees:';
PRINT '   UPDATE Employees SET BiometricId = ''12345'' WHERE EmployeeId = 1;';
PRINT '';
PRINT '2. Connect devices via HRMS UI';
PRINT '3. Sync attendance logs';
PRINT '';
GO
