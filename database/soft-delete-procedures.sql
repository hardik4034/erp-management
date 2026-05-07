-- =============================================
-- Soft Delete Stored Procedures
-- HRMS Database — Run after soft-delete-migration.sql
-- =============================================
USE HRMS;
GO

-- ============================================================
-- EMPLOYEES
-- ============================================================

-- sp_GetAllEmployees (updated — add pagination and search)
IF OBJECT_ID('sp_GetAllEmployees', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllEmployees;
GO
CREATE PROCEDURE sp_GetAllEmployees
    @ShowDeleted BIT = 0,
    @PageNumber  INT = 1,
    @PageSize    INT = 50,
    @SearchTerm  NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    -- 1. Get Total Count (for pagination)
    SELECT COUNT(*) AS TotalCount
    FROM Employees e
    WHERE (@ShowDeleted = 1 OR e.IsDeleted = 0)
      AND (@SearchTerm IS NULL 
           OR (e.FirstName + ' ' + e.LastName LIKE '%' + @SearchTerm + '%') 
           OR e.EmployeeCode LIKE '%' + @SearchTerm + '%'
           OR e.Email LIKE '%' + @SearchTerm + '%');
    
    -- 2. Get Paginated Data
    SELECT
        e.EmployeeId, e.EmployeeCode, e.FirstName, e.LastName, e.Email, e.Phone,
        e.DateOfJoining, e.DepartmentId, e.DesignationId, e.Salutation,
        e.Country, e.Gender, e.DateOfBirth, e.ReportingTo, e.Language, e.UserRole,
        e.Address, e.ProfilePicture, e.LoginAllowed, e.ReceiveEmailNotifications,
        e.Skills, e.ProbationEndDate, e.NoticePeriodStartDate, e.NoticePeriodEndDate,
        e.EmploymentType, e.MaritalStatus, e.BusinessAddress, e.Status,
        e.CreatedAt, e.UpdatedAt,
        e.IsDeleted, e.DeletedAt, e.DeletedBy, e.DeleteReason,
        d.DepartmentName, des.DesignationName,
        CONCAT(mgr.FirstName, ' ', mgr.LastName) AS ReportingToName
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN Employees mgr ON e.ReportingTo = mgr.EmployeeId
    WHERE (@ShowDeleted = 1 OR e.IsDeleted = 0)
      AND (@SearchTerm IS NULL 
           OR (e.FirstName + ' ' + e.LastName LIKE '%' + @SearchTerm + '%') 
           OR e.EmployeeCode LIKE '%' + @SearchTerm + '%'
           OR e.Email LIKE '%' + @SearchTerm + '%')
    ORDER BY e.CreatedAt DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- sp_SoftDeleteEmployee
IF OBJECT_ID('sp_SoftDeleteEmployee', 'P') IS NOT NULL DROP PROCEDURE sp_SoftDeleteEmployee;
GO
CREATE PROCEDURE sp_SoftDeleteEmployee
    @EmployeeId INT,
    @DeletedBy  NVARCHAR(100),
    @DeleteReason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Employees
    SET IsDeleted = 1,
        DeletedAt = GETDATE(),
        DeletedBy = @DeletedBy,
        DeleteReason = @DeleteReason,
        UpdatedAt = GETDATE()
    WHERE EmployeeId = @EmployeeId AND IsDeleted = 0;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- sp_RestoreEmployee
IF OBJECT_ID('sp_RestoreEmployee', 'P') IS NOT NULL DROP PROCEDURE sp_RestoreEmployee;
GO
CREATE PROCEDURE sp_RestoreEmployee
    @EmployeeId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Employees
    SET IsDeleted = 0,
        DeletedAt = NULL,
        DeletedBy = NULL,
        DeleteReason = NULL,
        UpdatedAt = GETDATE()
    WHERE EmployeeId = @EmployeeId AND IsDeleted = 1;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- sp_HardDeleteEmployee
IF OBJECT_ID('sp_HardDeleteEmployee', 'P') IS NOT NULL DROP PROCEDURE sp_HardDeleteEmployee;
GO
CREATE PROCEDURE sp_HardDeleteEmployee
    @EmployeeId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Employees WHERE EmployeeId = @EmployeeId;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- ============================================================
-- DEPARTMENTS
-- ============================================================

IF OBJECT_ID('sp_GetAllDepartments', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllDepartments;
GO
CREATE PROCEDURE sp_GetAllDepartments
    @ShowDeleted BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        d.DepartmentId, d.DepartmentName, d.Description, d.Status,
        d.CreatedAt, d.UpdatedAt,
        d.IsDeleted, d.DeletedAt, d.DeletedBy, d.DeleteReason,
        COUNT(e.EmployeeId) AS EmployeeCount
    FROM Departments d
    LEFT JOIN Employees e ON d.DepartmentId = e.DepartmentId AND e.IsDeleted = 0
    WHERE (@ShowDeleted = 1 OR d.IsDeleted = 0)
    GROUP BY d.DepartmentId, d.DepartmentName, d.Description, d.Status,
             d.CreatedAt, d.UpdatedAt, d.IsDeleted, d.DeletedAt, d.DeletedBy, d.DeleteReason
    ORDER BY d.DepartmentName;
END
GO

IF OBJECT_ID('sp_SoftDeleteDepartment', 'P') IS NOT NULL DROP PROCEDURE sp_SoftDeleteDepartment;
GO
CREATE PROCEDURE sp_SoftDeleteDepartment
    @DepartmentId INT,
    @DeletedBy    NVARCHAR(100),
    @DeleteReason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Departments
    SET IsDeleted = 1,
        DeletedAt = GETDATE(),
        DeletedBy = @DeletedBy,
        DeleteReason = @DeleteReason,
        UpdatedAt = GETDATE()
    WHERE DepartmentId = @DepartmentId AND IsDeleted = 0;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_RestoreDepartment', 'P') IS NOT NULL DROP PROCEDURE sp_RestoreDepartment;
GO
CREATE PROCEDURE sp_RestoreDepartment
    @DepartmentId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Departments
    SET IsDeleted = 0,
        DeletedAt = NULL,
        DeletedBy = NULL,
        DeleteReason = NULL,
        UpdatedAt = GETDATE()
    WHERE DepartmentId = @DepartmentId AND IsDeleted = 1;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_HardDeleteDepartment', 'P') IS NOT NULL DROP PROCEDURE sp_HardDeleteDepartment;
GO
CREATE PROCEDURE sp_HardDeleteDepartment
    @DepartmentId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Departments WHERE DepartmentId = @DepartmentId;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- ============================================================
-- DESIGNATIONS
-- ============================================================

IF OBJECT_ID('sp_GetAllDesignations', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllDesignations;
GO
CREATE PROCEDURE sp_GetAllDesignations
    @DepartmentId INT = NULL,
    @ShowDeleted  BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        des.DesignationId, des.DesignationName, des.DepartmentId,
        des.Description, des.Status, des.CreatedAt, des.UpdatedAt,
        des.IsDeleted, des.DeletedAt, des.DeletedBy, des.DeleteReason,
        d.DepartmentName
    FROM Designations des
    LEFT JOIN Departments d ON des.DepartmentId = d.DepartmentId
    WHERE (@DepartmentId IS NULL OR des.DepartmentId = @DepartmentId)
      AND (@ShowDeleted = 1 OR des.IsDeleted = 0)
    ORDER BY des.DesignationName;
END
GO

IF OBJECT_ID('sp_SoftDeleteDesignation', 'P') IS NOT NULL DROP PROCEDURE sp_SoftDeleteDesignation;
GO
CREATE PROCEDURE sp_SoftDeleteDesignation
    @DesignationId INT,
    @DeletedBy     NVARCHAR(100),
    @DeleteReason  NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Designations
    SET IsDeleted = 1,
        DeletedAt = GETDATE(),
        DeletedBy = @DeletedBy,
        DeleteReason = @DeleteReason,
        UpdatedAt = GETDATE()
    WHERE DesignationId = @DesignationId AND IsDeleted = 0;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_RestoreDesignation', 'P') IS NOT NULL DROP PROCEDURE sp_RestoreDesignation;
GO
CREATE PROCEDURE sp_RestoreDesignation
    @DesignationId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Designations
    SET IsDeleted = 0,
        DeletedAt = NULL,
        DeletedBy = NULL,
        DeleteReason = NULL,
        UpdatedAt = GETDATE()
    WHERE DesignationId = @DesignationId AND IsDeleted = 1;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_HardDeleteDesignation', 'P') IS NOT NULL DROP PROCEDURE sp_HardDeleteDesignation;
GO
CREATE PROCEDURE sp_HardDeleteDesignation
    @DesignationId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Designations WHERE DesignationId = @DesignationId;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- ============================================================
-- HOLIDAYS
-- ============================================================

IF OBJECT_ID('sp_GetAllHolidays', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllHolidays;
GO
CREATE PROCEDURE sp_GetAllHolidays
    @Year        INT = NULL,
    @ShowDeleted BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        HolidayId, HolidayName, HolidayDate, Description, Year, Status,
        CreatedAt, UpdatedAt,
        IsDeleted, DeletedAt, DeletedBy, DeleteReason
    FROM Holidays
    WHERE (@Year IS NULL OR Year = @Year)
      AND (@ShowDeleted = 1 OR IsDeleted = 0)
    ORDER BY HolidayDate;
END
GO

IF OBJECT_ID('sp_SoftDeleteHoliday', 'P') IS NOT NULL DROP PROCEDURE sp_SoftDeleteHoliday;
GO
CREATE PROCEDURE sp_SoftDeleteHoliday
    @HolidayId    INT,
    @DeletedBy    NVARCHAR(100),
    @DeleteReason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Holidays
    SET IsDeleted = 1,
        DeletedAt = GETDATE(),
        DeletedBy = @DeletedBy,
        DeleteReason = @DeleteReason,
        UpdatedAt = GETDATE()
    WHERE HolidayId = @HolidayId AND IsDeleted = 0;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_RestoreHoliday', 'P') IS NOT NULL DROP PROCEDURE sp_RestoreHoliday;
GO
CREATE PROCEDURE sp_RestoreHoliday
    @HolidayId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Holidays
    SET IsDeleted = 0,
        DeletedAt = NULL,
        DeletedBy = NULL,
        DeleteReason = NULL,
        UpdatedAt = GETDATE()
    WHERE HolidayId = @HolidayId AND IsDeleted = 1;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_HardDeleteHoliday', 'P') IS NOT NULL DROP PROCEDURE sp_HardDeleteHoliday;
GO
CREATE PROCEDURE sp_HardDeleteHoliday
    @HolidayId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Holidays WHERE HolidayId = @HolidayId;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- ============================================================
-- LEAVES
-- ============================================================

-- Drop & recreate sp_GetAllLeaves with IsDeleted support
IF OBJECT_ID('sp_GetAllLeaves', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllLeaves;
GO
CREATE PROCEDURE sp_GetAllLeaves
    @EmployeeId          INT = NULL,
    @Status              NVARCHAR(20) = NULL,
    @UserRole            NVARCHAR(50) = NULL,
    @RequestingEmployeeId INT = NULL,
    @ShowDeleted         BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        l.LeaveId, l.EmployeeId, l.LeaveTypeId, l.FromDate, l.ToDate,
        l.Reason, l.Status, l.ApprovedBy, l.ApprovedDate, l.RejectionReason,
        l.CreatedAt, l.UpdatedAt,
        l.IsDeleted, l.DeletedAt, l.DeletedBy, l.DeleteReason,
        lt.TypeName AS LeaveTypeName,
        CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
        e.EmployeeCode
    FROM Leaves l
    INNER JOIN LeaveTypes lt ON l.LeaveTypeId = lt.LeaveTypeId
    INNER JOIN Employees e ON l.EmployeeId = e.EmployeeId
    WHERE (@EmployeeId IS NULL OR l.EmployeeId = @EmployeeId)
      AND (@Status IS NULL OR l.Status = @Status)
      AND (@ShowDeleted = 1 OR l.IsDeleted = 0)
    ORDER BY l.CreatedAt DESC;
END
GO

IF OBJECT_ID('sp_SoftDeleteLeave', 'P') IS NOT NULL DROP PROCEDURE sp_SoftDeleteLeave;
GO
CREATE PROCEDURE sp_SoftDeleteLeave
    @LeaveId      INT,
    @DeletedBy    NVARCHAR(100),
    @DeleteReason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Leaves
    SET IsDeleted = 1,
        DeletedAt = GETDATE(),
        DeletedBy = @DeletedBy,
        DeleteReason = @DeleteReason,
        UpdatedAt = GETDATE()
    WHERE LeaveId = @LeaveId AND IsDeleted = 0;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_RestoreLeave', 'P') IS NOT NULL DROP PROCEDURE sp_RestoreLeave;
GO
CREATE PROCEDURE sp_RestoreLeave
    @LeaveId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Leaves
    SET IsDeleted = 0,
        DeletedAt = NULL,
        DeletedBy = NULL,
        DeleteReason = NULL,
        UpdatedAt = GETDATE()
    WHERE LeaveId = @LeaveId AND IsDeleted = 1;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_HardDeleteLeave', 'P') IS NOT NULL DROP PROCEDURE sp_HardDeleteLeave;
GO
CREATE PROCEDURE sp_HardDeleteLeave
    @LeaveId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Leaves WHERE LeaveId = @LeaveId;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- ============================================================
-- APPRECIATIONS
-- ============================================================

IF OBJECT_ID('sp_GetAllAppreciations', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllAppreciations;
GO
CREATE PROCEDURE sp_GetAllAppreciations
    @EmployeeId  INT = NULL,
    @ShowDeleted BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        a.AppreciationId, a.EmployeeId, a.Title, a.Description,
        a.AppreciationDate, a.AwardedBy, a.Status, a.CreatedAt, a.UpdatedAt,
        a.IsDeleted, a.DeletedAt, a.DeletedBy, a.DeleteReason,
        CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName
    FROM Appreciations a
    INNER JOIN Employees e ON a.EmployeeId = e.EmployeeId
    WHERE (@EmployeeId IS NULL OR a.EmployeeId = @EmployeeId)
      AND (@ShowDeleted = 1 OR a.IsDeleted = 0)
    ORDER BY a.AppreciationDate DESC;
END
GO

IF OBJECT_ID('sp_SoftDeleteAppreciation', 'P') IS NOT NULL DROP PROCEDURE sp_SoftDeleteAppreciation;
GO
CREATE PROCEDURE sp_SoftDeleteAppreciation
    @AppreciationId INT,
    @DeletedBy      NVARCHAR(100),
    @DeleteReason   NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Appreciations
    SET IsDeleted = 1,
        DeletedAt = GETDATE(),
        DeletedBy = @DeletedBy,
        DeleteReason = @DeleteReason,
        UpdatedAt = GETDATE()
    WHERE AppreciationId = @AppreciationId AND IsDeleted = 0;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_RestoreAppreciation', 'P') IS NOT NULL DROP PROCEDURE sp_RestoreAppreciation;
GO
CREATE PROCEDURE sp_RestoreAppreciation
    @AppreciationId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Appreciations
    SET IsDeleted = 0,
        DeletedAt = NULL,
        DeletedBy = NULL,
        DeleteReason = NULL,
        UpdatedAt = GETDATE()
    WHERE AppreciationId = @AppreciationId AND IsDeleted = 1;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

IF OBJECT_ID('sp_HardDeleteAppreciation', 'P') IS NOT NULL DROP PROCEDURE sp_HardDeleteAppreciation;
GO
CREATE PROCEDURE sp_HardDeleteAppreciation
    @AppreciationId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Appreciations WHERE AppreciationId = @AppreciationId;
    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

PRINT '✅ Soft-delete stored procedures created successfully!';
