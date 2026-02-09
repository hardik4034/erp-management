-- =============================================
-- Payroll Management System - Stored Procedures
-- All CRUD operations for payroll
-- =============================================

USE HRMS;
GO

-- =============================================
-- PAYROLL COMPONENT PROCEDURES
-- =============================================

-- Get All Payroll Components
CREATE OR ALTER PROCEDURE sp_GetAllPayrollComponents
    @ComponentType NVARCHAR(20) = NULL
AS
BEGIN
    SELECT * FROM PayrollComponents
    WHERE IsActive = 1
      AND (@ComponentType IS NULL OR ComponentType = @ComponentType)
    ORDER BY ComponentType, ComponentName;
END
GO

-- Create Payroll Component
CREATE OR ALTER PROCEDURE sp_CreatePayrollComponent
    @ComponentName NVARCHAR(100),
    @ComponentType NVARCHAR(20),
    @CalculationType NVARCHAR(20),
    @DefaultValue DECIMAL(18, 2) = 0,
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    INSERT INTO PayrollComponents (ComponentName, ComponentType, CalculationType, DefaultValue, Description)
    VALUES (@ComponentName, @ComponentType, @CalculationType, @DefaultValue, @Description);
    
    SELECT SCOPE_IDENTITY() AS ComponentId;
END
GO

-- Update Payroll Component
CREATE OR ALTER PROCEDURE sp_UpdatePayrollComponent
    @ComponentId INT,
    @ComponentName NVARCHAR(100),
    @ComponentType NVARCHAR(20),
    @CalculationType NVARCHAR(20),
    @DefaultValue DECIMAL(18, 2),
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE PayrollComponents
    SET ComponentName = @ComponentName,
        ComponentType = @ComponentType,
        CalculationType = @CalculationType,
        DefaultValue = @DefaultValue,
        Description = @Description
    WHERE ComponentId = @ComponentId;
END
GO

-- Delete Payroll Component (Soft Delete)
CREATE OR ALTER PROCEDURE sp_DeletePayrollComponent
    @ComponentId INT
AS
BEGIN
    UPDATE PayrollComponents SET IsActive = 0 WHERE ComponentId = @ComponentId;
END
GO

-- =============================================
-- PAYROLL PROCEDURES
-- =============================================

-- Get All Payroll Records
CREATE OR ALTER PROCEDURE sp_GetAllPayroll
    @EmployeeId INT = NULL,
    @Status NVARCHAR(20) = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @Year INT = NULL,
    @Month INT = NULL,
    @SalaryCycle NVARCHAR(20) = NULL
AS
BEGIN
    SELECT 
        p.*,
        e.EmployeeCode,
        e.FirstName,
        e.LastName,
        e.Email,
        e.SalaryType,
        d.DepartmentName,
        des.DesignationName,
        -- Calculate CTC (Base Salary + Total Earnings)
        (p.BaseSalary + p.TotalEarnings) AS CTC
    FROM Payroll p
    JOIN Employees e ON p.EmployeeId = e.EmployeeId
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    WHERE (@EmployeeId IS NULL OR p.EmployeeId = @EmployeeId)
      AND (@Status IS NULL OR p.Status = @Status)
      AND (@FromDate IS NULL OR p.PayPeriodStart >= @FromDate)
      AND (@ToDate IS NULL OR p.PayPeriodEnd <= @ToDate)
      AND (@Year IS NULL OR YEAR(p.PayPeriodStart) = @Year)
      AND (@Month IS NULL OR MONTH(p.PayPeriodStart) = @Month)
      AND (@SalaryCycle IS NULL OR e.SalaryType = @SalaryCycle)
    ORDER BY p.PayPeriodStart DESC, e.FirstName;
END
GO

-- Get Payroll By ID
CREATE OR ALTER PROCEDURE sp_GetPayrollById
    @PayrollId INT
AS
BEGIN
    -- Get payroll header
    SELECT 
        p.*,
        e.EmployeeCode,
        e.FirstName,
        e.LastName,
        e.Email,
        e.Phone,
        d.DepartmentName,
        des.DesignationName
    FROM Payroll p
    JOIN Employees e ON p.EmployeeId = e.EmployeeId
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    WHERE p.PayrollId = @PayrollId;
    
    -- Get payroll details
    SELECT 
        pd.*,
        pc.ComponentType,
        pc.CalculationType
    FROM PayrollDetails pd
    LEFT JOIN PayrollComponents pc ON pd.ComponentId = pc.ComponentId
    WHERE pd.PayrollId = @PayrollId
    ORDER BY pd.ComponentType DESC, pd.ComponentName;
END
GO

-- Create Payroll
CREATE OR ALTER PROCEDURE sp_CreatePayroll
    @EmployeeId INT,
    @PayPeriodStart DATE,
    @PayPeriodEnd DATE,
    @PayDate DATE,
    @BaseSalary DECIMAL(18, 2),
    @TotalEarnings DECIMAL(18, 2) = 0,
    @TotalDeductions DECIMAL(18, 2) = 0,
    @NetSalary DECIMAL(18, 2),
    @WorkingDays INT = 0,
    @PresentDays INT = 0,
    @AbsentDays INT = 0,
    @LeaveDays INT = 0,
    @PaymentMethod NVARCHAR(50) = NULL,
    @Notes NVARCHAR(MAX) = NULL
AS
BEGIN
    -- Check for duplicate payroll
    IF EXISTS (SELECT 1 FROM Payroll WHERE EmployeeId = @EmployeeId AND PayPeriodStart = @PayPeriodStart AND PayPeriodEnd = @PayPeriodEnd)
    BEGIN
        THROW 50001, 'Payroll already exists for this employee and period.', 1;
    END
    
    INSERT INTO Payroll (
        EmployeeId, PayPeriodStart, PayPeriodEnd, PayDate,
        BaseSalary, TotalEarnings, TotalDeductions, NetSalary,
        WorkingDays, PresentDays, AbsentDays, LeaveDays,
        PaymentMethod, Notes
    )
    VALUES (
        @EmployeeId, @PayPeriodStart, @PayPeriodEnd, @PayDate,
        @BaseSalary, @TotalEarnings, @TotalDeductions, @NetSalary,
        @WorkingDays, @PresentDays, @AbsentDays, @LeaveDays,
        @PaymentMethod, @Notes
    );
    
    SELECT SCOPE_IDENTITY() AS PayrollId;
END
GO

-- Update Payroll
CREATE OR ALTER PROCEDURE sp_UpdatePayroll
    @PayrollId INT,
    @PayDate DATE,
    @BaseSalary DECIMAL(18, 2),
    @TotalEarnings DECIMAL(18, 2),
    @TotalDeductions DECIMAL(18, 2),
    @NetSalary DECIMAL(18, 2),
    @WorkingDays INT,
    @PresentDays INT,
    @AbsentDays INT,
    @LeaveDays INT,
    @PaymentMethod NVARCHAR(50) = NULL,
    @Notes NVARCHAR(MAX) = NULL
AS
BEGIN
    UPDATE Payroll
    SET PayDate = @PayDate,
        BaseSalary = @BaseSalary,
        TotalEarnings = @TotalEarnings,
        TotalDeductions = @TotalDeductions,
        NetSalary = @NetSalary,
        WorkingDays = @WorkingDays,
        PresentDays = @PresentDays,
        AbsentDays = @AbsentDays,
        LeaveDays = @LeaveDays,
        PaymentMethod = @PaymentMethod,
        Notes = @Notes
    WHERE PayrollId = @PayrollId;
END
GO

-- Update Payroll Status
CREATE OR ALTER PROCEDURE sp_UpdatePayrollStatus
    @PayrollId INT,
    @Status NVARCHAR(20),
    @ApprovedBy NVARCHAR(100) = NULL,
    @PaymentReference NVARCHAR(100) = NULL
AS
BEGIN
    UPDATE Payroll
    SET Status = @Status,
        ApprovedBy = @ApprovedBy,
        ApprovedDate = CASE WHEN @Status IN ('Approved', 'Paid') THEN GETDATE() ELSE NULL END,
        PaymentReference = @PaymentReference
    WHERE PayrollId = @PayrollId;
END
GO

-- Delete Payroll
CREATE OR ALTER PROCEDURE sp_DeletePayroll
    @PayrollId INT
AS
BEGIN
    -- Check if payroll is already paid
    IF EXISTS (SELECT 1 FROM Payroll WHERE PayrollId = @PayrollId AND Status = 'Paid')
    BEGIN
        THROW 50002, 'Cannot delete paid payroll. Please cancel it first.', 1;
    END
    
    DELETE FROM Payroll WHERE PayrollId = @PayrollId;
END
GO

-- =============================================
-- PAYROLL DETAILS PROCEDURES
-- =============================================

-- Add Payroll Detail
CREATE OR ALTER PROCEDURE sp_AddPayrollDetail
    @PayrollId INT,
    @ComponentId INT,
    @Amount DECIMAL(18, 2),
    @Remarks NVARCHAR(500) = NULL
AS
BEGIN
    DECLARE @ComponentName NVARCHAR(100);
    DECLARE @ComponentType NVARCHAR(20);
    
    SELECT @ComponentName = ComponentName, @ComponentType = ComponentType
    FROM PayrollComponents
    WHERE ComponentId = @ComponentId;
    
    INSERT INTO PayrollDetails (PayrollId, ComponentId, ComponentName, ComponentType, Amount, Remarks)
    VALUES (@PayrollId, @ComponentId, @ComponentName, @ComponentType, @Amount, @Remarks);
    
    SELECT SCOPE_IDENTITY() AS PayrollDetailId;
END
GO

-- Update Payroll Detail
CREATE OR ALTER PROCEDURE sp_UpdatePayrollDetail
    @PayrollDetailId INT,
    @Amount DECIMAL(18, 2),
    @Remarks NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE PayrollDetails
    SET Amount = @Amount,
        Remarks = @Remarks
    WHERE PayrollDetailId = @PayrollDetailId;
END
GO

-- Delete Payroll Detail
CREATE OR ALTER PROCEDURE sp_DeletePayrollDetail
    @PayrollDetailId INT
AS
BEGIN
    DELETE FROM PayrollDetails WHERE PayrollDetailId = @PayrollDetailId;
END
GO

-- =============================================
-- PAYROLL CALCULATION PROCEDURES
-- =============================================

-- Calculate Employee Attendance for Period
CREATE OR ALTER PROCEDURE sp_CalculateAttendanceForPeriod
    @EmployeeId INT,
    @StartDate DATE,
    @EndDate DATE
AS
BEGIN
    DECLARE @TotalDays INT;
    DECLARE @PresentDays INT;
    DECLARE @AbsentDays INT;
    DECLARE @LeaveDays INT;
    DECLARE @Holidays INT;
    DECLARE @WorkingDays INT;
    
    -- Calculate total days
    SET @TotalDays = DATEDIFF(DAY, @StartDate, @EndDate) + 1;
    
    -- Calculate holidays
    SELECT @Holidays = COUNT(*)
    FROM Holidays
    WHERE HolidayDate BETWEEN @StartDate AND @EndDate
      AND Status = 'Active';
    
    -- Calculate present days
    SELECT @PresentDays = COUNT(*)
    FROM Attendance
    WHERE EmployeeId = @EmployeeId
      AND AttendanceDate BETWEEN @StartDate AND @EndDate
      AND Status IN ('Present', 'Half Day');
    
    -- Calculate leave days
    SELECT @LeaveDays = COUNT(DISTINCT l.FromDate)
    FROM Leaves l
    WHERE l.EmployeeId = @EmployeeId
      AND l.Status = 'Approved'
      AND l.FromDate BETWEEN @StartDate AND @EndDate;
    
    -- Calculate working days (excluding Sundays and holidays)
    SET @WorkingDays = @TotalDays - @Holidays - 
        (SELECT COUNT(*) FROM 
            (SELECT DATEADD(DAY, number, @StartDate) AS DateValue
             FROM master..spt_values
             WHERE type = 'P' AND number <= DATEDIFF(DAY, @StartDate, @EndDate)) AS Dates
         WHERE DATEPART(WEEKDAY, DateValue) = 1); -- Sunday
    
    -- Calculate absent days
    SET @AbsentDays = @WorkingDays - @PresentDays - @LeaveDays;
    IF @AbsentDays < 0 SET @AbsentDays = 0;
    
    -- Return results
    SELECT 
        @WorkingDays AS WorkingDays,
        @PresentDays AS PresentDays,
        @AbsentDays AS AbsentDays,
        @LeaveDays AS LeaveDays,
        @Holidays AS Holidays,
        @TotalDays AS TotalDays;
END
GO

-- Generate Payroll for Employee
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
GO

PRINT 'Payroll stored procedures created successfully!';
GO
