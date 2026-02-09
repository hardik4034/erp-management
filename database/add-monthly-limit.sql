-- Add MonthlyLimit column to LeaveTypes table
USE HRMS;
GO

-- Check if column exists, if not add it
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('LeaveTypes') 
    AND name = 'MonthlyLimit'
)
BEGIN
    ALTER TABLE LeaveTypes
    ADD MonthlyLimit INT NULL;
    
    PRINT 'MonthlyLimit column added to LeaveTypes table';
END
ELSE
BEGIN
    PRINT 'MonthlyLimit column already exists in LeaveTypes table';
END
GO

-- Update existing leave types with default monthly limits (optional)
UPDATE LeaveTypes
SET MonthlyLimit = NULL
WHERE MonthlyLimit IS NULL;

PRINT 'LeaveTypes table updated successfully';
GO
