# Quick Fix: Update Stored Procedure Manually

## Problem
The backend is sending new parameters (`UserRole`, `RequestingEmployeeId`) to the stored procedure, but the database still has the old version that only accepts 2 parameters.

## Solution Options

### Option 1: Using SQL Server Management Studio (SSMS) - RECOMMENDED

1. **Open SQL Server Management Studio (SSMS)**
2. **Connect to your SQL Server** (localhost)
3. **Open the SQL file:**
   - File → Open → File
   - Navigate to: `c:\hr-employee\database\update-sp-leaves.sql`
4. **Execute the script:**
   - Press `F5` or click "Execute" button
5. **Verify:**
   - You should see: "Stored procedure sp_GetAllLeaves updated successfully with role-based filtering"

### Option 2: Using Azure Data Studio

1. **Open Azure Data Studio**
2. **Connect to localhost**
3. **Open the SQL file:**
   - File → Open File
   - Select: `c:\hr-employee\database\update-sp-leaves.sql`
4. **Run the script:**
   - Click "Run" button or press `F5`

### Option 3: Copy-Paste SQL Directly

If you don't have SSMS or Azure Data Studio open, you can copy this SQL and run it in any SQL client:

```sql
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
```

## After Updating

1. **Refresh the browser page:** `http://localhost:8080/pages/leaves.html`
2. **The error should be gone**
3. **Test the role-based filtering:**
   - Switch between Employee, HR, and Admin roles
   - Verify the behavior matches the testing instructions

## What Changed

The stored procedure now accepts 4 parameters instead of 2:
- ✅ `@EmployeeId` (existing)
- ✅ `@Status` (existing)
- ✅ `@UserRole` (NEW - for role-based filtering)
- ✅ `@RequestingEmployeeId` (NEW - logged-in employee ID)

The new logic forces Employee role to only see their own data at the database level.
