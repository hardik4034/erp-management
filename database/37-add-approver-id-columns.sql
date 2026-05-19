-- =============================================================
-- APPROVER MANAGEMENT SYSTEM - Database Migration
-- Adds AttendanceApproverId and LeaveApproverId FK columns
-- to the Employees table, replacing NVarChar approver fields.
-- =============================================================

USE HRMS;
GO

-- 1. Add AttendanceApproverId column (INT, FK -> Employees)
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('Employees') AND name = 'AttendanceApproverId'
)
BEGIN
    ALTER TABLE Employees ADD AttendanceApproverId INT NULL;
    PRINT 'Column AttendanceApproverId added.';
END
ELSE
    PRINT 'Column AttendanceApproverId already exists.';
GO

-- 2. Add LeaveApproverId column (INT, FK -> Employees)
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('Employees') AND name = 'LeaveApproverId'
)
BEGIN
    ALTER TABLE Employees ADD LeaveApproverId INT NULL;
    PRINT 'Column LeaveApproverId added.';
END
ELSE
    PRINT 'Column LeaveApproverId already exists.';
GO

-- 3. Add FK constraint: AttendanceApproverId -> Employees.EmployeeId
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys
    WHERE name = 'FK_Employees_AttendanceApprover'
)
BEGIN
    ALTER TABLE Employees
        ADD CONSTRAINT FK_Employees_AttendanceApprover
        FOREIGN KEY (AttendanceApproverId) REFERENCES Employees(EmployeeId);
    PRINT 'FK FK_Employees_AttendanceApprover created.';
END
ELSE
    PRINT 'FK FK_Employees_AttendanceApprover already exists.';
GO

-- 4. Add FK constraint: LeaveApproverId -> Employees.EmployeeId
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys
    WHERE name = 'FK_Employees_LeaveApprover'
)
BEGIN
    ALTER TABLE Employees
        ADD CONSTRAINT FK_Employees_LeaveApprover
        FOREIGN KEY (LeaveApproverId) REFERENCES Employees(EmployeeId);
    PRINT 'FK FK_Employees_LeaveApprover created.';
END
ELSE
    PRINT 'FK FK_Employees_LeaveApprover already exists.';
GO

-- =============================================================
-- 5. Stored Procedure: sp_GetEmployeeApprovers
--    Returns approver names for a given employee via JOIN
-- =============================================================
CREATE OR ALTER PROCEDURE sp_GetEmployeeApprovers
    @EmployeeId INT
AS
BEGIN
    SELECT
        e.EmployeeId,
        e.AttendanceApproverId,
        aa.FirstName + ' ' + aa.LastName AS AttendanceApproverName,
        aa.EmployeeCode                  AS AttendanceApproverCode,
        e.LeaveApproverId,
        la.FirstName + ' ' + la.LastName AS LeaveApproverName,
        la.EmployeeCode                  AS LeaveApproverCode
    FROM Employees e
    LEFT JOIN Employees aa ON e.AttendanceApproverId = aa.EmployeeId
    LEFT JOIN Employees la ON e.LeaveApproverId      = la.EmployeeId
    WHERE e.EmployeeId = @EmployeeId;
END
GO

-- =============================================================
-- 6. Stored Procedure: sp_SaveEmployeeApprovers
--    Saves (updates) AttendanceApproverId and LeaveApproverId
--    Admin/HR only — enforced at API layer via requireRole
-- =============================================================
CREATE OR ALTER PROCEDURE sp_SaveEmployeeApprovers
    @EmployeeId           INT,
    @AttendanceApproverId INT = NULL,
    @LeaveApproverId      INT = NULL
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeId = @EmployeeId)
    BEGIN
        THROW 50010, 'Employee not found.', 1;
    END

    -- Validate approver IDs exist (if provided)
    IF @AttendanceApproverId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM Employees WHERE EmployeeId = @AttendanceApproverId
    )
    BEGIN
        THROW 50011, 'Attendance Approver employee not found.', 1;
    END

    IF @LeaveApproverId IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM Employees WHERE EmployeeId = @LeaveApproverId
    )
    BEGIN
        THROW 50012, 'Leave Approver employee not found.', 1;
    END

    UPDATE Employees
    SET
        AttendanceApproverId = @AttendanceApproverId,
        LeaveApproverId      = @LeaveApproverId,
        UpdatedAt            = GETDATE()
    WHERE EmployeeId = @EmployeeId;

    -- Return updated approver info
    EXEC sp_GetEmployeeApprovers @EmployeeId;
END
GO

-- =============================================================
-- 7. Update sp_GetEmployeeById to include approver names
-- =============================================================
CREATE OR ALTER PROCEDURE sp_GetEmployeeById
    @EmployeeId INT
AS
BEGIN
    SELECT
        e.*,
        d.DepartmentName,
        des.DesignationName,
        m.FirstName  + ' ' + m.LastName  AS ReportingToName,
        aa.FirstName + ' ' + aa.LastName AS AttendanceApproverName,
        aa.EmployeeCode                  AS AttendanceApproverCode,
        la.FirstName + ' ' + la.LastName AS LeaveApproverName,
        la.EmployeeCode                  AS LeaveApproverCode
    FROM Employees e
    LEFT JOIN Departments  d   ON e.DepartmentId         = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId        = des.DesignationId
    LEFT JOIN Employees    m   ON e.ReportingTo           = m.EmployeeId
    LEFT JOIN Employees    aa  ON e.AttendanceApproverId  = aa.EmployeeId
    LEFT JOIN Employees    la  ON e.LeaveApproverId       = la.EmployeeId
    WHERE e.EmployeeId = @EmployeeId;
END
GO
