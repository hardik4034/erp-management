-- =============================================
-- Calendar & Timesheet Schema Definitions
-- =============================================
USE HRMS;
GO

-- 1. CalendarEvents Table
IF OBJECT_ID('CalendarEvents', 'U') IS NOT NULL DROP TABLE CalendarEvents;

CREATE TABLE CalendarEvents (
    EventId INT PRIMARY KEY IDENTITY(1,1),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(1000),
    EventDate DATE NOT NULL,
    EventTime TIME,
    EventType NVARCHAR(50) NOT NULL, -- Holiday, Meeting, Birthday, Training, Interview, Notice, Leave
    Color NVARCHAR(20),
    CreatedBy INT, -- Null for auto-generated like holidays/birthdays
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_CalendarEvents_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Employees(EmployeeId)
);
GO

-- Indexes for CalendarEvents
CREATE INDEX IX_CalendarEvents_EventDate ON CalendarEvents(EventDate);
CREATE INDEX IX_CalendarEvents_EventType ON CalendarEvents(EventType);
GO

-- 2. Timesheets Table
IF OBJECT_ID('Timesheets', 'U') IS NOT NULL DROP TABLE Timesheets;

CREATE TABLE Timesheets (
    TimesheetId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    Date DATE NOT NULL,
    Project NVARCHAR(200),
    Task NVARCHAR(200),
    Description NVARCHAR(1000),
    StartTime TIME,
    EndTime TIME,
    TotalHours DECIMAL(5,2),
    Status NVARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
    ApprovedBy INT,
    Remarks NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Timesheets_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
    CONSTRAINT FK_Timesheets_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES Employees(EmployeeId)
);
GO

-- Indexes for Timesheets
CREATE INDEX IX_Timesheets_EmployeeId ON Timesheets(EmployeeId);
CREATE INDEX IX_Timesheets_Date ON Timesheets(Date);
CREATE INDEX IX_Timesheets_Status ON Timesheets(Status);
GO

-- Trigger to update UpdatedAt for Timesheets
CREATE TRIGGER trg_Timesheets_UpdatedAt ON Timesheets
AFTER UPDATE
AS
BEGIN
    UPDATE Timesheets
    SET UpdatedAt = GETDATE()
    FROM Timesheets t
    INNER JOIN inserted i ON t.TimesheetId = i.TimesheetId;
END
GO

-- =============================================
-- Calendar Stored Procedures
-- =============================================

-- Create event (User generated)
CREATE OR ALTER PROCEDURE sp_CreateCalendarEvent
    @Title NVARCHAR(200),
    @Description NVARCHAR(1000) = NULL,
    @EventDate DATE,
    @EventTime TIME = NULL,
    @EventType NVARCHAR(50),
    @Color NVARCHAR(20) = NULL,
    @CreatedBy INT = NULL
AS
BEGIN
    INSERT INTO CalendarEvents (Title, Description, EventDate, EventTime, EventType, Color, CreatedBy)
    VALUES (@Title, @Description, @EventDate, @EventTime, @EventType, @Color, @CreatedBy);
    
    SELECT SCOPE_IDENTITY() AS EventId;
END
GO

-- Update event
CREATE OR ALTER PROCEDURE sp_UpdateCalendarEvent
    @EventId INT,
    @Title NVARCHAR(200),
    @Description NVARCHAR(1000) = NULL,
    @EventDate DATE,
    @EventTime TIME = NULL,
    @EventType NVARCHAR(50),
    @Color NVARCHAR(20) = NULL
AS
BEGIN
    UPDATE CalendarEvents
    SET Title = @Title,
        Description = @Description,
        EventDate = @EventDate,
        EventTime = @EventTime,
        EventType = @EventType,
        Color = @Color
    WHERE EventId = @EventId;
END
GO

-- Delete event
CREATE OR ALTER PROCEDURE sp_DeleteCalendarEvent
    @EventId INT
AS
BEGIN
    DELETE FROM CalendarEvents WHERE EventId = @EventId;
END
GO

-- Get all Calendar Events
CREATE OR ALTER PROCEDURE sp_GetCalendarEvents
    @StartDate DATE,
    @EndDate DATE
AS
BEGIN
    -- This gets user-created events and existing holidays (if any were copied over to CalendarEvents)
    SELECT 
        EventId,
        Title,
        Description,
        EventDate,
        EventTime,
        EventType,
        Color,
        CreatedBy,
        CreatedAt
    FROM CalendarEvents
    WHERE EventDate BETWEEN @StartDate AND @EndDate;
END
GO


-- =============================================
-- Timesheet Stored Procedures
-- =============================================

-- Add Timesheet Entry
CREATE OR ALTER PROCEDURE sp_CreateTimesheet
    @EmployeeId INT,
    @Date DATE,
    @Project NVARCHAR(200) = NULL,
    @Task NVARCHAR(200) = NULL,
    @Description NVARCHAR(1000) = NULL,
    @StartTime TIME = NULL,
    @EndTime TIME = NULL,
    @TotalHours DECIMAL(5,2) = NULL
AS
BEGIN
    INSERT INTO Timesheets (EmployeeId, Date, Project, Task, Description, StartTime, EndTime, TotalHours, Status)
    VALUES (@EmployeeId, @Date, @Project, @Task, @Description, @StartTime, @EndTime, @TotalHours, 'Pending');
    
    SELECT SCOPE_IDENTITY() AS TimesheetId;
END
GO

-- Update Timesheet Status
CREATE OR ALTER PROCEDURE sp_UpdateTimesheetStatus
    @TimesheetId INT,
    @Status NVARCHAR(20),
    @ApprovedBy INT,
    @Remarks NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE Timesheets
    SET Status = @Status,
        ApprovedBy = @ApprovedBy,
        Remarks = @Remarks
    WHERE TimesheetId = @TimesheetId;
END
GO

-- Get Timesheets
CREATE OR ALTER PROCEDURE sp_GetTimesheets
    @EmployeeId INT = NULL, -- Null means all employees
    @ManagerId INT = NULL,  -- Null means no manager filter
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @Status NVARCHAR(20) = NULL
AS
BEGIN
    SELECT 
        t.TimesheetId, t.EmployeeId, t.Date, t.Project, t.Task, t.Description, 
        t.StartTime, t.EndTime, t.TotalHours, t.Status, t.ApprovedBy, t.Remarks,
        e.FirstName, e.LastName, e.EmployeeCode,
        a.FirstName AS ApproverFirstName, a.LastName AS ApproverLastName
    FROM Timesheets t
    INNER JOIN Employees e ON t.EmployeeId = e.EmployeeId
    LEFT JOIN Employees a ON t.ApprovedBy = a.EmployeeId
    WHERE (@EmployeeId IS NULL OR t.EmployeeId = @EmployeeId)
      AND (@StartDate IS NULL OR t.Date >= @StartDate)
      AND (@EndDate IS NULL OR t.Date <= @EndDate)
      AND (@Status IS NULL OR t.Status = @Status)
      AND (@ManagerId IS NULL OR e.ReportingTo = @ManagerId OR t.EmployeeId = @ManagerId) -- Manager sees their reports and themselves
    ORDER BY t.Date DESC;
END
GO

PRINT 'Calendar & Timesheet Schema and Stored Procedures Created successfully!';
