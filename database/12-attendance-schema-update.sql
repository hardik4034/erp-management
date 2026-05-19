-- =============================================
-- Attendance Schema Updates
-- Add new status types and performance indexes
-- =============================================

USE HRMS;
GO

-- =============================================
-- Step 1: Drop existing Status constraint
-- =============================================
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('Attendance')
  AND COL_NAME(parent_object_id, parent_column_id) = 'Status';

IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(MAX) = 'ALTER TABLE Attendance DROP CONSTRAINT ' + @ConstraintName;
    EXEC sp_executesql @SQL;
    PRINT 'Dropped existing Status constraint: ' + @ConstraintName;
END
GO

-- =============================================
-- Step 2: Add new Status constraint with additional types
-- =============================================
ALTER TABLE Attendance ADD CONSTRAINT CK_Attendance_Status 
    CHECK (Status IN ('Present', 'Absent', 'Half Day', 'Late', 'On Leave'));
GO
PRINT 'Added new Status constraint with Late and On Leave types';
GO

-- =============================================
-- Step 3: Add composite index for grid queries
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Attendance_Date_Employee' AND object_id = OBJECT_ID('Attendance'))
BEGIN
    CREATE INDEX IX_Attendance_Date_Employee ON Attendance(AttendanceDate, EmployeeId);
    PRINT 'Created composite index IX_Attendance_Date_Employee';
END
ELSE
BEGIN
    PRINT 'Index IX_Attendance_Date_Employee already exists';
END
GO

-- =============================================
-- Step 4: Add Notes column if it doesn't exist
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Attendance') AND name = 'Notes')
BEGIN
    ALTER TABLE Attendance ADD Notes NVARCHAR(1000) NULL;
    PRINT 'Added Notes column to Attendance table';
END
ELSE
BEGIN
    PRINT 'Notes column already exists';
END
GO


-- =============================================
-- Step 5: Add Location and WorkingFrom columns
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Attendance') AND name = 'CheckInLocation')
BEGIN
    ALTER TABLE Attendance ADD CheckInLocation NVARCHAR(100) NULL;
    PRINT 'Added CheckInLocation column to Attendance table';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Attendance') AND name = 'CheckOutLocation')
BEGIN
    ALTER TABLE Attendance ADD CheckOutLocation NVARCHAR(100) NULL;
    PRINT 'Added CheckOutLocation column to Attendance table';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Attendance') AND name = 'WorkingFrom')
BEGIN
    ALTER TABLE Attendance ADD WorkingFrom NVARCHAR(50) NULL;
    PRINT 'Added WorkingFrom column to Attendance table';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Attendance') AND name = 'WorkingFromOut')
BEGIN
    ALTER TABLE Attendance ADD WorkingFromOut NVARCHAR(50) NULL;
    PRINT 'Added WorkingFromOut column to Attendance table';
END
GO

PRINT 'Attendance schema updates completed successfully!';
GO
