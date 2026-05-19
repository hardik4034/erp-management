-- Drop existing procedure if it exists
IF OBJECT_ID('sp_GetAllEmployees', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetAllEmployees;
GO

-- Create sp_GetAllEmployees
CREATE PROCEDURE sp_GetAllEmployees
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.EmployeeId,
        e.EmployeeCode,
        e.FirstName,
        e.LastName,
        e.Email,
        e.Phone,
        e.DateOfJoining,
        e.DepartmentId,
        d.DepartmentName,
        e.DesignationId,
        des.DesignationName AS Designation,
        e.ReportingTo,
        CASE 
            WHEN r.FirstName IS NOT NULL 
            THEN r.FirstName + ' ' + r.LastName 
            ELSE NULL 
        END AS ReportingToName,
        e.Status,
        e.ProfilePicture
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN Employees r ON e.ReportingTo = r.EmployeeId
    WHERE e.IsDeleted = 0
    ORDER BY e.FirstName, e.LastName;
END
GO

-- Drop existing procedure if it exists
IF OBJECT_ID('sp_GetAllNotes', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetAllNotes;
GO

-- Create sp_GetAllNotes
CREATE PROCEDURE sp_GetAllNotes
    @EmployeeId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        n.NoteId,
        n.EmployeeId,
        n.Title,
        n.Description,
        n.CreatedAt,
        e.FirstName,
        e.LastName,
        des.DesignationName AS Designation
    FROM Notes n
    INNER JOIN Employees e ON n.EmployeeId = e.EmployeeId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    WHERE (@EmployeeId IS NULL OR n.EmployeeId = @EmployeeId)
    ORDER BY n.CreatedAt DESC;
END
GO

-- Drop existing procedure if it exists
IF OBJECT_ID('sp_CreateNote', 'P') IS NOT NULL
    DROP PROCEDURE sp_CreateNote;
GO

-- Create sp_CreateNote
CREATE PROCEDURE sp_CreateNote
    @EmployeeId INT,
    @Title NVARCHAR(100),
    @Description NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Notes (EmployeeId, Title, Description, CreatedAt)
    VALUES (@EmployeeId, @Title, @Description, GETDATE());

    SELECT SCOPE_IDENTITY() AS NoteId;
END
GO

-- Drop existing procedure if it exists
IF OBJECT_ID('sp_DeleteNote', 'P') IS NOT NULL
    DROP PROCEDURE sp_DeleteNote;
GO

-- Create sp_DeleteNote
CREATE PROCEDURE sp_DeleteNote
    @NoteId INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM Notes WHERE NoteId = @NoteId;
    
    SELECT @@ROWCOUNT AS RowsAffected;
END
GO
