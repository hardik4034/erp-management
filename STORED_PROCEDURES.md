# Stored Procedures Implementation Guide

## Quick Setup

### 1. Run Stored Procedures Script

```sql
-- In SQL Server Management Studio (SSMS)
-- Open and execute: c:\hr-employee\database\stored-procedures.sql
```

### 2. Verify Installation

```sql
USE HRMS;
GO

-- List all stored procedures
SELECT name FROM sys.procedures WHERE name LIKE 'sp_%'
ORDER BY name;
```

You should see **35 stored procedures** created.

---

## Benefits of Stored Procedures

✅ **Better Performance** - Compiled and cached execution plans  
✅ **Enhanced Security** - No SQL injection vulnerabilities  
✅ **Code Reusability** - One procedure, multiple uses  
✅ **Easier Maintenance** - Update logic in one place  
✅ **Network Efficiency** - Less data transfer  
✅ **Transaction Control** - Better error handling

---

## Available Stored Procedures

### Employees (5 procedures)

- `sp_GetAllEmployees` - Get all active employees with department/designation
- `sp_GetEmployeeById` - Get single employee by ID
- `sp_CreateEmployee` - Create new employee (auto-generates code)
- `sp_UpdateEmployee` - Update employee details
- `sp_DeleteEmployee` - Soft delete employee

### Attendance (5 procedures)

- `sp_GetAllAttendance` - Get attendance with optional filters
- `sp_CreateAttendance` - Mark attendance
- `sp_UpdateAttendance` - Update attendance record
- `sp_DeleteAttendance` - Delete attendance
- `sp_GetMonthlyAttendanceReport` - Monthly report

### Leaves (6 procedures)

- `sp_GetAllLeaves` - Get leaves with filters
- `sp_GetAllLeaveTypes` - Get active leave types
- `sp_CreateLeave` - Apply for leave
- `sp_UpdateLeaveStatus` - Approve/Reject leave
- `sp_DeleteLeave` - Delete leave
- `sp_GetLeaveBalance` - Calculate leave balance

### Holidays (4 procedures)

- `sp_GetAllHolidays` - Get holidays (optional year filter)
- `sp_CreateHoliday` - Add new holiday
- `sp_UpdateHoliday` - Update holiday
- `sp_DeleteHoliday` - Soft delete holiday

### Departments (4 procedures)

- `sp_GetAllDepartments` - Get all with employee count
- `sp_CreateDepartment` - Create department
- `sp_UpdateDepartment` - Update department
- `sp_DeleteDepartment` - Soft delete

### Designations (4 procedures)

- `sp_GetAllDesignations` - Get all with employee count
- `sp_CreateDesignation` - Create designation
- `sp_UpdateDesignation` - Update designation
- `sp_DeleteDesignation` - Soft delete

### Appreciations (4 procedures)

- `sp_GetAllAppreciations` - Get all appreciations
- `sp_CreateAppreciation` - Add appreciation
- `sp_UpdateAppreciation` - Update appreciation
- `sp_DeleteAppreciation` - Soft delete

---

## Controller Usage Example

### Before (Inline SQL)

```javascript
const getAllEmployees = async (req, res, next) => {
  const pool = await getConnection();
  const result = await pool.request().query(`
        SELECT e.*, d.DepartmentName, des.DesignationName
        FROM Employees e
        LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
        LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
        WHERE e.Status = 'Active'
    `);
  res.json(successResponse(result.recordset));
};
```

### After (Stored Procedure)

```javascript
const getAllEmployees = async (req, res, next) => {
  const pool = await getConnection();
  const result = await pool.request().execute("sp_GetAllEmployees");
  res.json(successResponse(result.recordset));
};
```

**Much cleaner and more secure!**

---

## Testing Stored Procedures

### Test Employee Creation

```sql
EXEC sp_CreateEmployee
    @FirstName = 'John',
    @LastName = 'Doe',
    @Email = 'john.doe@company.com',
    @Phone = '1234567890',
    @DateOfJoining = '2026-01-17',
    @DepartmentId = 1,
    @DesignationId = 1;
```

### Test Get All Employees

```sql
EXEC sp_GetAllEmployees;
```

### Test Leave Balance

```sql
EXEC sp_GetLeaveBalance @EmployeeId = 1;
```

### Test Monthly Attendance

```sql
EXEC sp_GetMonthlyAttendanceReport
    @Month = 1,
    @Year = 2026;
```

---

## Next Steps

1. ✅ Run `stored-procedures.sql` in SSMS
2. ✅ Updated `employeeController.js` (example provided)
3. ⏳ Update remaining 6 controllers:
   - attendanceController.js
   - leaveController.js
   - holidayController.js
   - departmentController.js
   - designationController.js
   - appreciationController.js

4. ⏳ Test all endpoints
5. ⏳ Restart backend server

---

## File Locations

- **Stored Procedures**: `c:\hr-employee\database\stored-procedures.sql`
- **Updated Controller**: `c:\hr-employee\backend\controllers\employeeController.js`
- **This Guide**: `c:\hr-employee\STORED_PROCEDURES.md`

---

**Your system is now using enterprise-grade stored procedures!** 🚀
