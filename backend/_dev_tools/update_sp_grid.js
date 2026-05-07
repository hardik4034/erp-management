const { getConnection } = require('../config/database');
const sql = require('mssql');

async function updateSP() {
    try {
        const pool = await getConnection();
        
        console.log('Updating sp_GetAttendanceGrid...');
        
        await pool.request().query(`
ALTER PROCEDURE [dbo].[sp_GetAttendanceGrid]
    @FromDate DATE,
    @ToDate DATE,
    @EmployeeIds NVARCHAR(MAX) = NULL
AS
BEGIN
    -- Get all employees (filtered if IDs provided)
    SELECT 
        e.EmployeeId,
        e.EmployeeCode,
        e.FirstName,
        e.LastName,
        e.ProfilePicture,
        e.ReportingTo,
        e.AttendanceApproverId,
        e.LeaveApproverId,
        d.DepartmentName,
        des.DesignationName
    INTO #TempEmployees
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    WHERE (e.Status = 'Active' OR e.EmployeeId IN (SELECT EmployeeId FROM Attendance WHERE AttendanceDate BETWEEN @FromDate AND @ToDate))
      AND (e.IsDeleted = 0 OR e.IsDeleted IS NULL)
      AND (@EmployeeIds IS NULL OR e.EmployeeId IN (SELECT value FROM STRING_SPLIT(@EmployeeIds, ',')))
    ORDER BY e.FirstName, e.LastName;

    -- Get attendance records for the date range
    SELECT 
        a.EmployeeId,
        a.AttendanceDate,
        a.Status,
        a.CheckInTime,
        a.CheckOutTime,
        a.Remarks,
        a.Notes,
        a.CheckInLocation,
        a.CheckOutLocation,
        a.WorkingFrom,
        a.WorkingFromOut
    INTO #TempAttendance
    FROM Attendance a
    WHERE a.AttendanceDate BETWEEN @FromDate AND @ToDate
      AND (@EmployeeIds IS NULL OR a.EmployeeId IN (SELECT value FROM STRING_SPLIT(@EmployeeIds, ',')));

    -- Return employees
    SELECT * FROM #TempEmployees;

    -- Return attendance records
    SELECT * FROM #TempAttendance;

    -- Return holidays in the date range
    SELECT HolidayDate, HolidayName, Description
    FROM Holidays
    WHERE HolidayDate BETWEEN @FromDate AND @ToDate
      AND Status = 'Active';

    -- Cleanup
    DROP TABLE #TempEmployees;
    DROP TABLE #TempAttendance;
END
        `);

        console.log('✅ sp_GetAttendanceGrid updated successfully.');

        // Test the SP to confirm it now returns relationship fields
        const testResult = await pool.request()
            .input('FromDate', sql.Date, '2026-04-01')
            .input('ToDate', sql.Date, '2026-04-30')
            .execute('sp_GetAttendanceGrid');

        const employee = testResult.recordsets[0][0];
        console.log('\nSample employee from SP result:');
        console.log({
            EmployeeId: employee.EmployeeId,
            FirstName: employee.FirstName,
            ReportingTo: employee.ReportingTo,
            AttendanceApproverId: employee.AttendanceApproverId
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateSP();
