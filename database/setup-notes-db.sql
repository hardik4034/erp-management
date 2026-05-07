-- =============================================
-- Create Notes Table
-- =============================================
IF OBJECT_ID('Notes', 'U') IS NOT NULL
    DROP TABLE Notes;
GO

CREATE TABLE Notes (
    NoteId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    NoteType NVARCHAR(50) NOT NULL, -- General, Warning, Appreciation, Performance, Salary Discussion, Disciplinary Action
    WarningType NVARCHAR(50) NULL, -- Verbal Warning, Written Warning, Final Warning
    Description NVARCHAR(MAX) NOT NULL,
    Visibility NVARCHAR(50) NOT NULL, -- HR Only, HR + Manager, HR + Employee, All
    NoteDate DATE DEFAULT CAST(GETDATE() AS DATE),
    AddedBy INT NULL, -- Link to Employee (User)
    Attachment NVARCHAR(500) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Notes_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
    CONSTRAINT FK_Notes_AddedBy FOREIGN KEY (AddedBy) REFERENCES Employees(EmployeeId)
);
GO

-- =============================================
-- Stored Procedure: sp_GetAllNotes
-- =============================================
IF OBJECT_ID('sp_GetAllNotes', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetAllNotes;
GO

CREATE PROCEDURE sp_GetAllNotes
    @RequesterRole NVARCHAR(50),
    @RequesterId INT,
    @EmployeeId INT = NULL,
    @NoteType NVARCHAR(50) = NULL,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        n.NoteId,
        n.EmployeeId,
        e.FirstName + ' ' + e.LastName AS EmployeeName,
        n.NoteType,
        n.WarningType,
        n.Description,
        n.Visibility,
        n.NoteDate,
        n.AddedBy,
        ab.FirstName + ' ' + ab.LastName AS AddedByName,
        n.Attachment,
        n.CreatedAt
    FROM Notes n
    INNER JOIN Employees e ON n.EmployeeId = e.EmployeeId
    LEFT JOIN Employees ab ON n.AddedBy = ab.EmployeeId
    WHERE 
        -- Filters
        (@EmployeeId IS NULL OR n.EmployeeId = @EmployeeId)
        AND (@NoteType IS NULL OR n.NoteType = @NoteType)
        AND (@StartDate IS NULL OR n.NoteDate >= @StartDate)
        AND (@EndDate IS NULL OR n.NoteDate <= @EndDate)
        -- RBAC
        AND (
            @RequesterRole IN ('admin', 'hr') -- Admin/HR see everything
            OR (@RequesterRole = 'manager' AND e.ReportingTo = @RequesterId) -- Managers see subordinates
            OR (n.EmployeeId = @RequesterId AND n.Visibility IN ('HR + Employee', 'All')) -- Employees see own (limited visibility)
        )
    ORDER BY n.NoteDate DESC, n.CreatedAt DESC;
END
GO

-- =============================================
-- Stored Procedure: sp_CreateNote
-- =============================================
IF OBJECT_ID('sp_CreateNote', 'P') IS NOT NULL
    DROP PROCEDURE sp_CreateNote;
GO

CREATE PROCEDURE sp_CreateNote
    @EmployeeId INT,
    @NoteType NVARCHAR(50),
    @WarningType NVARCHAR(50) = NULL,
    @Description NVARCHAR(MAX),
    @AddedBy INT = NULL,
    @Attachment NVARCHAR(500) = NULL,
    @NoteDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Visibility NVARCHAR(50);
    
    -- Auto Visibility Logic
    IF @NoteType IN ('General', 'Appreciation', 'Performance', 'Warning')
        SET @Visibility = 'HR + Employee';
    ELSE IF @NoteType IN ('Salary Discussion', 'Disciplinary Action')
        SET @Visibility = 'HR Only';
    ELSE
        SET @Visibility = 'HR Only'; -- Default

    INSERT INTO Notes (EmployeeId, NoteType, WarningType, Description, Visibility, AddedBy, Attachment, NoteDate, CreatedAt, UpdatedAt)
    VALUES (
        @EmployeeId, 
        @NoteType, 
        @WarningType, 
        @Description, 
        @Visibility, 
        @AddedBy, 
        @Attachment, 
        ISNULL(@NoteDate, CAST(GETDATE() AS DATE)), 
        GETDATE(), 
        GETDATE()
    );

    SELECT SCOPE_IDENTITY() AS NoteId;
END
GO

-- =============================================
-- Stored Procedure: sp_GetNotesSummary
-- =============================================
IF OBJECT_ID('sp_GetNotesSummary', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetNotesSummary;
GO

CREATE PROCEDURE sp_GetNotesSummary
    @RequesterRole NVARCHAR(50),
    @RequesterId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        COUNT(*) AS TotalNotes,
        SUM(CASE WHEN NoteType = 'Warning' THEN 1 ELSE 0 END) AS TotalWarnings,
        SUM(CASE WHEN NoteType = 'Appreciation' THEN 1 ELSE 0 END) AS TotalAppreciations,
        SUM(CASE WHEN NoteType = 'Disciplinary Action' THEN 1 ELSE 0 END) AS TotalDisciplinaryActions
    FROM Notes n
    INNER JOIN Employees e ON n.EmployeeId = e.EmployeeId
    WHERE (
            @RequesterRole IN ('admin', 'hr')
            OR (@RequesterRole = 'manager' AND e.ReportingTo = @RequesterId)
            OR (n.EmployeeId = @RequesterId AND n.Visibility IN ('HR + Employee', 'All'))
    );
END
GO
