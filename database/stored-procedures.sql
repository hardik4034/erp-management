 -- =============================================
-- HR Management System - Stored Procedures
-- All CRUD operations using stored procedures
-- =============================================

USE HRMS;
GO

-- =============================================
-- EMPLOYEE STORED PROCEDURES
-- =============================================

-- Get All Employees
CREATE OR ALTER PROCEDURE sp_GetAllEmployees
AS
BEGIN
    SELECT 
        e.*,
        d.DepartmentName,
        des.DesignationName,
        m.FirstName + ' ' + m.LastName AS ReportingToName
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN Employees m ON e.ReportingTo = m.EmployeeId
    WHERE e.Status = 'Active'
    ORDER BY e.CreatedAt DESC;
END
GO

-- Get Employee By ID
CREATE OR ALTER PROCEDURE sp_GetEmployeeById
    @EmployeeId INT
AS
BEGIN
    SELECT 
        e.*,
        d.DepartmentName,
        des.DesignationName,
        m.FirstName + ' ' + m.LastName AS ReportingToName
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN Employees m ON e.ReportingTo = m.EmployeeId
    WHERE e.EmployeeId = @EmployeeId;
END
GO

-- Create Employee
CREATE OR ALTER PROCEDURE sp_CreateEmployee
    @EmployeeCode NVARCHAR(20),
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @Email NVARCHAR(255),
    @Phone NVARCHAR(20),
    @DateOfJoining DATE,
    @DepartmentId INT,
    @DesignationId INT,
    @Salutation NVARCHAR(10) = NULL,
    @Password NVARCHAR(255) = NULL,
    @Country NVARCHAR(100) = NULL,
    @Gender NVARCHAR(20) = NULL,
    @DateOfBirth DATE = NULL,
    @ReportingTo INT = NULL,
    @Language NVARCHAR(50) = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @Address NVARCHAR(500) = NULL,
    @About NVARCHAR(1000) = NULL,
    @ProfilePicture NVARCHAR(500) = NULL,
    @LoginAllowed BIT = 1,
    @ReceiveEmailNotifications BIT = 1,
    @Skills NVARCHAR(MAX) = NULL,
    @ProbationEndDate DATE = NULL,
    @NoticePeriodStartDate DATE = NULL,
    @NoticePeriodEndDate DATE = NULL,
    @EmploymentType NVARCHAR(50) = NULL,
    @MaritalStatus NVARCHAR(20) = NULL,
    @BusinessAddress NVARCHAR(500) = NULL
AS
BEGIN
    -- Validate that EmployeeCode is provided
    IF @EmployeeCode IS NULL OR LTRIM(RTRIM(@EmployeeCode)) = ''
    BEGIN
        THROW 50001, 'Employee Code is required and cannot be empty.', 1;
    END
    
    -- Check if EmployeeCode already exists
    IF EXISTS (SELECT 1 FROM Employees WHERE EmployeeCode = @EmployeeCode)
    BEGIN
        THROW 50002, 'Employee Code already exists. Please use a unique Employee Code.', 1;
    END
    
    INSERT INTO Employees (
        EmployeeCode, FirstName, LastName, Email, Phone, DateOfJoining, DepartmentId, DesignationId,
        Salutation, Password, Country, Gender, DateOfBirth, ReportingTo, Language, UserRole,
        Address, About, ProfilePicture, LoginAllowed, ReceiveEmailNotifications,
        Skills, ProbationEndDate, NoticePeriodStartDate, NoticePeriodEndDate,
        EmploymentType, MaritalStatus, BusinessAddress
    )
    VALUES (
        @EmployeeCode, @FirstName, @LastName, @Email, @Phone, @DateOfJoining, @DepartmentId, @DesignationId,
        @Salutation, @Password, @Country, @Gender, @DateOfBirth, @ReportingTo, @Language, @UserRole,
        @Address, @About, @ProfilePicture, @LoginAllowed, @ReceiveEmailNotifications,
        @Skills, @ProbationEndDate, @NoticePeriodStartDate, @NoticePeriodEndDate,
        @EmploymentType, @MaritalStatus, @BusinessAddress
    );
    
    SELECT SCOPE_IDENTITY() AS EmployeeId;
END
GO

-- Update Employee
CREATE OR ALTER PROCEDURE sp_UpdateEmployee
    @EmployeeId INT,
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @Email NVARCHAR(255),
    @Phone NVARCHAR(20),
    @DateOfJoining DATE,
    @DepartmentId INT,
    @DesignationId INT,
    @Salutation NVARCHAR(10) = NULL,
    @Password NVARCHAR(255) = NULL,
    @Country NVARCHAR(100) = NULL,
    @Gender NVARCHAR(20) = NULL,
    @DateOfBirth DATE = NULL,
    @ReportingTo INT = NULL,
    @Language NVARCHAR(50) = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @Address NVARCHAR(500) = NULL,
    @About NVARCHAR(1000) = NULL,
    @ProfilePicture NVARCHAR(500) = NULL,
    @LoginAllowed BIT = 1,
    @ReceiveEmailNotifications BIT = 1,
    @Skills NVARCHAR(MAX) = NULL,
    @ProbationEndDate DATE = NULL,
    @NoticePeriodStartDate DATE = NULL,
    @NoticePeriodEndDate DATE = NULL,
    @EmploymentType NVARCHAR(50) = NULL,
    @MaritalStatus NVARCHAR(20) = NULL,
    @BusinessAddress NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE Employees
    SET FirstName = @FirstName,
        LastName = @LastName,
        Email = @Email,
        Phone = @Phone,
        DateOfJoining = @DateOfJoining,
        DepartmentId = @DepartmentId,
        DesignationId = @DesignationId,
        Salutation = @Salutation,
        Password = ISNULL(@Password, Password), -- Only update password if provided
        Country = @Country,
        Gender = @Gender,
        DateOfBirth = @DateOfBirth,
        ReportingTo = @ReportingTo,
        Language = @Language,
        UserRole = @UserRole,
        Address = @Address,
        About = @About,
        ProfilePicture = @ProfilePicture,
        LoginAllowed = @LoginAllowed,
        ReceiveEmailNotifications = @ReceiveEmailNotifications,
        Skills = @Skills,
        ProbationEndDate = @ProbationEndDate,
        NoticePeriodStartDate = @NoticePeriodStartDate,
        NoticePeriodEndDate = @NoticePeriodEndDate,
        EmploymentType = @EmploymentType,
        MaritalStatus = @MaritalStatus,
        BusinessAddress = @BusinessAddress
    WHERE EmployeeId = @EmployeeId;
END
GO

-- Delete Employee (Soft Delete)
CREATE OR ALTER PROCEDURE sp_DeleteEmployee
    @EmployeeId INT
AS
BEGIN
    UPDATE Employees
    SET Status = 'Inactive'
    WHERE EmployeeId = @EmployeeId;
END
GO

-- =============================================
-- ATTENDANCE STORED PROCEDURES
-- =============================================

-- Get All Attendance
CREATE OR ALTER PROCEDURE sp_GetAllAttendance
    @EmployeeId INT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SELECT 
        a.AttendanceId,
        a.EmployeeId,
        a.AttendanceDate,
        a.Status,
        a.CheckInTime,
        a.CheckOutTime,
        a.Remarks,
        a.CheckInLocation,
        a.CheckOutLocation,
        a.WorkingFrom,
        a.WorkingFromOut,
        a.CreatedAt,
        a.UpdatedAt,
        e.EmployeeCode,
        e.FirstName,
        e.LastName
    FROM Attendance a
    JOIN Employees e ON a.EmployeeId = e.EmployeeId
    WHERE (@EmployeeId IS NULL OR a.EmployeeId = @EmployeeId)
      AND (@FromDate IS NULL OR a.AttendanceDate >= @FromDate)
      AND (@ToDate IS NULL OR a.AttendanceDate <= @ToDate)
    ORDER BY a.AttendanceDate DESC;
END
GO

-- Create Attendance
CREATE OR ALTER PROCEDURE sp_CreateAttendance
    @EmployeeId INT,
    @AttendanceDate DATE,
    @Status NVARCHAR(20),
    @CheckInTime TIME = NULL,
    @CheckOutTime TIME = NULL,
    @Remarks NVARCHAR(500) = NULL,
    @CheckInLocation NVARCHAR(100) = NULL,
    @CheckOutLocation NVARCHAR(100) = NULL,
    @WorkingFrom NVARCHAR(50) = NULL,
    @WorkingFromOut NVARCHAR(50) = NULL,
    @Overwrite BIT = 0
AS
BEGIN
    IF @Overwrite = 1
    BEGIN
        -- Upsert logic
        MERGE Attendance AS target
        USING (SELECT @EmployeeId AS EmployeeId, @AttendanceDate AS AttendanceDate) AS source
        ON (target.EmployeeId = source.EmployeeId AND target.AttendanceDate = source.AttendanceDate)
        WHEN MATCHED THEN
            UPDATE SET 
                Status = @Status,
                CheckInTime = @CheckInTime,
                CheckOutTime = @CheckOutTime,
                Remarks = @Remarks,
                CheckInLocation = @CheckInLocation,
                CheckOutLocation = @CheckOutLocation,
                WorkingFrom = @WorkingFrom,
                WorkingFromOut = @WorkingFromOut,
                UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (EmployeeId, AttendanceDate, Status, CheckInTime, CheckOutTime, Remarks, CheckInLocation, CheckOutLocation, WorkingFrom, WorkingFromOut)
            VALUES (@EmployeeId, @AttendanceDate, @Status, @CheckInTime, @CheckOutTime, @Remarks, @CheckInLocation, @CheckOutLocation, @WorkingFrom, @WorkingFromOut);
            
        -- Get the ID (either updated or inserted)
        SELECT AttendanceId 
        FROM Attendance 
        WHERE EmployeeId = @EmployeeId AND AttendanceDate = @AttendanceDate;
    END
    ELSE
    BEGIN
        -- Standard Insert logic with existence check
        IF EXISTS (SELECT 1 FROM Attendance WHERE EmployeeId = @EmployeeId AND AttendanceDate = @AttendanceDate)
        BEGIN
            THROW 50001, 'Attendance record already exists for this employee and date.', 1;
        END

        INSERT INTO Attendance (EmployeeId, AttendanceDate, Status, CheckInTime, CheckOutTime, Remarks, CheckInLocation, CheckOutLocation, WorkingFrom, WorkingFromOut)
        VALUES (@EmployeeId, @AttendanceDate, @Status, @CheckInTime, @CheckOutTime, @Remarks, @CheckInLocation, @CheckOutLocation, @WorkingFrom, @WorkingFromOut);
        
        SELECT SCOPE_IDENTITY() AS AttendanceId;
    END
END
GO

-- Update Attendance
CREATE OR ALTER PROCEDURE sp_UpdateAttendance
    @AttendanceId INT,
    @Status NVARCHAR(20),
    @CheckInTime TIME = NULL,
    @CheckOutTime TIME = NULL,
    @Remarks NVARCHAR(500) = NULL,
    @CheckInLocation NVARCHAR(100) = NULL,
    @CheckOutLocation NVARCHAR(100) = NULL,
    @WorkingFrom NVARCHAR(50) = NULL,
    @WorkingFromOut NVARCHAR(50) = NULL
AS
BEGIN
    UPDATE Attendance
    SET Status = @Status,
        CheckInTime = @CheckInTime,
        CheckOutTime = @CheckOutTime,
        Remarks = @Remarks,
        CheckInLocation = @CheckInLocation,
        CheckOutLocation = @CheckOutLocation,
        WorkingFrom = @WorkingFrom,
        WorkingFromOut = @WorkingFromOut
    WHERE AttendanceId = @AttendanceId;
END
GO

-- Delete Attendance
CREATE OR ALTER PROCEDURE sp_DeleteAttendance
    @AttendanceId INT
AS
BEGIN
    DELETE FROM Attendance WHERE AttendanceId = @AttendanceId;
END
GO

-- Get Monthly Attendance Report
CREATE OR ALTER PROCEDURE sp_GetMonthlyAttendanceReport
    @Month INT,
    @Year INT,
    @EmployeeId INT = NULL
AS
BEGIN
    SELECT 
        a.AttendanceId,
        a.EmployeeId,
        a.AttendanceDate,
        a.Status,
        a.CheckInTime,
        a.CheckOutTime,
        e.EmployeeCode,
        e.FirstName,
        e.LastName
    FROM Attendance a
    JOIN Employees e ON a.EmployeeId = e.EmployeeId
    WHERE MONTH(a.AttendanceDate) = @Month
      AND YEAR(a.AttendanceDate) = @Year
      AND (@EmployeeId IS NULL OR a.EmployeeId = @EmployeeId)
    ORDER BY a.AttendanceDate DESC;
END
GO

-- =============================================
-- LEAVE STORED PROCEDURES
-- =============================================

-- Get All Leaves
CREATE OR ALTER PROCEDURE sp_GetAllLeaves
    @EmployeeId INT = NULL,
    @Status NVARCHAR(20) = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @RequestingEmployeeId INT = NULL
AS
BEGIN
    -- SECURITY: If Employee role, force filter to requesting employee's data only
    IF @UserRole = 'employee' AND @RequestingEmployeeId IS NOT NULL
    BEGIN
        SET @EmployeeId = @RequestingEmployeeId;
    END

    SELECT 
        l.LeaveId,
        l.EmployeeId,
        l.LeaveTypeId,
        l.FromDate,
        l.ToDate,
        l.Reason,
        l.Status,
        l.ApprovedBy,
        l.ApprovedDate,
        l.RejectionReason,
        l.CreatedAt,
        l.UpdatedAt,
        e.FirstName,
        e.LastName,
        e.EmployeeCode,
        e.ProfilePicture,
        e.DesignationId,
        des.DesignationName,
        lt.TypeName AS LeaveType
    FROM Leaves l
    JOIN Employees e ON l.EmployeeId = e.EmployeeId
    JOIN LeaveTypes lt ON l.LeaveTypeId = lt.LeaveTypeId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    WHERE (@EmployeeId IS NULL OR l.EmployeeId = @EmployeeId)
      AND (@Status IS NULL OR l.Status = @Status)
    ORDER BY l.CreatedAt DESC;
END
GO

-- Get All Leave Types
CREATE OR ALTER PROCEDURE sp_GetAllLeaveTypes
AS
BEGIN
    SELECT * FROM LeaveTypes WHERE Status = 'Active';
END
GO

-- Create Leave
CREATE OR ALTER PROCEDURE sp_CreateLeave
    @EmployeeId INT,
    @LeaveTypeId INT,
    @FromDate DATE,
    @ToDate DATE,
    @Reason NVARCHAR(500)
AS
BEGIN
    INSERT INTO Leaves (EmployeeId, LeaveTypeId, FromDate, ToDate, Reason)
    VALUES (@EmployeeId, @LeaveTypeId, @FromDate, @ToDate, @Reason);
    
    SELECT SCOPE_IDENTITY() AS LeaveId;
END
GO

-- Update Leave Status
CREATE OR ALTER PROCEDURE sp_UpdateLeaveStatus
    @LeaveId INT,
    @Status NVARCHAR(20),
    @ApprovedBy NVARCHAR(100) = NULL,
    @RejectionReason NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE Leaves
    SET Status = @Status,
        ApprovedBy = @ApprovedBy,
        ApprovedDate = CASE WHEN @Status = 'Approved' THEN GETDATE() ELSE NULL END,
        RejectionReason = @RejectionReason
    WHERE LeaveId = @LeaveId;
END
GO

-- Delete Leave
CREATE OR ALTER PROCEDURE sp_DeleteLeave
    @LeaveId INT
AS
BEGIN
    DELETE FROM Leaves WHERE LeaveId = @LeaveId;
END
GO

-- Get Leave Balance
CREATE OR ALTER PROCEDURE sp_GetLeaveBalance
    @EmployeeId INT
AS
BEGIN
    SELECT 
        lt.LeaveTypeId,
        lt.TypeName,
        lt.MaxDaysPerYear,
        lt.MonthlyLimit,
        ISNULL(SUM(CASE 
            WHEN l.Status = 'Approved' 
            THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
            ELSE 0 
        END), 0) AS TotalTaken,
        lt.MaxDaysPerYear - ISNULL(SUM(CASE 
            WHEN l.Status = 'Approved' 
            THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
            ELSE 0 
        END), 0) AS RemainingDays,
        CASE 
            WHEN ISNULL(SUM(CASE 
                WHEN l.Status = 'Approved' 
                THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                ELSE 0 
            END), 0) > lt.MaxDaysPerYear 
            THEN ISNULL(SUM(CASE 
                WHEN l.Status = 'Approved' 
                THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                ELSE 0 
            END), 0) - lt.MaxDaysPerYear
            ELSE 0 
        END AS OverUtilized,
        CASE 
            WHEN lt.MaxDaysPerYear - ISNULL(SUM(CASE 
                WHEN l.Status = 'Approved' 
                THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                ELSE 0 
            END), 0) > 0 
            THEN lt.MaxDaysPerYear - ISNULL(SUM(CASE 
                WHEN l.Status = 'Approved' 
                THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                ELSE 0 
            END), 0)
            ELSE 0 
        END AS UnusedLeaves
    FROM LeaveTypes lt
    LEFT JOIN Leaves l ON lt.LeaveTypeId = l.LeaveTypeId 
        AND l.EmployeeId = @EmployeeId 
        AND l.Status = 'Approved'
        AND YEAR(l.FromDate) = YEAR(GETDATE())
    WHERE lt.Status = 'Active'
    GROUP BY lt.LeaveTypeId, lt.TypeName, lt.MaxDaysPerYear, lt.MonthlyLimit;
END
GO

-- =============================================
-- HOLIDAY STORED PROCEDURES
-- =============================================

-- Get All Holidays
CREATE OR ALTER PROCEDURE sp_GetAllHolidays
    @Year INT = NULL
AS
BEGIN
    SELECT * FROM Holidays
    WHERE (@Year IS NULL OR Year = @Year)
      AND Status = 'Active'
    ORDER BY HolidayDate;
END
GO

-- Create Holiday
CREATE OR ALTER PROCEDURE sp_CreateHoliday
    @HolidayName NVARCHAR(100),
    @HolidayDate DATE,
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    DECLARE @Year INT = YEAR(@HolidayDate);
    
    INSERT INTO Holidays (HolidayName, HolidayDate, Description, Year)
    VALUES (@HolidayName, @HolidayDate, @Description, @Year);
    
    SELECT SCOPE_IDENTITY() AS HolidayId;
END
GO

-- Update Holiday
CREATE OR ALTER PROCEDURE sp_UpdateHoliday
    @HolidayId INT,
    @HolidayName NVARCHAR(100),
    @HolidayDate DATE,
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    DECLARE @Year INT = YEAR(@HolidayDate);
    
    UPDATE Holidays
    SET HolidayName = @HolidayName,
        HolidayDate = @HolidayDate,
        Description = @Description,
        Year = @Year
    WHERE HolidayId = @HolidayId;
END
GO

-- Delete Holiday
CREATE OR ALTER PROCEDURE sp_DeleteHoliday
    @HolidayId INT
AS
BEGIN
    UPDATE Holidays SET Status = 'Inactive' WHERE HolidayId = @HolidayId;
END
GO

-- =============================================
-- DEPARTMENT STORED PROCEDURES
-- =============================================

-- Get All Departments
CREATE OR ALTER PROCEDURE sp_GetAllDepartments
AS
BEGIN
    SELECT 
        d.DepartmentId,
        d.DepartmentName,
        d.Description,
        d.Status,
        d.CreatedAt,
        d.UpdatedAt,
        COUNT(e.EmployeeId) AS EmployeeCount
    FROM Departments d
    LEFT JOIN Employees e ON d.DepartmentId = e.DepartmentId AND e.Status = 'Active'
    WHERE d.Status = 'Active'
    GROUP BY d.DepartmentId, d.DepartmentName, d.Description, d.Status, d.CreatedAt, d.UpdatedAt
    ORDER BY d.DepartmentName;
END
GO

-- Create Department
CREATE OR ALTER PROCEDURE sp_CreateDepartment
    @DepartmentName NVARCHAR(100),
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    INSERT INTO Departments (DepartmentName, Description)
    VALUES (@DepartmentName, @Description);
    
    SELECT SCOPE_IDENTITY() AS DepartmentId;
END
GO

-- Update Department
CREATE OR ALTER PROCEDURE sp_UpdateDepartment
    @DepartmentId INT,
    @DepartmentName NVARCHAR(100),
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE Departments
    SET DepartmentName = @DepartmentName,
        Description = @Description
    WHERE DepartmentId = @DepartmentId;
END
GO

-- Delete Department
CREATE OR ALTER PROCEDURE sp_DeleteDepartment
    @DepartmentId INT
AS
BEGIN
    UPDATE Departments SET Status = 'Inactive' WHERE DepartmentId = @DepartmentId;
END
GO

-- =============================================
-- DESIGNATION STORED PROCEDURES
-- =============================================

-- Get All Designations
CREATE OR ALTER PROCEDURE sp_GetAllDesignations
    @DepartmentId INT = NULL
AS
BEGIN
    SELECT 
        des.DesignationId,
        des.DesignationName,
        des.DepartmentId,
        des.Description,
        des.Status,
        des.CreatedAt,
        des.UpdatedAt,
        d.DepartmentName,
        COUNT(e.EmployeeId) AS EmployeeCount
    FROM Designations des
    JOIN Departments d ON des.DepartmentId = d.DepartmentId
    LEFT JOIN Employees e ON des.DesignationId = e.DesignationId AND e.Status = 'Active'
    WHERE des.Status = 'Active'
      AND (@DepartmentId IS NULL OR des.DepartmentId = @DepartmentId)
    GROUP BY des.DesignationId, des.DesignationName, des.DepartmentId, des.Description, des.Status, des.CreatedAt, des.UpdatedAt, d.DepartmentName
    ORDER BY des.DesignationName;
END
GO

-- Create Designation
CREATE OR ALTER PROCEDURE sp_CreateDesignation
    @DesignationName NVARCHAR(100),
    @DepartmentId INT,
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    INSERT INTO Designations (DesignationName, DepartmentId, Description)
    VALUES (@DesignationName, @DepartmentId, @Description);
    
    SELECT SCOPE_IDENTITY() AS DesignationId;
END
GO

-- Update Designation
CREATE OR ALTER PROCEDURE sp_UpdateDesignation
    @DesignationId INT,
    @DesignationName NVARCHAR(100),
    @DepartmentId INT,
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE Designations
    SET DesignationName = @DesignationName,
        DepartmentId = @DepartmentId,
        Description = @Description
    WHERE DesignationId = @DesignationId;
END
GO

-- Delete Designation
CREATE OR ALTER PROCEDURE sp_DeleteDesignation
    @DesignationId INT
AS
BEGIN
    UPDATE Designations SET Status = 'Inactive' WHERE DesignationId = @DesignationId;
END
GO

-- =============================================
-- APPRECIATION STORED PROCEDURES
-- =============================================

-- Get All Appreciations
CREATE OR ALTER PROCEDURE sp_GetAllAppreciations
    @EmployeeId INT = NULL
AS
BEGIN
    SELECT 
        a.AppreciationId,
        a.EmployeeId,
        a.Title,
        a.Description,
        a.AppreciationDate,
        a.AwardedBy,
        a.Photo,
        a.Status,
        a.CreatedAt,
        a.UpdatedAt,
        e.FirstName,
        e.LastName,
        e.EmployeeCode,
        des.DesignationName,
        a.AwardedBy AS AwardedByName
    FROM Appreciations a
    JOIN Employees e ON a.EmployeeId = e.EmployeeId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    WHERE a.Status = 'Active'
      AND (@EmployeeId IS NULL OR a.EmployeeId = @EmployeeId)
    ORDER BY a.AppreciationDate DESC;
END
GO

-- Create Appreciation
CREATE OR ALTER PROCEDURE sp_CreateAppreciation
    @EmployeeId INT,
    @Title NVARCHAR(200),
    @Description NVARCHAR(1000) = NULL,
    @AppreciationDate DATE,
    @AwardedBy NVARCHAR(100) = NULL,
    @Photo NVARCHAR(500) = NULL
AS
BEGIN
    INSERT INTO Appreciations (EmployeeId, Title, Description, AppreciationDate, AwardedBy, Photo)
    VALUES (@EmployeeId, @Title, @Description, @AppreciationDate, @AwardedBy, @Photo);
    
    SELECT SCOPE_IDENTITY() AS AppreciationId;
END
GO

-- Update Appreciation
CREATE OR ALTER PROCEDURE sp_UpdateAppreciation
    @AppreciationId INT,
    @Title NVARCHAR(200),
    @Description NVARCHAR(1000) = NULL,
    @AppreciationDate DATE,
    @AwardedBy NVARCHAR(100) = NULL,
    @Photo NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE Appreciations
    SET Title = @Title,
        Description = @Description,
        AppreciationDate = @AppreciationDate,
        AwardedBy = @AwardedBy,
        Photo = ISNULL(@Photo, Photo)
    WHERE AppreciationId = @AppreciationId;
END
GO

-- Delete Appreciation
CREATE OR ALTER PROCEDURE sp_DeleteAppreciation
    @AppreciationId INT
AS
BEGIN
    UPDATE Appreciations SET Status = 'Inactive' WHERE AppreciationId = @AppreciationId;
END
GO

-- =============================================
-- Get Attendance Grid (for calendar view)
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAttendanceGrid
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
        d.DepartmentName,
        des.DesignationName
    INTO #TempEmployees
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    WHERE e.Status = 'Active'
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
GO

-- =============================================
-- Bulk Create Attendance
-- =============================================
CREATE OR ALTER PROCEDURE sp_BulkCreateAttendance
    @AttendanceData NVARCHAR(MAX) -- JSON array of attendance records
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @InsertedCount INT = 0;
    DECLARE @ErrorCount INT = 0;
    DECLARE @ErrorMessages NVARCHAR(MAX) = '';

    -- Create temp table for bulk insert
    CREATE TABLE #BulkAttendance (
        EmployeeId INT,
        AttendanceDate DATE,
        Status NVARCHAR(20),
        CheckInTime TIME,
        CheckOutTime TIME,
        Remarks NVARCHAR(500),
        Notes NVARCHAR(1000),
        CheckInLocation NVARCHAR(100),
        CheckOutLocation NVARCHAR(100),
        WorkingFrom NVARCHAR(50),
        WorkingFromOut NVARCHAR(50)
    );

    -- Parse JSON and insert into temp table
    INSERT INTO #BulkAttendance (EmployeeId, AttendanceDate, Status, CheckInTime, CheckOutTime, Remarks, Notes, CheckInLocation, CheckOutLocation, WorkingFrom, WorkingFromOut)
    SELECT 
        EmployeeId,
        AttendanceDate,
        Status,
        CheckInTime,
        CheckOutTime,
        Remarks,
        Notes,
        CheckInLocation,
        CheckOutLocation,
        WorkingFrom,
        WorkingFromOut
    FROM OPENJSON(@AttendanceData)
    WITH (
        EmployeeId INT '$.employeeId',
        AttendanceDate DATE '$.attendanceDate',
        Status NVARCHAR(20) '$.status',
        CheckInTime TIME '$.checkInTime',
        CheckOutTime TIME '$.checkOutTime',
        Remarks NVARCHAR(500) '$.remarks',
        Notes NVARCHAR(1000) '$.notes',
        CheckInLocation NVARCHAR(100) '$.checkInLocation',
        CheckOutLocation NVARCHAR(100) '$.checkOutLocation',
        WorkingFrom NVARCHAR(50) '$.workingFrom',
        WorkingFromOut NVARCHAR(50) '$.workingFromOut'
    );

    -- Insert records, handling duplicates
    BEGIN TRY
        MERGE Attendance AS target
        USING #BulkAttendance AS source
        ON target.EmployeeId = source.EmployeeId AND target.AttendanceDate = source.AttendanceDate
        WHEN MATCHED THEN
            UPDATE SET 
                Status = source.Status,
                CheckInTime = source.CheckInTime,
                CheckOutTime = source.CheckOutTime,
                Remarks = source.Remarks,
                Notes = source.Notes,
                CheckInLocation = source.CheckInLocation,
                CheckOutLocation = source.CheckOutLocation,
                WorkingFrom = source.WorkingFrom,
                WorkingFromOut = source.WorkingFromOut,
                UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (EmployeeId, AttendanceDate, Status, CheckInTime, CheckOutTime, Remarks, Notes, CheckInLocation, CheckOutLocation, WorkingFrom, WorkingFromOut)
            VALUES (source.EmployeeId, source.AttendanceDate, source.Status, source.CheckInTime, source.CheckOutTime, source.Remarks, source.Notes, source.CheckInLocation, source.CheckOutLocation, source.WorkingFrom, source.WorkingFromOut);

        SET @InsertedCount = @@ROWCOUNT;
    END TRY
    BEGIN CATCH
        SET @ErrorCount = 1;
        SET @ErrorMessages = ERROR_MESSAGE();
    END CATCH

    -- Return summary
    SELECT 
        @InsertedCount AS InsertedCount,
        @ErrorCount AS ErrorCount,
        @ErrorMessages AS ErrorMessages;

    DROP TABLE #BulkAttendance;
END
GO

-- =============================================
-- Export Attendance Data
-- =============================================
CREATE OR ALTER PROCEDURE sp_ExportAttendance
    @FromDate DATE,
    @ToDate DATE,
    @EmployeeId INT = NULL
AS
BEGIN
    SELECT 
        e.EmployeeCode,
        e.FirstName + ' ' + e.LastName AS EmployeeName,
        a.AttendanceDate,
        a.Status,
        ISNULL(CONVERT(VARCHAR(5), a.CheckInTime, 108), '') AS CheckInTime,
        ISNULL(CONVERT(VARCHAR(5), a.CheckOutTime, 108), '') AS CheckOutTime,
        ISNULL(a.Remarks, '') AS Remarks,
        ISNULL(a.Notes, '') AS Notes,
        d.DepartmentName,
        des.DesignationName
    FROM Attendance a
    JOIN Employees e ON a.EmployeeId = e.EmployeeId
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    WHERE a.AttendanceDate BETWEEN @FromDate AND @ToDate
      AND (@EmployeeId IS NULL OR a.EmployeeId = @EmployeeId)
    ORDER BY a.AttendanceDate DESC, e.FirstName, e.LastName;
END
GO

PRINT 'All stored procedures created successfully!';
GO
