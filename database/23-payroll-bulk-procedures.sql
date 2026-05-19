
-- Bulk Generate Payroll for Multiple Employees
CREATE OR ALTER PROCEDURE sp_GeneratePayrollBulk
    @EmployeeIds NVARCHAR(MAX), -- Comma-separated employee IDs
    @PayPeriodStart DATE,
    @PayPeriodEnd DATE,
    @PayDate DATE,
    @IncludeExpenseClaims BIT = 0,
    @AddTimerangeToSalary BIT = 0,
    @UseAttendance BIT = 1,
    @DepartmentId INT = NULL
AS
BEGIN
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
            DECLARE @NewPayrollId INT;
            
            -- Generate payroll for this employee
            EXEC sp_GeneratePayroll 
                @EmployeeId = @EmployeeId,
                @PayPeriodStart = @PayPeriodStart,
                @PayPeriodEnd = @PayPeriodEnd,
                @PayDate = @PayDate,
                @IncludeExpenseClaims = @IncludeExpenseClaims,
                @AddTimerangeToSalary = @AddTimerangeToSalary,
                @UseAttendance = @UseAttendance;
            
            -- Store the payroll ID
            INSERT INTO @PayrollIds (PayrollId)
            SELECT SCOPE_IDENTITY();
        END TRY
        BEGIN CATCH
            -- Log error but continue with next employee
            PRINT 'Error generating payroll for Employee ID ' + CAST(@EmployeeId AS NVARCHAR(10)) + ': ' + ERROR_MESSAGE();
        END CATCH
        
        FETCH NEXT FROM employee_cursor INTO @EmployeeId;
    END
    
    CLOSE employee_cursor;
    DEALLOCATE employee_cursor;
    
    DROP TABLE #EmployeeList;
    
    -- Return all generated payroll IDs
    SELECT * FROM @PayrollIds;
END
GO

PRINT 'Bulk payroll generation procedure created successfully!';
GO
