-- =============================================
-- BIOMETRIC SCHEMA FIX - Production Safe
-- Fixes column name mismatches and recreates view
-- =============================================

USE HRMS;
GO

PRINT '========================================';
PRINT 'Step 1: Inspecting Employees Table';
PRINT '========================================';

-- Inspect current Employees table structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Employees'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT 'Employees table structure displayed above.';
PRINT '';

-- =============================================
-- Step 2: Add Missing biometric_id Column
-- =============================================
PRINT '========================================';
PRINT 'Step 2: Adding biometric_id Column';
PRINT '========================================';

-- Check if biometric_id column exists
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') 
    AND name = 'BiometricId'
)
BEGIN
    -- Add BiometricId column (using PascalCase to match existing schema)
    ALTER TABLE [dbo].[Employees]
    ADD [BiometricId] NVARCHAR(50) NULL;
    
    PRINT '✓ Column BiometricId added to Employees table';
    
    -- Create unique index to prevent duplicate biometric IDs
    CREATE UNIQUE INDEX [IX_Employees_BiometricId] 
        ON [dbo].[Employees]([BiometricId])
        WHERE [BiometricId] IS NOT NULL;
    
    PRINT '✓ Unique index created on BiometricId';
END
ELSE
BEGIN
    PRINT '✓ Column BiometricId already exists';
END
GO

-- =============================================
-- Step 3: Drop Broken View
-- =============================================
PRINT '';
PRINT '========================================';
PRINT 'Step 3: Dropping Broken View';
PRINT '========================================';

IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[vw_employee_biometric_attendance]'))
BEGIN
    DROP VIEW [dbo].[vw_employee_biometric_attendance];
    PRINT '✓ Old view dropped successfully';
END
ELSE
BEGIN
    PRINT '✓ No existing view to drop';
END
GO

-- =============================================
-- Step 4: Create Corrected View
-- =============================================
PRINT '';
PRINT '========================================';
PRINT 'Step 4: Creating Corrected View';
PRINT '========================================';

CREATE VIEW [dbo].[vw_employee_biometric_attendance]
AS
SELECT 
    -- Employee Information (using correct column names)
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

PRINT '✓ View vw_employee_biometric_attendance created successfully';
GO

-- =============================================
-- Step 5: Verification Queries
-- =============================================
PRINT '';
PRINT '========================================';
PRINT 'Step 5: Running Verification Tests';
PRINT '========================================';

-- Test 1: Check if view was created
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[vw_employee_biometric_attendance]'))
BEGIN
    PRINT '✓ Test 1 PASSED: View exists';
END
ELSE
BEGIN
    PRINT '✗ Test 1 FAILED: View does not exist';
END

-- Test 2: Check if BiometricId column exists
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Employees]') 
    AND name = 'BiometricId'
)
BEGIN
    PRINT '✓ Test 2 PASSED: BiometricId column exists';
END
ELSE
BEGIN
    PRINT '✗ Test 2 FAILED: BiometricId column missing';
END

-- Test 3: Try to select from view (should not error)
BEGIN TRY
    SELECT TOP 0 * FROM [dbo].[vw_employee_biometric_attendance];
    PRINT '✓ Test 3 PASSED: View is queryable without errors';
END TRY
BEGIN CATCH
    PRINT '✗ Test 3 FAILED: ' + ERROR_MESSAGE();
END CATCH

-- Test 4: Check view column count
DECLARE @ColumnCount INT;
SELECT @ColumnCount = COUNT(*)
FROM INFORMATION_SCHEMA.VIEW_COLUMN_USAGE
WHERE VIEW_NAME = 'vw_employee_biometric_attendance';

PRINT '✓ Test 4: View has ' + CAST(@ColumnCount AS NVARCHAR(10)) + ' columns';

GO

-- =============================================
-- Step 6: Display View Structure
-- =============================================
PRINT '';
PRINT '========================================';
PRINT 'Step 6: View Structure';
PRINT '========================================';

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.VIEW_COLUMN_USAGE vcu
INNER JOIN INFORMATION_SCHEMA.COLUMNS c
    ON vcu.VIEW_NAME = c.TABLE_NAME
    AND vcu.COLUMN_NAME = c.COLUMN_NAME
WHERE vcu.VIEW_NAME = 'vw_employee_biometric_attendance'
ORDER BY ORDINAL_POSITION;

GO

-- =============================================
-- SUMMARY
-- =============================================
PRINT '';
PRINT '========================================';
PRINT '✅ BIOMETRIC SCHEMA FIX COMPLETED';
PRINT '========================================';
PRINT '';
PRINT 'What was fixed:';
PRINT '1. Added BiometricId column to Employees table';
PRINT '2. Created unique index on BiometricId';
PRINT '3. Dropped broken view';
PRINT '4. Recreated view with correct column names:';
PRINT '   - EmployeeId (not id)';
PRINT '   - FirstName, LastName (not name)';
PRINT '   - BiometricId (newly added)';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Update employees with their biometric IDs';
PRINT '2. Connect biometric devices via HRMS UI';
PRINT '3. Sync attendance logs';
PRINT '4. Query the view for reports';
PRINT '';
PRINT '========================================';
GO
