/**
 * Fix Payroll Stored Procedures
 * 
 * Issue 1: sp_GeneratePayroll was created with QUOTED_IDENTIFIER OFF → INSERT fails
 * Issue 2: sp_GeneratePayrollBulk uses @AddTimerangeToSalary (typo) instead of @AddSewerageToSalary
 *
 * This script drops and recreates both procedures with correct settings.
 */
const { getConnection } = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// Fix 1: sp_GeneratePayroll — recreate with SET QUOTED_IDENTIFIER ON
// ─────────────────────────────────────────────────────────────────────────────
const SP_GENERATE_PAYROLL = `
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

ALTER PROCEDURE sp_GeneratePayroll
    @EmployeeId INT,
    @PayPeriodStart DATE,
    @PayPeriodEnd DATE,
    @PayDate DATE,
    @IncludeExpenseClaims BIT = 0,
    @AddSewerageToSalary BIT = 0,
    @UseAttendance BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @BaseSalary DECIMAL(18, 2);
    DECLARE @WorkingDays INT;
    DECLARE @PresentDays INT;
    DECLARE @AbsentDays INT;
    DECLARE @LeaveDays INT;
    DECLARE @TotalEarnings DECIMAL(18, 2) = 0;
    DECLARE @TotalDeductions DECIMAL(18, 2) = 0;
    DECLARE @NetSalary DECIMAL(18, 2);
    DECLARE @PayrollId INT;

    -- Get employee salary
    SELECT @BaseSalary = ISNULL(Salary, 0)
    FROM Employees
    WHERE EmployeeId = @EmployeeId;

    IF @BaseSalary = 0
    BEGIN
        THROW 50003, 'Employee salary not configured.', 1;
    END

    -- Calculate attendance if enabled
    IF @UseAttendance = 1
    BEGIN
        DECLARE @AttendanceTable TABLE (
            WorkingDays INT,
            PresentDays INT,
            AbsentDays INT,
            LeaveDays INT,
            Holidays INT,
            TotalDays INT
        );

        INSERT INTO @AttendanceTable
        EXEC sp_CalculateAttendanceForPeriod @EmployeeId, @PayPeriodStart, @PayPeriodEnd;

        SELECT @WorkingDays = WorkingDays,
               @PresentDays = PresentDays,
               @AbsentDays = AbsentDays,
               @LeaveDays = LeaveDays
        FROM @AttendanceTable;

        -- Adjust salary for absences
        IF @AbsentDays > 0 AND @WorkingDays > 0
        BEGIN
            SET @BaseSalary = @BaseSalary * (@PresentDays + @LeaveDays) / @WorkingDays;
        END
    END
    ELSE
    BEGIN
        -- Use full month if not using attendance
        SET @WorkingDays = DATEDIFF(DAY, @PayPeriodStart, @PayPeriodEnd) + 1;
        SET @PresentDays = @WorkingDays;
        SET @AbsentDays = 0;
        SET @LeaveDays = 0;
    END

    -- Create payroll record
    INSERT INTO Payroll (
        EmployeeId, PayPeriodStart, PayPeriodEnd, PayDate,
        BaseSalary, TotalEarnings, TotalDeductions, NetSalary,
        WorkingDays, PresentDays, AbsentDays, LeaveDays
    )
    VALUES (
        @EmployeeId, @PayPeriodStart, @PayPeriodEnd, @PayDate,
        @BaseSalary, 0, 0, @BaseSalary,
        @WorkingDays, @PresentDays, @AbsentDays, @LeaveDays
    );

    SET @PayrollId = SCOPE_IDENTITY();

    -- Add earnings components
    INSERT INTO PayrollDetails (PayrollId, ComponentId, ComponentName, ComponentType, Amount)
    SELECT
        @PayrollId,
        ComponentId,
        ComponentName,
        ComponentType,
        CASE
            WHEN CalculationType = 'Fixed' THEN DefaultValue
            WHEN CalculationType = 'Percentage' THEN (@BaseSalary * DefaultValue / 100)
        END
    FROM PayrollComponents
    WHERE ComponentType = 'Earning' AND IsActive = 1;

    -- Add deductions components
    INSERT INTO PayrollDetails (PayrollId, ComponentId, ComponentName, ComponentType, Amount)
    SELECT
        @PayrollId,
        ComponentId,
        ComponentName,
        ComponentType,
        CASE
            WHEN CalculationType = 'Fixed' THEN DefaultValue
            WHEN CalculationType = 'Percentage' THEN (@BaseSalary * DefaultValue / 100)
        END
    FROM PayrollComponents
    WHERE ComponentType = 'Deduction' AND IsActive = 1;

    -- Calculate totals
    SELECT @TotalEarnings = ISNULL(SUM(Amount), 0)
    FROM PayrollDetails
    WHERE PayrollId = @PayrollId AND ComponentType = 'Earning';

    SELECT @TotalDeductions = ISNULL(SUM(Amount), 0)
    FROM PayrollDetails
    WHERE PayrollId = @PayrollId AND ComponentType = 'Deduction';

    SET @NetSalary = @BaseSalary + @TotalEarnings - @TotalDeductions;

    -- Update payroll totals
    UPDATE Payroll
    SET TotalEarnings = @TotalEarnings,
        TotalDeductions = @TotalDeductions,
        NetSalary = @NetSalary
    WHERE PayrollId = @PayrollId;

    SELECT @PayrollId AS PayrollId;
END
`;

// ─────────────────────────────────────────────────────────────────────────────
// Fix 2: sp_GeneratePayrollBulk — fix @AddTimerangeToSalary → @AddSewerageToSalary
// ─────────────────────────────────────────────────────────────────────────────
const SP_GENERATE_PAYROLL_BULK = `
ALTER PROCEDURE sp_GeneratePayrollBulk
    @EmployeeIds NVARCHAR(MAX),
    @PayPeriodStart DATE,
    @PayPeriodEnd DATE,
    @PayDate DATE,
    @IncludeExpenseClaims BIT = 0,
    @AddSewerageToSalary BIT = 0,
    @UseAttendance BIT = 1,
    @DepartmentId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @EmployeeId INT;
    DECLARE @PayrollIds TABLE (PayrollId INT);

    -- Create temp table for employee IDs
    CREATE TABLE #EmployeeList (EmployeeId INT);

    -- Parse comma-separated IDs
    INSERT INTO #EmployeeList (EmployeeId)
    SELECT CAST(value AS INT)
    FROM STRING_SPLIT(@EmployeeIds, ',')
    WHERE value <> '';

    -- Filter by department if specified
    IF @DepartmentId IS NOT NULL
    BEGIN
        DELETE FROM #EmployeeList
        WHERE EmployeeId NOT IN (
            SELECT EmployeeId FROM Employees WHERE DepartmentId = @DepartmentId
        );
    END

    -- Generate payroll for each employee
    DECLARE employee_cursor CURSOR FOR
    SELECT EmployeeId FROM #EmployeeList;

    OPEN employee_cursor;
    FETCH NEXT FROM employee_cursor INTO @EmployeeId;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            -- Generate payroll for this employee
            EXEC sp_GeneratePayroll
                @EmployeeId = @EmployeeId,
                @PayPeriodStart = @PayPeriodStart,
                @PayPeriodEnd = @PayPeriodEnd,
                @PayDate = @PayDate,
                @IncludeExpenseClaims = @IncludeExpenseClaims,
                @AddSewerageToSalary = @AddSewerageToSalary,
                @UseAttendance = @UseAttendance;

            -- Capture the newly inserted PayrollId
            INSERT INTO @PayrollIds (PayrollId)
            VALUES (SCOPE_IDENTITY());
        END TRY
        BEGIN CATCH
            PRINT 'Error generating payroll for Employee ID ' + CAST(@EmployeeId AS NVARCHAR(10)) + ': ' + ERROR_MESSAGE();
        END CATCH

        FETCH NEXT FROM employee_cursor INTO @EmployeeId;
    END

    CLOSE employee_cursor;
    DEALLOCATE employee_cursor;

    DROP TABLE #EmployeeList;

    -- Return all generated payroll IDs
    SELECT PayrollId FROM @PayrollIds;
END
`;

async function fixPayrollProcs() {
    try {
        const pool = await getConnection();

        console.log('🔧 Fix 1: Recreating sp_GeneratePayroll with SET QUOTED_IDENTIFIER ON...');
        // Must run ALTER without the GO batch separator — split on GO
        const singleStatements = SP_GENERATE_PAYROLL
            .split(/^GO\s*$/im)
            .map(s => s.trim())
            .filter(Boolean);

        for (const stmt of singleStatements) {
            await pool.request().query(stmt);
        }
        console.log('✅ sp_GeneratePayroll fixed.');

        console.log('\n🔧 Fix 2: Renaming @AddTimerangeToSalary → @AddSewerageToSalary in sp_GeneratePayrollBulk...');
        await pool.request().query(SP_GENERATE_PAYROLL_BULK);
        console.log('✅ sp_GeneratePayrollBulk fixed.');

        // Verify
        console.log('\n📋 Verifying SET options...');
        const verify = await pool.request().query(`
            SELECT name, uses_quoted_identifier
            FROM sys.sql_modules sm
            JOIN sys.procedures pr ON sm.object_id = pr.object_id
            WHERE pr.name IN ('sp_GeneratePayroll', 'sp_GeneratePayrollBulk')
        `);
        console.table(verify.recordset);

        console.log('\n📋 Verifying sp_GeneratePayrollBulk parameters...');
        const params = await pool.request().query(`
            SELECT p.name AS ParameterName
            FROM sys.procedures pr
            JOIN sys.parameters p ON pr.object_id = p.object_id
            WHERE pr.name = 'sp_GeneratePayrollBulk'
            ORDER BY p.parameter_id
        `);
        console.table(params.recordset);

        console.log('\n🎉 All payroll procedure fixes applied successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Fix failed:', err.message);
        process.exit(1);
    }
}

fixPayrollProcs();
