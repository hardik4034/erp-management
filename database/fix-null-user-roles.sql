-- =============================================
-- Fix Null UserRole Values
-- =============================================
-- This script updates all employees with NULL UserRole to have a default role of 'Employee'
-- and adds a default constraint to prevent future NULL values
-- =============================================

USE HRMSDB;
GO

-- Step 1: Update all existing employees with NULL UserRole to 'Employee'
PRINT 'Updating existing employees with NULL UserRole...';

UPDATE Employees
SET UserRole = 'Employee'
WHERE UserRole IS NULL;

PRINT 'Updated ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' employees with default role "Employee"';
GO

-- Step 2: Add a default constraint to the UserRole column (if it doesn't exist)
-- This ensures new employees automatically get 'Employee' as their role
IF NOT EXISTS (
    SELECT 1 
    FROM sys.default_constraints 
    WHERE parent_object_id = OBJECT_ID('Employees') 
    AND COL_NAME(parent_object_id, parent_column_id) = 'UserRole'
)
BEGIN
    PRINT 'Adding default constraint to UserRole column...';
    
    ALTER TABLE Employees
    ADD CONSTRAINT DF_Employees_UserRole DEFAULT 'Employee' FOR UserRole;
    
    PRINT 'Default constraint added successfully';
END
ELSE
BEGIN
    PRINT 'Default constraint already exists for UserRole';
END
GO

-- Step 3: Verify the changes
PRINT '';
PRINT 'Verification - Current UserRole distribution:';
SELECT 
    UserRole,
    COUNT(*) AS EmployeeCount
FROM Employees
GROUP BY UserRole
ORDER BY UserRole;
GO

PRINT '';
PRINT '✓ Fix completed successfully!';
PRINT 'All employees now have a UserRole assigned.';
PRINT 'New employees will automatically get "Employee" as their default role.';
GO
