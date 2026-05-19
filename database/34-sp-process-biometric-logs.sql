-- =============================================
-- Stored Procedure: sp_ProcessBiometricLogs
-- Purpose: Converts raw biometric punch logs into
--          Attendance records (CheckIn/CheckOut)
-- Logic:
--   - MIN(punch_time) per employee per date = CheckInTime
--   - MAX(punch_time) per employee per date = CheckOutTime
--   - MERGE into Attendance table (insert or update)
--   - Mark processed logs as processed = 1
--   - Returns summary of records inserted/updated
-- =============================================

IF EXISTS (
    SELECT * FROM sys.objects 
    WHERE object_id = OBJECT_ID(N'[dbo].[sp_ProcessBiometricLogs]') 
    AND type IN (N'P', N'PC')
)
BEGIN
    DROP PROCEDURE [dbo].[sp_ProcessBiometricLogs];
END
GO

CREATE PROCEDURE [dbo].[sp_ProcessBiometricLogs]
    @StartDate  DATE = NULL,   -- Optional: process logs from this date
    @EndDate    DATE = NULL,   -- Optional: process logs until this date
    @DeviceId   NVARCHAR(100) = NULL  -- Optional: restrict to one device
AS
BEGIN
    SET NOCOUNT ON;

    -- Default date window: last 7 days if not specified
    IF @StartDate IS NULL SET @StartDate = CAST(DATEADD(DAY, -7, GETDATE()) AS DATE);
    IF @EndDate   IS NULL SET @EndDate   = CAST(GETDATE() AS DATE);

    -- -----------------------------------------------
    -- Step 1: Aggregate unprocessed logs → daily summary
    -- -----------------------------------------------
    ;WITH BiometricDaily AS (
        SELECT
            e.EmployeeId,
            CAST(bl.punch_time AS DATE)                                 AS AttendanceDate,
            CAST(MIN(bl.punch_time) AS TIME(0))                         AS CheckInTime,
            CAST(MAX(bl.punch_time) AS TIME(0))                         AS CheckOutTime,
            COUNT(*)                                                     AS PunchCount
        FROM biometric_logs bl
        INNER JOIN Employees e
            ON e.BiometricId = bl.biometric_user_id
        WHERE
            bl.processed = 0
            AND e.Status  = 'Active'
            AND e.BiometricId IS NOT NULL
            AND CAST(bl.punch_time AS DATE) BETWEEN @StartDate AND @EndDate
            AND (@DeviceId IS NULL OR bl.device_id = @DeviceId)
        GROUP BY
            e.EmployeeId,
            CAST(bl.punch_time AS DATE)
    )

    -- -----------------------------------------------
    -- Step 2: MERGE → Insert new or Update existing Attendance
    -- -----------------------------------------------
    MERGE [dbo].[Attendance] AS target
    USING BiometricDaily AS source
        ON target.EmployeeId      = source.EmployeeId
        AND target.AttendanceDate = source.AttendanceDate
    WHEN MATCHED THEN
        UPDATE SET
            target.CheckInTime  = CASE
                WHEN source.CheckInTime < target.CheckInTime OR target.CheckInTime IS NULL
                THEN source.CheckInTime
                ELSE target.CheckInTime
            END,
            target.CheckOutTime = CASE
                WHEN source.CheckOutTime > target.CheckOutTime OR target.CheckOutTime IS NULL
                THEN source.CheckOutTime
                ELSE target.CheckOutTime
            END,
            target.Status       = 'Present',
            target.Remarks      = ISNULL(target.Remarks, '') + 
                                  ' [Biometric: ' + CAST(source.PunchCount AS NVARCHAR(5)) + ' punch(es)]',
            target.UpdatedAt    = GETDATE()
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (
            EmployeeId,
            AttendanceDate,
            Status,
            CheckInTime,
            CheckOutTime,
            Remarks,
            CreatedAt,
            UpdatedAt
        )
        VALUES (
            source.EmployeeId,
            source.AttendanceDate,
            'Present',
            source.CheckInTime,
            source.CheckOutTime,
            'Auto-imported from biometric device (' + CAST(source.PunchCount AS NVARCHAR(5)) + ' punch(es))',
            GETDATE(),
            GETDATE()
        );

    -- Capture counts from MERGE
    DECLARE @MergeOutput TABLE (ActionType NVARCHAR(10));

    -- -----------------------------------------------
    -- Step 3: Mark processed logs as done
    -- -----------------------------------------------
    UPDATE bl
    SET bl.processed = 1
    FROM biometric_logs bl
    INNER JOIN Employees e
        ON e.BiometricId = bl.biometric_user_id
    WHERE
        bl.processed = 0
        AND e.Status  = 'Active'
        AND e.BiometricId IS NOT NULL
        AND CAST(bl.punch_time AS DATE) BETWEEN @StartDate AND @EndDate
        AND (@DeviceId IS NULL OR bl.device_id = @DeviceId);

    DECLARE @MarkedCount INT = @@ROWCOUNT;

    -- -----------------------------------------------
    -- Step 4: Return summary
    -- -----------------------------------------------
    SELECT
        @StartDate      AS ProcessedFromDate,
        @EndDate        AS ProcessedToDate,
        @MarkedCount    AS LogsMarkedProcessed,
        (
            SELECT COUNT(DISTINCT EmployeeId)
            FROM Attendance
            WHERE AttendanceDate BETWEEN @StartDate AND @EndDate
              AND Remarks LIKE '%Biometric%'
        )               AS EmployeesProcessed,
        (
            SELECT COUNT(*)
            FROM Attendance
            WHERE AttendanceDate BETWEEN @StartDate AND @EndDate
              AND Remarks LIKE '%Biometric%'
        )               AS AttendanceRecordsTouched,
        GETDATE()       AS ProcessedAt;

    PRINT 'sp_ProcessBiometricLogs completed successfully.';
    PRINT 'Logs marked processed: ' + CAST(@MarkedCount AS NVARCHAR(10));
END
GO

PRINT 'Stored procedure sp_ProcessBiometricLogs created successfully.';
GO

-- =============================================
-- Optional: Validation query - unmapped biometric IDs
-- Run this to find logs with no matching employee
-- =============================================
-- SELECT DISTINCT bl.biometric_user_id, COUNT(*) AS LogCount
-- FROM biometric_logs bl
-- LEFT JOIN Employees e ON e.BiometricId = bl.biometric_user_id
-- WHERE e.EmployeeId IS NULL
-- GROUP BY bl.biometric_user_id
-- ORDER BY LogCount DESC;
