-- Add new columns to Employees table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'Salutation')
BEGIN
    ALTER TABLE Employees ADD 
        Salutation NVARCHAR(10),
        Password NVARCHAR(255),
        Country NVARCHAR(100),
        Gender NVARCHAR(20),
        DateOfBirth DATE,
        ReportingTo INT,
        Language NVARCHAR(50),
        UserRole NVARCHAR(50),
        Address NVARCHAR(500),
        About NVARCHAR(1000),
        ProfilePicture NVARCHAR(500),
        LoginAllowed BIT DEFAULT 1,
        ReceiveEmailNotifications BIT DEFAULT 1,
        HourlyRate DECIMAL(18, 2),
        SlackMemberId NVARCHAR(50),
        Skills NVARCHAR(MAX),
        ProbationEndDate DATE,
        NoticePeriodStartDate DATE,
        NoticePeriodEndDate DATE,
        EmploymentType NVARCHAR(50),
        MaritalStatus NVARCHAR(20),
        BusinessAddress NVARCHAR(500);

    ALTER TABLE Employees ADD CONSTRAINT FK_Employees_ReportingTo FOREIGN KEY (ReportingTo) REFERENCES Employees(EmployeeId);
END
GO

-- Update sp_GetAllEmployees
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

-- Update sp_GetEmployeeById
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

-- Update sp_CreateEmployee
CREATE OR ALTER PROCEDURE sp_CreateEmployee
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
    DECLARE @EmployeeCode NVARCHAR(20);
    SET @EmployeeCode = dbo.GenerateEmployeeCode();
    
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

-- Update sp_UpdateEmployee
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
        HourlyRate = @HourlyRate,
        SlackMemberId = @SlackMemberId,
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

-- Add new columns to Appreciations table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Appreciations') AND name = 'Photo')
BEGIN
    ALTER TABLE Appreciations ADD 
        Photo NVARCHAR(500);
END
GO
