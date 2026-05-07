USE HRMS;
GO

-- Create/Update sp_UpdateLeave
CREATE OR ALTER PROCEDURE sp_UpdateLeave
    @LeaveId INT,
    @LeaveTypeId INT,
    @FromDate DATE,
    @ToDate DATE,
    @Reason NVARCHAR(500)
AS
BEGIN
    UPDATE Leaves
    SET LeaveTypeId = @LeaveTypeId,
        FromDate = @FromDate,
        ToDate = @ToDate,
        Reason = @Reason,
        UpdatedAt = GETDATE()
    WHERE LeaveId = @LeaveId AND Status = 'Pending'; -- Only pending leaves can be edited by logic
    
    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

-- Create/Update sp_SoftDeleteLeave
CREATE OR ALTER PROCEDURE sp_SoftDeleteLeave
    @LeaveId INT,
    @DeletedBy NVARCHAR(100) = NULL,
    @DeleteReason NVARCHAR(500) = NULL
AS
BEGIN
    UPDATE Leaves
    SET Status = 'Deleted',
        IsDeleted = 1,
        DeletedAt = GETDATE(),
        DeletedBy = @DeletedBy,
        DeleteReason = @DeleteReason,
        UpdatedAt = GETDATE()
    WHERE LeaveId = @LeaveId;
    
    SELECT @@ROWCOUNT AS RowsAffected;
END
GO
