const sql = require('mssql');
const { getConnection } = require('./config/database');

async function updateStoredProcedure() {
    try {
        console.log('Connecting to database...');
        const pool = await getConnection();
        console.log('Connected successfully!');

        const sqlScript = `
-- Update sp_GeneratePayroll with new parameter
CREATE OR ALTER PROCEDURE sp_GeneratePayroll
    @EmployeeId INT,
    @PayPeriodStart DATE,
    @PayPeriodEnd DATE,
    @PayDate DATE,
    @IncludeExpenseClaims BIT = 0,
    @AddSewerageToSalary BIT = 0,
    @UseAttendance BIT = 1
AS
BEGIN
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

        console.log('Updating sp_GeneratePayroll stored procedure...');
        await pool.request().query(sqlScript);
        console.log('✅ Stored procedure updated successfully!');

        // Verify the update
        console.log('\nVerifying procedure parameters...');
        const result = await pool.request().query(`
            SELECT 
                PARAMETER_NAME,
                DATA_TYPE,
                PARAMETER_MODE
            FROM INFORMATION_SCHEMA.PARAMETERS
            WHERE SPECIFIC_NAME = 'sp_GeneratePayroll'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\nProcedure parameters:');
        result.recordset.forEach(param => {
            console.log(`  - ${param.PARAMETER_NAME}: ${param.DATA_TYPE} (${param.PARAMETER_MODE})`);
        });

        console.log('\n✅ Database update complete!');
        console.log('The backend server should auto-restart.');
        console.log('Please refresh your browser and try generating payroll again.');
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

updateStoredProcedure();
