-- =============================================
-- Update sp_CreateEmployee to Accept Manual Employee Code
-- Run this script to update the stored procedure
-- =============================================

USE HRMS;
GO

-- Create Employee (Updated to accept manual Employee Code)
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
    @HourlyRate DECIMAL(18, 2) = NULL,
    @SlackMemberId NVARCHAR(50) = NULL,
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
        Address, About, ProfilePicture, LoginAllowed, ReceiveEmailNotifications, HourlyRate,
        SlackMemberId, Skills, ProbationEndDate, NoticePeriodStartDate, NoticePeriodEndDate,
        EmploymentType, MaritalStatus, BusinessAddress
    )
    VALUES (
        @EmployeeCode, @FirstName, @LastName, @Email, @Phone, @DateOfJoining, @DepartmentId, @DesignationId,
        @Salutation, @Password, @Country, @Gender, @DateOfBirth, @ReportingTo, @Language, @UserRole,
        @Address, @About, @ProfilePicture, @LoginAllowed, @ReceiveEmailNotifications, @HourlyRate,
        @SlackMemberId, @Skills, @ProbationEndDate, @NoticePeriodStartDate, @NoticePeriodEndDate,
        @EmploymentType, @MaritalStatus, @BusinessAddress
    );
    
    SELECT SCOPE_IDENTITY() AS EmployeeId;
END
GO

PRINT 'Stored procedure sp_CreateEmployee updated successfully!';
PRINT 'Employee Code is now a required parameter and will be validated for uniqueness.';
GO
