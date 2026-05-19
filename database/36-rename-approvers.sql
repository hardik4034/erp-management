-- SQL Migration Script: Rename Approver Fields and Simplify
USE HRMS;
GO

-- 1. Rename ExpenseApprover to AttendanceApprover if it exists
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'ExpenseApprover')
AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'AttendanceApprover')
BEGIN
    EXEC sp_rename 'Employees.ExpenseApprover', 'AttendanceApprover', 'COLUMN';
END
GO

-- 2. Add AttendanceApprover if it doesn't exist at all (and ExpenseApprover is gone)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'AttendanceApprover')
BEGIN
    ALTER TABLE Employees ADD AttendanceApprover NVARCHAR(255);
END
GO

-- 3. Update Stored Procedures to only use AttendanceApprover and LeaveApprover

CREATE OR ALTER PROCEDURE sp_CreateEmployee
    @EmployeeCode NVARCHAR(20),
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @Email NVARCHAR(255),
    @Phone NVARCHAR(20),
    @DateOfJoining DATE,
    @DepartmentId INT = NULL,
    @DesignationId INT = NULL,
    @Salutation NVARCHAR(10) = NULL,
    @Password NVARCHAR(255) = NULL,
    @Country NVARCHAR(100) = NULL,
    @Gender NVARCHAR(20) = NULL,
    @DateOfBirth DATE = NULL,
    @ReportingTo INT = NULL,
    @Language NVARCHAR(50) = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @PermanentAddress NVARCHAR(500) = NULL,
    @TemporaryAddress NVARCHAR(500) = NULL,
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
    @BusinessAddress NVARCHAR(500) = NULL,
    @AttendanceApprover NVARCHAR(255) = NULL,
    @LeaveApprover NVARCHAR(255) = NULL
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
        PermanentAddress, TemporaryAddress, About, ProfilePicture, LoginAllowed, ReceiveEmailNotifications,
        Skills, ProbationEndDate, NoticePeriodStartDate, NoticePeriodEndDate,
        EmploymentType, MaritalStatus, BusinessAddress, Address,
        AttendanceApprover, LeaveApprover
    )
    VALUES (
        @EmployeeCode, @FirstName, @LastName, @Email, @Phone, @DateOfJoining, @DepartmentId, @DesignationId,
        @Salutation, @Password, @Country, @Gender, @DateOfBirth, @ReportingTo, @Language, @UserRole,
        @PermanentAddress, @TemporaryAddress, @About, @ProfilePicture, @LoginAllowed, @ReceiveEmailNotifications,
        @Skills, @ProbationEndDate, @NoticePeriodStartDate, @NoticePeriodEndDate,
        @EmploymentType, @MaritalStatus, @BusinessAddress, @PermanentAddress,
        @AttendanceApprover, @LeaveApprover
    );
    
    SELECT SCOPE_IDENTITY() AS EmployeeId;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateEmployee
    @EmployeeId INT,
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @Email NVARCHAR(255),
    @Phone NVARCHAR(20),
    @DateOfJoining DATE,
    @DepartmentId INT = NULL,
    @DesignationId INT = NULL,
    @Salutation NVARCHAR(10) = NULL,
    @Password NVARCHAR(255) = NULL,
    @Country NVARCHAR(100) = NULL,
    @Gender NVARCHAR(20) = NULL,
    @DateOfBirth DATE = NULL,
    @ReportingTo INT = NULL,
    @Language NVARCHAR(50) = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @PermanentAddress NVARCHAR(500) = NULL,
    @TemporaryAddress NVARCHAR(500) = NULL,
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
    @BusinessAddress NVARCHAR(500) = NULL,
    @AttendanceApprover NVARCHAR(255) = NULL,
    @LeaveApprover NVARCHAR(255) = NULL
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
        Password = ISNULL(@Password, Password),
        Country = @Country,
        Gender = @Gender,
        DateOfBirth = @DateOfBirth,
        ReportingTo = @ReportingTo,
        Language = @Language,
        UserRole = @UserRole,
        PermanentAddress = @PermanentAddress,
        TemporaryAddress = @TemporaryAddress,
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
        BusinessAddress = @BusinessAddress,
        Address = @PermanentAddress,
        AttendanceApprover = @AttendanceApprover,
        LeaveApprover = @LeaveApprover
    WHERE EmployeeId = @EmployeeId;
END
GO
