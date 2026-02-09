-- =============================================
-- BIOMETRIC TESTING & VALIDATION QUERIES
-- Use these to verify the biometric integration
-- =============================================

USE HRMS;
GO

-- =============================================
-- Test 1: Check Employees with Biometric IDs
-- =============================================
PRINT 'Test 1: Employees with Biometric IDs';
PRINT '=====================================';

SELECT 
    EmployeeId,
    EmployeeCode,
    FirstName + ' ' + LastName AS FullName,
    BiometricId,
    Status
FROM Employees
WHERE BiometricId IS NOT NULL;

-- If no results, you need to assign biometric IDs to employees
GO

-- =============================================
-- Test 2: Check Connected Devices
-- =============================================
PRINT '';
PRINT 'Test 2: Connected Biometric Devices';
PRINT '====================================';

SELECT 
    device_id,
    device_name,
    status,
    last_sync,
    created_at
FROM biometric_devices
ORDER BY created_at DESC;

GO

-- =============================================
-- Test 3: Check Biometric Logs
-- =============================================
PRINT '';
PRINT 'Test 3: Recent Biometric Logs';
PRINT '==============================';

SELECT TOP 10
    id,
    device_id,
    biometric_user_id,
    punch_time,
    punch_type,
    processed
FROM biometric_logs
ORDER BY punch_time DESC;

GO

-- =============================================
-- Test 4: Test the Attendance View
-- =============================================
PRINT '';
PRINT 'Test 4: Employee Biometric Attendance View';
PRINT '===========================================';

SELECT TOP 10
    EmployeeCode,
    FullName,
    BiometricId,
    DeviceId,
    PunchDate,
    PunchTimeOnly,
    PunchType,
    DayOfWeek
FROM vw_employee_biometric_attendance
ORDER BY PunchTime DESC;

-- If no results, you need to:
-- 1. Assign BiometricId to employees
-- 2. Sync attendance from devices
GO

-- =============================================
-- Test 5: Employees Missing Biometric IDs
-- =============================================
PRINT '';
PRINT 'Test 5: Active Employees WITHOUT Biometric IDs';
PRINT '===============================================';

SELECT 
    EmployeeId,
    EmployeeCode,
    FirstName + ' ' + LastName AS FullName,
    Email,
    Status
FROM Employees
WHERE BiometricId IS NULL
AND Status = 'Active';

-- These employees need biometric IDs assigned
GO

-- =============================================
-- Test 6: Unprocessed Biometric Logs
-- =============================================
PRINT '';
PRINT 'Test 6: Unprocessed Biometric Logs';
PRINT '===================================';

SELECT 
    COUNT(*) AS UnprocessedCount
FROM biometric_logs
WHERE processed = 0;

SELECT TOP 5
    device_id,
    biometric_user_id,
    punch_time,
    punch_type
FROM biometric_logs
WHERE processed = 0
ORDER BY punch_time DESC;

GO

-- =============================================
-- Test 7: Daily Attendance Summary
-- =============================================
PRINT '';
PRINT 'Test 7: Today''s Attendance Summary';
PRINT '===================================';

SELECT 
    CAST(PunchTime AS DATE) AS AttendanceDate,
    COUNT(DISTINCT EmployeeId) AS EmployeesPresent,
    COUNT(*) AS TotalPunches,
    SUM(CASE WHEN PunchType = 'IN' THEN 1 ELSE 0 END) AS CheckIns,
    SUM(CASE WHEN PunchType = 'OUT' THEN 1 ELSE 0 END) AS CheckOuts
FROM vw_employee_biometric_attendance
WHERE CAST(PunchTime AS DATE) = CAST(GETDATE() AS DATE)
GROUP BY CAST(PunchTime AS DATE);

GO

-- =============================================
-- Test 8: Orphaned Biometric Logs
-- =============================================
PRINT '';
PRINT 'Test 8: Orphaned Biometric Logs (No Matching Employee)';
PRINT '=======================================================';

SELECT 
    bl.biometric_user_id,
    COUNT(*) AS LogCount,
    MIN(bl.punch_time) AS FirstPunch,
    MAX(bl.punch_time) AS LastPunch
FROM biometric_logs bl
LEFT JOIN Employees e ON bl.biometric_user_id = e.BiometricId
WHERE e.EmployeeId IS NULL
GROUP BY bl.biometric_user_id;

-- These biometric IDs need to be assigned to employees
GO

-- =============================================
-- SAMPLE DATA INSERTION (for testing)
-- =============================================
PRINT '';
PRINT 'Sample: Assign Biometric ID to Employee';
PRINT '========================================';
PRINT 'Example SQL to assign biometric IDs:';
PRINT '';
PRINT '-- Update single employee';
PRINT 'UPDATE Employees SET BiometricId = ''12345'' WHERE EmployeeId = 1;';
PRINT '';
PRINT '-- Update multiple employees';
PRINT 'UPDATE Employees SET BiometricId = ''12345'' WHERE EmployeeCode = ''EMP2026001'';';
PRINT 'UPDATE Employees SET BiometricId = ''12346'' WHERE EmployeeCode = ''EMP2026002'';';
PRINT '';

GO

PRINT '';
PRINT '========================================';
PRINT '✅ ALL TESTS COMPLETED';
PRINT '========================================';
PRINT '';
PRINT 'Review the results above to verify:';
PRINT '1. Employees have BiometricId assigned';
PRINT '2. Devices are connected';
PRINT '3. Logs are being synced';
PRINT '4. View returns data correctly';
PRINT '';
GO
