/**
 * Script to create the sp_ProcessBiometricLogs stored procedure
 * in the HRMS database using the existing mssql connection.
 * 
 * Run: node create-biometric-sp.js
 */

require('dotenv').config();
const sql = require('mssql');

const config = {
    server:   process.env.DB_SERVER   || 'LAPTOP-E5CHTP4B',
    database: process.env.DB_DATABASE || 'HRMS',
    user:     process.env.DB_USER     || 'hrms_user',
    password: process.env.DB_PASSWORD || 'Hrms@2026',
    port:     parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt:                   process.env.DB_ENCRYPT === 'true',
        trustServerCertificate:    process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        enableArithAbort:          true
    }
};

const SP_SQL = `
IF EXISTS (
    SELECT * FROM sys.objects 
    WHERE object_id = OBJECT_ID(N'[dbo].[sp_ProcessBiometricLogs]') 
    AND type IN (N'P', N'PC')
)
BEGIN
    DROP PROCEDURE [dbo].[sp_ProcessBiometricLogs]
END
`;

const SP_CREATE = `
CREATE PROCEDURE [dbo].[sp_ProcessBiometricLogs]
    @StartDate  DATE = NULL,
    @EndDate    DATE = NULL,
    @DeviceId   NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @StartDate IS NULL SET @StartDate = CAST(DATEADD(DAY, -7, GETDATE()) AS DATE);
    IF @EndDate   IS NULL SET @EndDate   = CAST(GETDATE() AS DATE);

    -- Step 1: Aggregate unprocessed logs into daily CheckIn/CheckOut summary
    ;WITH BiometricDaily AS (
        SELECT
            e.EmployeeId,
            CAST(bl.punch_time AS DATE)              AS AttendanceDate,
            CAST(MIN(bl.punch_time) AS TIME(0))      AS CheckInTime,
            CAST(MAX(bl.punch_time) AS TIME(0))      AS CheckOutTime,
            COUNT(*)                                 AS PunchCount
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

    -- Step 2: MERGE into Attendance table (insert or update)
    MERGE [dbo].[Attendance] AS target
    USING BiometricDaily AS source
        ON  target.EmployeeId      = source.EmployeeId
        AND target.AttendanceDate  = source.AttendanceDate
    WHEN MATCHED THEN
        UPDATE SET
            target.CheckInTime  = CASE WHEN source.CheckInTime  < target.CheckInTime  OR target.CheckInTime  IS NULL THEN source.CheckInTime  ELSE target.CheckInTime  END,
            target.CheckOutTime = CASE WHEN source.CheckOutTime > target.CheckOutTime OR target.CheckOutTime IS NULL THEN source.CheckOutTime ELSE target.CheckOutTime END,
            target.Status       = 'Present',
            target.Remarks      = ISNULL(target.Remarks, '') + ' [Biometric: ' + CAST(source.PunchCount AS NVARCHAR(5)) + ' punch(es)]',
            target.UpdatedAt    = GETDATE()
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (EmployeeId, AttendanceDate, Status, CheckInTime, CheckOutTime, Remarks, CreatedAt, UpdatedAt)
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

    -- Step 3: Mark logs as processed
    UPDATE bl
    SET bl.processed = 1
    FROM biometric_logs bl
    INNER JOIN Employees e ON e.BiometricId = bl.biometric_user_id
    WHERE
        bl.processed = 0
        AND e.Status  = 'Active'
        AND e.BiometricId IS NOT NULL
        AND CAST(bl.punch_time AS DATE) BETWEEN @StartDate AND @EndDate
        AND (@DeviceId IS NULL OR bl.device_id = @DeviceId);

    DECLARE @MarkedCount INT = @@ROWCOUNT;

    -- Step 4: Return summary
    SELECT
        @StartDate   AS ProcessedFromDate,
        @EndDate     AS ProcessedToDate,
        @MarkedCount AS LogsMarkedProcessed,
        (SELECT COUNT(DISTINCT EmployeeId) FROM Attendance WHERE AttendanceDate BETWEEN @StartDate AND @EndDate AND Remarks LIKE '%Biometric%') AS EmployeesProcessed,
        (SELECT COUNT(*)                   FROM Attendance WHERE AttendanceDate BETWEEN @StartDate AND @EndDate AND Remarks LIKE '%Biometric%') AS AttendanceRecordsTouched,
        GETDATE()    AS ProcessedAt;
END
`;

async function run() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('✅ Connected to:', config.server, '/', config.database);

        // Step 1: Drop existing SP if it exists
        console.log('Dropping existing SP (if any)...');
        await pool.request().query(SP_SQL);

        // Step 2: Create the SP
        console.log('Creating sp_ProcessBiometricLogs...');
        await pool.request().query(SP_CREATE);

        console.log('✅ sp_ProcessBiometricLogs created successfully!');

        // Step 3: Verify it exists
        const verify = await pool.request().query(`
            SELECT name, create_date 
            FROM sys.objects 
            WHERE object_id = OBJECT_ID('sp_ProcessBiometricLogs') AND type = 'P'
        `);

        if (verify.recordset.length > 0) {
            console.log('✅ Verified - SP exists in database:', verify.recordset[0]);
        } else {
            console.error('❌ Verification failed - SP not found after creation');
        }

        await sql.close();
        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

run();
