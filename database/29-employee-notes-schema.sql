-- =============================================
-- Employee Notes Database Script
-- =============================================

-- Drop Procedures if they exist
IF OBJECT_ID('sp_CreateEmployeeNote', 'P') IS NOT NULL DROP PROCEDURE sp_CreateEmployeeNote;
IF OBJECT_ID('sp_UpdateEmployeeNote', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateEmployeeNote;
IF OBJECT_ID('sp_GetEmployeeNotes', 'P') IS NOT NULL DROP PROCEDURE sp_GetEmployeeNotes;
IF OBJECT_ID('sp_DeleteEmployeeNote', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteEmployeeNote;
GO

-- Drop Tables if they exist (Reverse Order of Dependencies)
IF OBJECT_ID('EmployeeNotesHistory', 'U') IS NOT NULL DROP TABLE EmployeeNotesHistory;
IF OBJECT_ID('EmployeeNotes', 'U') IS NOT NULL DROP TABLE EmployeeNotes;
IF OBJECT_ID('NoteTypes', 'U') IS NOT NULL DROP TABLE NoteTypes;
GO

-- =============================================
-- Create Tables
-- =============================================

CREATE TABLE NoteTypes (
    NoteTypeId INT PRIMARY KEY IDENTITY(1,1),
    NoteTypeName VARCHAR(100) NOT NULL,
    IsVisibleToEmployee BIT DEFAULT 1,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

CREATE TABLE EmployeeNotes (
    NoteId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    NoteTypeId INT NOT NULL,
    Title VARCHAR(200) NOT NULL,
    Description VARCHAR(MAX) NOT NULL,

    CreatedBy INT NOT NULL,
    CreatedByRole VARCHAR(50) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),

    UpdatedBy INT NULL,
    UpdatedByRole VARCHAR(50) NULL,
    UpdatedAt DATETIME NULL,

    IsActive BIT DEFAULT 1

    CONSTRAINT FK_EmployeeNotes_NoteTypes FOREIGN KEY (NoteTypeId) REFERENCES NoteTypes(NoteTypeId)
);
GO

CREATE TABLE EmployeeNotesHistory (
    HistoryId INT PRIMARY KEY IDENTITY(1,1),
    NoteId INT,
    Title VARCHAR(200),
    Description VARCHAR(MAX),
    ModifiedBy INT,
    ModifiedByRole VARCHAR(50),
    ModifiedAt DATETIME DEFAULT GETDATE()
);
GO

-- Insert default Note Types
INSERT INTO NoteTypes (NoteTypeName, IsVisibleToEmployee) VALUES
('Appreciation', 1),
('Warning', 1),
('Manager Feedback', 1),
('HR Internal Note', 0),
('Admin Remark', 0);
GO


-- =============================================
-- Stored Procedures
-- =============================================

CREATE PROCEDURE sp_CreateEmployeeNote
    @EmployeeId INT,
    @NoteTypeId INT,
    @Title VARCHAR(200),
    @Description VARCHAR(MAX),
    @CreatedBy INT,
    @CreatedByRole VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO EmployeeNotes (EmployeeId, NoteTypeId, Title, Description, CreatedBy, CreatedByRole, CreatedAt, IsActive)
    VALUES (@EmployeeId, @NoteTypeId, @Title, @Description, @CreatedBy, @CreatedByRole, GETDATE(), 1);
    
    SELECT SCOPE_IDENTITY() AS NoteId;
END
GO

CREATE PROCEDURE sp_UpdateEmployeeNote
    @NoteId INT,
    @NoteTypeId INT,
    @Title VARCHAR(200),
    @Description VARCHAR(MAX),
    @UpdatedBy INT,
    @UpdatedByRole VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Insert old data into History first
    INSERT INTO EmployeeNotesHistory (NoteId, Title, Description, ModifiedBy, ModifiedByRole, ModifiedAt)
    SELECT NoteId, Title, Description, @UpdatedBy, @UpdatedByRole, GETDATE()
    FROM EmployeeNotes
    WHERE NoteId = @NoteId;

    -- Update Note
    UPDATE EmployeeNotes
    SET NoteTypeId = @NoteTypeId,
        Title = @Title,
        Description = @Description,
        UpdatedBy = @UpdatedBy,
        UpdatedByRole = @UpdatedByRole,
        UpdatedAt = GETDATE()
    WHERE NoteId = @NoteId;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE PROCEDURE sp_DeleteEmployeeNote
    @NoteId INT,
    @DeletedBy INT,
    @DeletedByRole VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Insert into history for audit trail before deletion
    INSERT INTO EmployeeNotesHistory (NoteId, Title, Description, ModifiedBy, ModifiedByRole, ModifiedAt)
    SELECT NoteId, Title, Description, @DeletedBy, @DeletedByRole, GETDATE()
    FROM EmployeeNotes
    WHERE NoteId = @NoteId;

    UPDATE EmployeeNotes
    SET IsActive = 0,
        UpdatedBy = @DeletedBy,
        UpdatedByRole = @DeletedByRole,
        UpdatedAt = GETDATE()
    WHERE NoteId = @NoteId;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE PROCEDURE sp_GetEmployeeNotes
    @RequesterRole VARCHAR(50),
    @RequesterId INT,
    @EmployeeId INT = NULL,
    @NoteTypeId INT = NULL,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- For Admin/HR/Manager: We include everything unless filtered.
    -- For Employee: We only show their notes with IsVisibleToEmployee = 1.
    -- Assuming `Users` table or `Employees` table holds FullName. 
    -- The prompt asked for: u.FullName AS GivenBy AND JOIN Users u ON n.CreatedBy = u.UserId
    -- However, let's use the local database schema. 
    -- Wait, the `employee-notes-schema.sql` before had `Employees e ON n.EmployeeId = e.EmployeeId`.
    -- Let's use `Employees gb ON n.CreatedBy = gb.EmployeeId` and build `gb.FirstName + ' ' + gb.LastName`.
    
    SELECT 
        n.NoteId,
        nt.NoteTypeId,
        nt.NoteTypeName,
        n.EmployeeId,
        e.FirstName + ' ' + e.LastName AS EmployeeName,
        n.Title,
        n.Description,
        gb.FirstName + ' ' + gb.LastName AS GivenBy,
        n.CreatedByRole,
        n.CreatedAt,
        n.UpdatedAt
    FROM EmployeeNotes n
    INNER JOIN NoteTypes nt ON n.NoteTypeId = nt.NoteTypeId
    INNER JOIN Employees e ON n.EmployeeId = e.EmployeeId
    LEFT JOIN Employees gb ON n.CreatedBy = gb.EmployeeId
    WHERE 
        n.IsActive = 1
        AND (@EmployeeId IS NULL OR n.EmployeeId = @EmployeeId)
        AND (@NoteTypeId IS NULL OR n.NoteTypeId = @NoteTypeId)
        AND (@StartDate IS NULL OR CAST(n.CreatedAt AS DATE) >= @StartDate)
        AND (@EndDate IS NULL OR CAST(n.CreatedAt AS DATE) <= @EndDate)
        AND (
            @RequesterRole IN ('admin', 'hr') 
            OR (@RequesterRole = 'manager' AND e.ReportingTo = @RequesterId) 
            OR (
                n.EmployeeId = @RequesterId 
                AND nt.IsVisibleToEmployee = 1
            )
        )
    ORDER BY n.CreatedAt DESC;
END
GO

CREATE PROCEDURE sp_GetNoteTypes
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        NoteTypeId,
        NoteTypeName,
        IsVisibleToEmployee,
        IsActive,
        CreatedAt
    FROM NoteTypes
    WHERE IsActive = 1
    ORDER BY NoteTypeName ASC;
END
GO
