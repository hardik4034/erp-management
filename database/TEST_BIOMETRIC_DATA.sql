-- =============================================
-- TEST SCRIPT: Biometric Integration
-- Insert sample data and verify view works
-- =============================================

USE HRMS;
GO

PRINT '========================================';
PRINT 'Step 1: Assign BiometricId to Employee';
PRINT '========================================';

-- Assign BiometricId to first employee
UPDATE Employees SET BiometricId = '12345' WHERE EmployeeId = 1;

-- Verify
SELECT EmployeeId, EmployeeCode, FirstName, LastName, BiometricId 
FROM Employees 
WHERE EmployeeId = 1;

GO

PRINT '';
PRINT '========================================';
PRINT 'Step 2: Insert Test Device';
PRINT '========================================';

-- Insert test device if it doesn't exist
IF NOT EXISTS (SELECT * FROM biometric_devices WHERE device_id = 'TEST_DEVICE_001')
BEGIN
    INSERT INTO biometric_devices (device_id, device_name, status, created_at)
    VALUES ('TEST_DEVICE_001', 'Test Device', 'active', GETDATE());
    PRINT 'Test device inserted';
END
ELSE
BEGIN
    PRINT 'Test device already exists';
END

GO

PRINT '';
PRINT '========================================';
PRINT 'Step 3: Insert Test Attendance Logs';
PRINT '========================================';

-- Insert test attendance logs (today's punches)
INSERT INTO biometric_logs (device_id, biometric_user_id, punch_time, punch_type, raw_json, processed, created_at)
VALUES 
('TEST_DEVICE_001', '12345', DATEADD(HOUR, 9, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), 'IN', '{}', 0, GETDATE()),
('TEST_DEVICE_001', '12345', DATEADD(HOUR, 18, CAST(CAST(GETDATE() AS DATE) AS DATETIME)), 'OUT', '{}', 0, GETDATE());

PRINT 'Test attendance logs inserted';

GO

PRINT '';
PRINT '========================================';
PRINT 'Step 4: Query the View';
PRINT '========================================';

-- Query the view to see attendance data
SELECT 
    EmployeeCode,
    FullName,
    BiometricId,
    DeviceId,
    PunchDate,
    PunchTimeOnly,
    PunchType,
    DayOfWeek,
    DeviceName
FROM vw_employee_biometric_attendance
ORDER BY PunchTime;

GO

PRINT '';
PRINT '========================================';
PRINT 'Step 5: Summary Statistics';
PRINT '========================================';

-- Count total logs
SELECT COUNT(*) AS TotalLogs FROM biometric_logs;

-- Count employees with BiometricId
SELECT COUNT(*) AS EmployeesWithBiometricId 
FROM Employees 
WHERE BiometricId IS NOT NULL;

-- Count records in view
SELECT COUNT(*) AS ViewRecords 
FROM vw_employee_biometric_attendance;

GO

PRINT '';
PRINT '========================================';
PRINT 'TEST COMPLETED!';
PRINT '========================================';
PRINT '';
PRINT 'If you see attendance data above, the integration is working!';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Assign BiometricId to more employees';
PRINT '2. Connect real devices via HRMS UI';
PRINT '3. Sync real attendance data';
PRINT '';
GO
