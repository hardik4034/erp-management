-- Update sp_GetAllLeaves with role-based filtering
USE HRMS;
GO

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

PRINT 'Stored procedure sp_GetAllLeaves updated successfully with role-based filtering';
