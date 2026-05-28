-- ============================================================================
-- HRMS - COMPLETE STORED PROCEDURES
-- (Run this after creating the tables and views)
-- ============================================================================
USE HRMS;
GO

-- =============================================
-- 1. EMPLOYEE & APPROVER PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllEmployees
    @ShowDeleted BIT = 0, @PageNumber INT = 1, @PageSize INT = 50, @SearchTerm NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    SELECT COUNT(*) AS TotalCount FROM Employees e
    WHERE (@ShowDeleted = 1 OR e.IsDeleted = 0) AND (@SearchTerm IS NULL OR (e.FirstName + ' ' + e.LastName LIKE '%' + @SearchTerm + '%') OR e.EmployeeCode LIKE '%' + @SearchTerm + '%' OR e.Email LIKE '%' + @SearchTerm + '%');
    
    SELECT e.*, d.DepartmentName, des.DesignationName AS Designation, m.FirstName + ' ' + m.LastName AS ReportingToName,
        aa.FirstName + ' ' + aa.LastName AS AttendanceApproverName, la.FirstName + ' ' + la.LastName AS LeaveApproverName
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN Employees m ON e.ReportingTo = m.EmployeeId
    LEFT JOIN Employees aa ON e.AttendanceApproverId = aa.EmployeeId
    LEFT JOIN Employees la ON e.LeaveApproverId = la.EmployeeId
    WHERE (@ShowDeleted = 1 OR e.IsDeleted = 0) AND (@SearchTerm IS NULL OR (e.FirstName + ' ' + e.LastName LIKE '%' + @SearchTerm + '%') OR e.EmployeeCode LIKE '%' + @SearchTerm + '%' OR e.Email LIKE '%' + @SearchTerm + '%')
    ORDER BY e.FirstName, e.LastName OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE sp_GetEmployeeById @EmployeeId INT
AS
BEGIN
    SELECT e.*, d.DepartmentName, des.DesignationName AS Designation, m.FirstName + ' ' + m.LastName AS ReportingToName,
        aa.FirstName + ' ' + aa.LastName AS AttendanceApproverName, aa.EmployeeCode AS AttendanceApproverCode,
        la.FirstName + ' ' + la.LastName AS LeaveApproverName, la.EmployeeCode AS LeaveApproverCode
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN Employees m ON e.ReportingTo = m.EmployeeId
    LEFT JOIN Employees aa ON e.AttendanceApproverId = aa.EmployeeId
    LEFT JOIN Employees la ON e.LeaveApproverId = la.EmployeeId
    WHERE e.EmployeeId = @EmployeeId;
END
GO

CREATE OR ALTER PROCEDURE sp_CreateEmployee
    @EmployeeCode NVARCHAR(20), @FirstName NVARCHAR(100), @LastName NVARCHAR(100), @Email NVARCHAR(255), @Phone NVARCHAR(20), @DateOfJoining DATE, @DepartmentId INT = NULL, @DesignationId INT = NULL, @Salutation NVARCHAR(10) = NULL, @Country NVARCHAR(100) = NULL, @Gender NVARCHAR(20) = NULL, @DateOfBirth DATE = NULL, @ReportingTo INT = NULL, @Language NVARCHAR(50) = NULL, @UserRole NVARCHAR(50) = NULL, @PermanentAddress NVARCHAR(500) = NULL, @TemporaryAddress NVARCHAR(500) = NULL, @About NVARCHAR(1000) = NULL, @ProfilePicture NVARCHAR(500) = NULL, @LoginAllowed BIT = 1, @ReceiveEmailNotifications BIT = 1, @Skills NVARCHAR(MAX) = NULL, @ProbationEndDate DATE = NULL, @NoticePeriodStartDate DATE = NULL, @NoticePeriodEndDate DATE = NULL, @EmploymentType NVARCHAR(50) = NULL, @MaritalStatus NVARCHAR(20) = NULL, @BusinessAddress NVARCHAR(500) = NULL, @AttendanceApproverId INT = NULL, @LeaveApproverId INT = NULL
AS
BEGIN
    IF @EmployeeCode IS NULL OR LTRIM(RTRIM(@EmployeeCode)) = '' THROW 50001, 'Employee Code required.', 1;
    IF EXISTS (SELECT 1 FROM Employees WHERE EmployeeCode = @EmployeeCode) THROW 50002, 'Employee Code exists.', 1;
    INSERT INTO Employees (EmployeeCode, FirstName, LastName, Email, Phone, DateOfJoining, DepartmentId, DesignationId, Salutation, Country, Gender, DateOfBirth, ReportingTo, Language, UserRole, PermanentAddress, TemporaryAddress, Address, About, ProfilePicture, LoginAllowed, ReceiveEmailNotifications, Skills, ProbationEndDate, NoticePeriodStartDate, NoticePeriodEndDate, EmploymentType, MaritalStatus, BusinessAddress, AttendanceApproverId, LeaveApproverId)
    VALUES (@EmployeeCode, @FirstName, @LastName, @Email, @Phone, @DateOfJoining, @DepartmentId, @DesignationId, @Salutation, @Country, @Gender, @DateOfBirth, @ReportingTo, @Language, @UserRole, @PermanentAddress, @TemporaryAddress, @PermanentAddress, @About, @ProfilePicture, @LoginAllowed, @ReceiveEmailNotifications, @Skills, @ProbationEndDate, @NoticePeriodStartDate, @NoticePeriodEndDate, @EmploymentType, @MaritalStatus, @BusinessAddress, @AttendanceApproverId, @LeaveApproverId);
    SELECT SCOPE_IDENTITY() AS EmployeeId;
END
GO

CREATE OR ALTER PROCEDURE sp_UpdateEmployee
    @EmployeeId INT, @FirstName NVARCHAR(100), @LastName NVARCHAR(100), @Email NVARCHAR(255), @Phone NVARCHAR(20), @DateOfJoining DATE, @DepartmentId INT = NULL, @DesignationId INT = NULL, @Salutation NVARCHAR(10) = NULL, @Country NVARCHAR(100) = NULL, @Gender NVARCHAR(20) = NULL, @DateOfBirth DATE = NULL, @ReportingTo INT = NULL, @Language NVARCHAR(50) = NULL, @UserRole NVARCHAR(50) = NULL, @PermanentAddress NVARCHAR(500) = NULL, @TemporaryAddress NVARCHAR(500) = NULL, @About NVARCHAR(1000) = NULL, @ProfilePicture NVARCHAR(500) = NULL, @LoginAllowed BIT = 1, @ReceiveEmailNotifications BIT = 1, @Skills NVARCHAR(MAX) = NULL, @ProbationEndDate DATE = NULL, @NoticePeriodStartDate DATE = NULL, @NoticePeriodEndDate DATE = NULL, @EmploymentType NVARCHAR(50) = NULL, @MaritalStatus NVARCHAR(20) = NULL, @BusinessAddress NVARCHAR(500) = NULL, @AttendanceApproverId INT = NULL, @LeaveApproverId INT = NULL
AS
BEGIN
    UPDATE Employees SET FirstName = @FirstName, LastName = @LastName, Email = @Email, Phone = @Phone, DateOfJoining = @DateOfJoining, DepartmentId = @DepartmentId, DesignationId = @DesignationId, Salutation = @Salutation, Country = @Country, Gender = @Gender, DateOfBirth = @DateOfBirth, ReportingTo = @ReportingTo, Language = @Language, UserRole = @UserRole, PermanentAddress = @PermanentAddress, TemporaryAddress = @TemporaryAddress, Address = @PermanentAddress, About = @About, ProfilePicture = @ProfilePicture, LoginAllowed = @LoginAllowed, ReceiveEmailNotifications = @ReceiveEmailNotifications, Skills = @Skills, ProbationEndDate = @ProbationEndDate, NoticePeriodStartDate = @NoticePeriodStartDate, NoticePeriodEndDate = @NoticePeriodEndDate, EmploymentType = @EmploymentType, MaritalStatus = @MaritalStatus, BusinessAddress = @BusinessAddress, AttendanceApproverId = @AttendanceApproverId, LeaveApproverId = @LeaveApproverId WHERE EmployeeId = @EmployeeId;
END
GO

CREATE OR ALTER PROCEDURE sp_SoftDeleteEmployee @EmployeeId INT, @DeletedBy NVARCHAR(100), @DeleteReason NVARCHAR(500) = NULL AS
BEGIN UPDATE Employees SET IsDeleted = 1, DeletedAt = GETDATE(), DeletedBy = @DeletedBy, DeleteReason = @DeleteReason, UpdatedAt = GETDATE() WHERE EmployeeId = @EmployeeId AND IsDeleted = 0; SELECT @@ROWCOUNT AS AffectedRows; END
GO
CREATE OR ALTER PROCEDURE sp_RestoreEmployee @EmployeeId INT AS
BEGIN UPDATE Employees SET IsDeleted = 0, DeletedAt = NULL, DeletedBy = NULL, DeleteReason = NULL, UpdatedAt = GETDATE() WHERE EmployeeId = @EmployeeId AND IsDeleted = 1; SELECT @@ROWCOUNT AS AffectedRows; END
GO
CREATE OR ALTER PROCEDURE sp_HardDeleteEmployee @EmployeeId INT AS
BEGIN DELETE FROM Employees WHERE EmployeeId = @EmployeeId; SELECT @@ROWCOUNT AS AffectedRows; END
GO

CREATE OR ALTER PROCEDURE sp_GetEmployeeApprovers @EmployeeId INT AS
BEGIN
    SELECT e.EmployeeId, e.AttendanceApproverId, aa.FirstName + ' ' + aa.LastName AS AttendanceApproverName, aa.EmployeeCode AS AttendanceApproverCode, e.LeaveApproverId, la.FirstName + ' ' + la.LastName AS LeaveApproverName, la.EmployeeCode AS LeaveApproverCode
    FROM Employees e LEFT JOIN Employees aa ON e.AttendanceApproverId = aa.EmployeeId LEFT JOIN Employees la ON e.LeaveApproverId = la.EmployeeId WHERE e.EmployeeId = @EmployeeId;
END
GO

CREATE OR ALTER PROCEDURE sp_SaveEmployeeApprovers @EmployeeId INT, @AttendanceApproverId INT = NULL, @LeaveApproverId INT = NULL AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeId = @EmployeeId) THROW 50010, 'Employee not found.', 1;
    UPDATE Employees SET AttendanceApproverId = @AttendanceApproverId, LeaveApproverId = @LeaveApproverId, UpdatedAt = GETDATE() WHERE EmployeeId = @EmployeeId;
    EXEC sp_GetEmployeeApprovers @EmployeeId;
END
GO

-- =============================================
-- 2. DEPARTMENT PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllDepartments @ShowDeleted BIT = 0 AS
BEGIN SELECT d.*, (SELECT COUNT(*) FROM Employees e WHERE e.DepartmentId = d.DepartmentId AND e.IsDeleted = 0) AS EmployeeCount FROM Departments d WHERE (@ShowDeleted = 1 OR d.IsDeleted = 0) ORDER BY d.DepartmentName; END
GO
CREATE OR ALTER PROCEDURE sp_CreateDepartment @DepartmentName NVARCHAR(100), @Description NVARCHAR(500) = NULL AS
BEGIN INSERT INTO Departments (DepartmentName, Description) VALUES (@DepartmentName, @Description); SELECT SCOPE_IDENTITY() AS DepartmentId; END
GO
CREATE OR ALTER PROCEDURE sp_UpdateDepartment @DepartmentId INT, @DepartmentName NVARCHAR(100), @Description NVARCHAR(500) = NULL AS
BEGIN UPDATE Departments SET DepartmentName = @DepartmentName, Description = @Description WHERE DepartmentId = @DepartmentId; END
GO
CREATE OR ALTER PROCEDURE sp_SoftDeleteDepartment @DepartmentId INT, @DeletedBy NVARCHAR(100), @DeleteReason NVARCHAR(500) = NULL AS
BEGIN UPDATE Departments SET IsDeleted = 1, DeletedAt = GETDATE(), DeletedBy = @DeletedBy, DeleteReason = @DeleteReason, UpdatedAt = GETDATE() WHERE DepartmentId = @DepartmentId AND IsDeleted = 0; SELECT @@ROWCOUNT AS AffectedRows; END
GO
CREATE OR ALTER PROCEDURE sp_RestoreDepartment @DepartmentId INT AS
BEGIN UPDATE Departments SET IsDeleted = 0, DeletedAt = NULL, DeletedBy = NULL, DeleteReason = NULL, UpdatedAt = GETDATE() WHERE DepartmentId = @DepartmentId AND IsDeleted = 1; SELECT @@ROWCOUNT AS AffectedRows; END
GO
CREATE OR ALTER PROCEDURE sp_HardDeleteDepartment @DepartmentId INT AS
BEGIN DELETE FROM Departments WHERE DepartmentId = @DepartmentId; SELECT @@ROWCOUNT AS AffectedRows; END
GO

-- =============================================
-- 3. DESIGNATION PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllDesignations @DepartmentId INT = NULL, @ShowDeleted BIT = 0 AS
BEGIN SELECT des.*, d.DepartmentName, (SELECT COUNT(*) FROM Employees e WHERE e.DesignationId = des.DesignationId AND e.IsDeleted = 0) AS EmployeeCount FROM Designations des LEFT JOIN Departments d ON des.DepartmentId = d.DepartmentId WHERE (@DepartmentId IS NULL OR des.DepartmentId = @DepartmentId) AND (@ShowDeleted = 1 OR des.IsDeleted = 0) ORDER BY des.DesignationName; END
GO
CREATE OR ALTER PROCEDURE sp_CreateDesignation @DesignationName NVARCHAR(100), @DepartmentId INT, @Description NVARCHAR(500) = NULL AS
BEGIN INSERT INTO Designations (DesignationName, DepartmentId, Description) VALUES (@DesignationName, @DepartmentId, @Description); SELECT SCOPE_IDENTITY() AS DesignationId; END
GO
CREATE OR ALTER PROCEDURE sp_UpdateDesignation @DesignationId INT, @DesignationName NVARCHAR(100), @DepartmentId INT, @Description NVARCHAR(500) = NULL AS
BEGIN UPDATE Designations SET DesignationName = @DesignationName, DepartmentId = @DepartmentId, Description = @Description WHERE DesignationId = @DesignationId; END
GO
CREATE OR ALTER PROCEDURE sp_SoftDeleteDesignation @DesignationId INT, @DeletedBy NVARCHAR(100), @DeleteReason NVARCHAR(500) = NULL AS
BEGIN UPDATE Designations SET IsDeleted = 1, DeletedAt = GETDATE(), DeletedBy = @DeletedBy, DeleteReason = @DeleteReason, UpdatedAt = GETDATE() WHERE DesignationId = @DesignationId AND IsDeleted = 0; SELECT @@ROWCOUNT AS AffectedRows; END
GO
CREATE OR ALTER PROCEDURE sp_RestoreDesignation @DesignationId INT AS
BEGIN UPDATE Designations SET IsDeleted = 0, DeletedAt = NULL, DeletedBy = NULL, DeleteReason = NULL, UpdatedAt = GETDATE() WHERE DesignationId = @DesignationId AND IsDeleted = 1; SELECT @@ROWCOUNT AS AffectedRows; END
GO
CREATE OR ALTER PROCEDURE sp_HardDeleteDesignation @DesignationId INT AS
BEGIN DELETE FROM Designations WHERE DesignationId = @DesignationId; SELECT @@ROWCOUNT AS AffectedRows; END
GO

-- =============================================
-- 4. ATTENDANCE & BIOMETRIC PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllAttendance @EmployeeId INT = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL AS
BEGIN SELECT a.*, e.EmployeeCode, e.FirstName, e.LastName FROM Attendance a JOIN Employees e ON a.EmployeeId = e.EmployeeId WHERE (@EmployeeId IS NULL OR a.EmployeeId = @EmployeeId) AND (@FromDate IS NULL OR a.AttendanceDate >= @FromDate) AND (@ToDate IS NULL OR a.AttendanceDate <= @ToDate) ORDER BY a.AttendanceDate DESC; END
GO
CREATE OR ALTER PROCEDURE sp_CreateAttendance @EmployeeId INT, @AttendanceDate DATE, @Status NVARCHAR(20), @CheckInTime TIME = NULL, @CheckOutTime TIME = NULL, @Remarks NVARCHAR(500) = NULL, @CheckInLocation NVARCHAR(100) = NULL, @CheckOutLocation NVARCHAR(100) = NULL, @WorkingFrom NVARCHAR(50) = NULL, @WorkingFromOut NVARCHAR(50) = NULL, @Overwrite BIT = 0 AS
BEGIN
    IF @Overwrite = 1 BEGIN MERGE Attendance AS t USING (SELECT @EmployeeId AS Emp, @AttendanceDate AS Dt) AS s ON t.EmployeeId = s.Emp AND t.AttendanceDate = s.Dt WHEN MATCHED THEN UPDATE SET Status = @Status, CheckInTime = @CheckInTime, CheckOutTime = @CheckOutTime, Remarks = @Remarks, CheckInLocation = @CheckInLocation, CheckOutLocation = @CheckOutLocation, WorkingFrom = @WorkingFrom, WorkingFromOut = @WorkingFromOut, UpdatedAt = GETDATE() WHEN NOT MATCHED THEN INSERT (EmployeeId, AttendanceDate, Status, CheckInTime, CheckOutTime, Remarks, CheckInLocation, CheckOutLocation, WorkingFrom, WorkingFromOut) VALUES (@EmployeeId, @AttendanceDate, @Status, @CheckInTime, @CheckOutTime, @Remarks, @CheckInLocation, @CheckOutLocation, @WorkingFrom, @WorkingFromOut); SELECT AttendanceId FROM Attendance WHERE EmployeeId = @EmployeeId AND AttendanceDate = @AttendanceDate; END
    ELSE BEGIN IF EXISTS (SELECT 1 FROM Attendance WHERE EmployeeId = @EmployeeId AND AttendanceDate = @AttendanceDate) THROW 50001, 'Record exists.', 1; INSERT INTO Attendance (EmployeeId, AttendanceDate, Status, CheckInTime, CheckOutTime, Remarks, CheckInLocation, CheckOutLocation, WorkingFrom, WorkingFromOut) VALUES (@EmployeeId, @AttendanceDate, @Status, @CheckInTime, @CheckOutTime, @Remarks, @CheckInLocation, @CheckOutLocation, @WorkingFrom, @WorkingFromOut); SELECT SCOPE_IDENTITY() AS AttendanceId; END
END
GO
CREATE OR ALTER PROCEDURE sp_UpdateAttendance @AttendanceId INT, @Status NVARCHAR(20), @CheckInTime TIME = NULL, @CheckOutTime TIME = NULL, @Remarks NVARCHAR(500) = NULL, @CheckInLocation NVARCHAR(100) = NULL, @CheckOutLocation NVARCHAR(100) = NULL, @WorkingFrom NVARCHAR(50) = NULL, @WorkingFromOut NVARCHAR(50) = NULL AS
BEGIN UPDATE Attendance SET Status = @Status, CheckInTime = @CheckInTime, CheckOutTime = @CheckOutTime, Remarks = @Remarks, CheckInLocation = @CheckInLocation, CheckOutLocation = @CheckOutLocation, WorkingFrom = @WorkingFrom, WorkingFromOut = @WorkingFromOut WHERE AttendanceId = @AttendanceId; END
GO
CREATE OR ALTER PROCEDURE sp_DeleteAttendance @AttendanceId INT AS
BEGIN DELETE FROM Attendance WHERE AttendanceId = @AttendanceId; END
GO
CREATE OR ALTER PROCEDURE sp_GetMonthlyAttendanceReport @Month INT, @Year INT, @EmployeeId INT = NULL AS
BEGIN SELECT a.*, e.EmployeeCode, e.FirstName, e.LastName FROM Attendance a JOIN Employees e ON a.EmployeeId = e.EmployeeId WHERE MONTH(a.AttendanceDate) = @Month AND YEAR(a.AttendanceDate) = @Year AND (@EmployeeId IS NULL OR a.EmployeeId = @EmployeeId) ORDER BY a.AttendanceDate DESC; END
GO
CREATE OR ALTER PROCEDURE sp_GetAttendanceGrid @FromDate DATE, @ToDate DATE, @EmployeeIds NVARCHAR(MAX) = NULL AS
BEGIN SELECT e.EmployeeId, e.EmployeeCode, e.FirstName, e.LastName, e.ProfilePicture, d.DepartmentName, des.DesignationName FROM Employees e LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId LEFT JOIN Designations des ON e.DesignationId = des.DesignationId WHERE e.Status = 'Active' AND (@EmployeeIds IS NULL OR e.EmployeeId IN (SELECT value FROM STRING_SPLIT(@EmployeeIds, ','))) ORDER BY e.FirstName, e.LastName; SELECT a.* FROM Attendance a WHERE a.AttendanceDate BETWEEN @FromDate AND @ToDate AND (@EmployeeIds IS NULL OR a.EmployeeId IN (SELECT value FROM STRING_SPLIT(@EmployeeIds, ','))); SELECT HolidayDate, HolidayName, Description FROM Holidays WHERE HolidayDate BETWEEN @FromDate AND @ToDate AND Status = 'Active'; END
GO
CREATE OR ALTER PROCEDURE sp_ProcessBiometricLogs @StartDate DATE = NULL, @EndDate DATE = NULL, @DeviceId NVARCHAR(100) = NULL AS
BEGIN
    SET NOCOUNT ON; IF @StartDate IS NULL SET @StartDate = CAST(DATEADD(DAY, -7, GETDATE()) AS DATE); IF @EndDate IS NULL SET @EndDate = CAST(GETDATE() AS DATE);
    ;WITH BiometricDaily AS (SELECT e.EmployeeId, CAST(bl.punch_time AS DATE) AS AttendanceDate, CAST(MIN(bl.punch_time) AS TIME(0)) AS CheckInTime, CAST(MAX(bl.punch_time) AS TIME(0)) AS CheckOutTime, COUNT(*) AS PunchCount FROM biometric_logs bl INNER JOIN Employees e ON e.biometric_id = bl.biometric_user_id WHERE bl.processed = 0 AND e.Status = 'Active' AND e.biometric_id IS NOT NULL AND CAST(bl.punch_time AS DATE) BETWEEN @StartDate AND @EndDate AND (@DeviceId IS NULL OR bl.device_id = @DeviceId) GROUP BY e.EmployeeId, CAST(bl.punch_time AS DATE))
    MERGE Attendance AS t USING BiometricDaily AS s ON t.EmployeeId = s.EmployeeId AND t.AttendanceDate = s.AttendanceDate WHEN MATCHED THEN UPDATE SET t.CheckInTime = CASE WHEN s.CheckInTime < t.CheckInTime OR t.CheckInTime IS NULL THEN s.CheckInTime ELSE t.CheckInTime END, t.CheckOutTime = CASE WHEN s.CheckOutTime > t.CheckOutTime OR t.CheckOutTime IS NULL THEN s.CheckOutTime ELSE t.CheckOutTime END, t.Status = 'Present', t.Remarks = ISNULL(t.Remarks, '') + ' [Biometric: ' + CAST(s.PunchCount AS NVARCHAR(5)) + ' punches]', t.UpdatedAt = GETDATE() WHEN NOT MATCHED THEN INSERT (EmployeeId, AttendanceDate, Status, CheckInTime, CheckOutTime, Remarks, CreatedAt, UpdatedAt) VALUES (s.EmployeeId, s.AttendanceDate, 'Present', s.CheckInTime, s.CheckOutTime, 'Auto-imported from biometric (' + CAST(s.PunchCount AS NVARCHAR(5)) + ' punches)', GETDATE(), GETDATE());
    UPDATE bl SET bl.processed = 1 FROM biometric_logs bl INNER JOIN Employees e ON e.biometric_id = bl.biometric_user_id WHERE bl.processed = 0 AND e.Status = 'Active' AND CAST(bl.punch_time AS DATE) BETWEEN @StartDate AND @EndDate AND (@DeviceId IS NULL OR bl.device_id = @DeviceId);
END
GO

-- =============================================
-- 5. LEAVE PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllLeaves @EmployeeId INT = NULL, @Status NVARCHAR(20) = NULL, @UserRole NVARCHAR(50) = NULL, @RequestingEmployeeId INT = NULL, @ShowDeleted BIT = 0 AS
BEGIN IF @UserRole = 'employee' AND @RequestingEmployeeId IS NOT NULL SET @EmployeeId = @RequestingEmployeeId; SELECT l.*, lt.TypeName AS LeaveTypeName, e.FirstName + ' ' + e.LastName AS EmployeeName, e.EmployeeCode, e.ProfilePicture, des.DesignationName FROM Leaves l JOIN LeaveTypes lt ON l.LeaveTypeId = lt.LeaveTypeId JOIN Employees e ON l.EmployeeId = e.EmployeeId LEFT JOIN Designations des ON e.DesignationId = des.DesignationId WHERE (@EmployeeId IS NULL OR l.EmployeeId = @EmployeeId) AND (@Status IS NULL OR l.Status = @Status) AND (@ShowDeleted = 1 OR l.IsDeleted = 0) ORDER BY l.CreatedAt DESC; END
GO
CREATE OR ALTER PROCEDURE sp_GetAllLeaveTypes AS BEGIN SELECT * FROM LeaveTypes WHERE Status = 'Active'; END
GO
CREATE OR ALTER PROCEDURE sp_CreateLeave @EmployeeId INT, @LeaveTypeId INT, @FromDate DATE, @ToDate DATE, @Reason NVARCHAR(500) AS
BEGIN INSERT INTO Leaves (EmployeeId, LeaveTypeId, FromDate, ToDate, Reason) VALUES (@EmployeeId, @LeaveTypeId, @FromDate, @ToDate, @Reason); SELECT SCOPE_IDENTITY() AS LeaveId; END
GO
CREATE OR ALTER PROCEDURE sp_UpdateLeave @LeaveId INT, @LeaveTypeId INT, @FromDate DATE, @ToDate DATE, @Reason NVARCHAR(500) AS
BEGIN UPDATE Leaves SET LeaveTypeId = @LeaveTypeId, FromDate = @FromDate, ToDate = @ToDate, Reason = @Reason, UpdatedAt = GETDATE() WHERE LeaveId = @LeaveId AND Status = 'Pending'; SELECT @@ROWCOUNT AS RowsAffected; END
GO
CREATE OR ALTER PROCEDURE sp_UpdateLeaveStatus @LeaveId INT, @Status NVARCHAR(20), @ApprovedBy NVARCHAR(100) = NULL, @RejectionReason NVARCHAR(500) = NULL AS
BEGIN UPDATE Leaves SET Status = @Status, ApprovedBy = @ApprovedBy, ApprovedDate = CASE WHEN @Status = 'Approved' THEN GETDATE() ELSE NULL END, RejectionReason = @RejectionReason WHERE LeaveId = @LeaveId; END
GO
CREATE OR ALTER PROCEDURE sp_SoftDeleteLeave @LeaveId INT, @DeletedBy NVARCHAR(100) = NULL, @DeleteReason NVARCHAR(500) = NULL AS
BEGIN UPDATE Leaves SET Status = 'Deleted', IsDeleted = 1, DeletedAt = GETDATE(), DeletedBy = @DeletedBy, DeleteReason = @DeleteReason, UpdatedAt = GETDATE() WHERE LeaveId = @LeaveId AND IsDeleted = 0; SELECT @@ROWCOUNT AS RowsAffected; END
GO
CREATE OR ALTER PROCEDURE sp_RestoreLeave @LeaveId INT AS
BEGIN UPDATE Leaves SET IsDeleted = 0, DeletedAt = NULL, DeletedBy = NULL, DeleteReason = NULL, UpdatedAt = GETDATE() WHERE LeaveId = @LeaveId AND IsDeleted = 1; SELECT @@ROWCOUNT AS AffectedRows; END
GO
CREATE OR ALTER PROCEDURE sp_HardDeleteLeave @LeaveId INT AS
BEGIN DELETE FROM Leaves WHERE LeaveId = @LeaveId; SELECT @@ROWCOUNT AS AffectedRows; END
GO
CREATE OR ALTER PROCEDURE sp_GetLeaveBalance @EmployeeId INT AS
BEGIN SELECT lt.LeaveTypeId, lt.TypeName, lt.MaxDaysPerYear, lt.MonthlyLimit, ISNULL(SUM(CASE WHEN l.Status = 'Approved' THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 ELSE 0 END), 0) AS TotalTaken, lt.MaxDaysPerYear - ISNULL(SUM(CASE WHEN l.Status = 'Approved' THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 ELSE 0 END), 0) AS RemainingDays FROM LeaveTypes lt LEFT JOIN Leaves l ON lt.LeaveTypeId = l.LeaveTypeId AND l.EmployeeId = @EmployeeId AND l.Status = 'Approved' AND YEAR(l.FromDate) = YEAR(GETDATE()) WHERE lt.Status = 'Active' GROUP BY lt.LeaveTypeId, lt.TypeName, lt.MaxDaysPerYear, lt.MonthlyLimit; END
GO

-- =============================================
-- 6. HOLIDAY PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllHolidays @Year INT = NULL, @ShowDeleted BIT = 0 AS
BEGIN SELECT * FROM Holidays WHERE (@Year IS NULL OR Year = @Year) AND (@ShowDeleted = 1 OR IsDeleted = 0) ORDER BY HolidayDate; END
GO
CREATE OR ALTER PROCEDURE sp_CreateHoliday @HolidayName NVARCHAR(100), @HolidayDate DATE, @Description NVARCHAR(500) = NULL AS
BEGIN INSERT INTO Holidays (HolidayName, HolidayDate, Description, Year) VALUES (@HolidayName, @HolidayDate, @Description, YEAR(@HolidayDate)); SELECT SCOPE_IDENTITY() AS HolidayId; END
GO
CREATE OR ALTER PROCEDURE sp_UpdateHoliday @HolidayId INT, @HolidayName NVARCHAR(100), @HolidayDate DATE, @Description NVARCHAR(500) = NULL AS
BEGIN UPDATE Holidays SET HolidayName = @HolidayName, HolidayDate = @HolidayDate, Description = @Description, Year = YEAR(@HolidayDate), UpdatedAt = GETDATE() WHERE HolidayId = @HolidayId; END
GO
CREATE OR ALTER PROCEDURE sp_SoftDeleteHoliday @HolidayId INT, @DeletedBy NVARCHAR(100) = NULL, @DeleteReason NVARCHAR(500) = NULL AS
BEGIN UPDATE Holidays SET IsDeleted = 1, DeletedAt = GETDATE(), DeletedBy = @DeletedBy, DeleteReason = @DeleteReason, UpdatedAt = GETDATE() WHERE HolidayId = @HolidayId AND IsDeleted = 0; END
GO
CREATE OR ALTER PROCEDURE sp_RestoreHoliday @HolidayId INT AS
BEGIN UPDATE Holidays SET IsDeleted = 0, DeletedAt = NULL, DeletedBy = NULL, DeleteReason = NULL, UpdatedAt = GETDATE() WHERE HolidayId = @HolidayId AND IsDeleted = 1; END
GO
CREATE OR ALTER PROCEDURE sp_HardDeleteHoliday @HolidayId INT AS
BEGIN DELETE FROM Holidays WHERE HolidayId = @HolidayId; END
GO

-- =============================================
-- 7. PAYROLL & SALARY PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllSalaryGroups AS BEGIN SELECT * FROM SalaryGroups WHERE IsActive = 1 ORDER BY GroupName; END
GO
CREATE OR ALTER PROCEDURE sp_CreateSalaryGroup @GroupName NVARCHAR(100), @Description NVARCHAR(500) = NULL AS
BEGIN INSERT INTO SalaryGroups (GroupName, Description) VALUES (@GroupName, @Description); SELECT SCOPE_IDENTITY() AS SalaryGroupId; END
GO
CREATE OR ALTER PROCEDURE sp_GetAllEmployeeSalaries @EmployeeId INT = NULL, @SalaryGroupId INT = NULL, @IsActive BIT = NULL AS
BEGIN SELECT es.*, e.EmployeeCode, e.FirstName, e.LastName, d.DepartmentName, des.DesignationName, sg.GroupName AS SalaryGroupName FROM EmployeeSalary es JOIN Employees e ON es.EmployeeId = e.EmployeeId LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId LEFT JOIN Designations des ON e.DesignationId = des.DesignationId LEFT JOIN SalaryGroups sg ON es.SalaryGroupId = sg.SalaryGroupId WHERE (@EmployeeId IS NULL OR es.EmployeeId = @EmployeeId) AND (@SalaryGroupId IS NULL OR es.SalaryGroupId = @SalaryGroupId) AND (@IsActive IS NULL OR es.IsActive = @IsActive) ORDER BY e.FirstName, es.EffectiveFrom DESC; END
GO
CREATE OR ALTER PROCEDURE sp_CreateEmployeeSalary @EmployeeId INT, @SalaryGroupId INT = NULL, @BaseSalary DECIMAL(18, 2), @SalaryCycle NVARCHAR(20) = 'Monthly', @Currency NVARCHAR(10) = 'USD', @AllowPayrollGenerate BIT = 0, @NetSalaryMonthly DECIMAL(18, 2) = NULL, @EffectiveFrom DATE, @EffectiveTo DATE = NULL AS
BEGIN UPDATE EmployeeSalary SET IsActive = 0, EffectiveTo = DATEADD(DAY, -1, @EffectiveFrom) WHERE EmployeeId = @EmployeeId AND IsActive = 1 AND EffectiveFrom < @EffectiveFrom; INSERT INTO EmployeeSalary (EmployeeId, SalaryGroupId, BaseSalary, SalaryCycle, Currency, AllowPayrollGenerate, NetSalaryMonthly, EffectiveFrom, EffectiveTo) VALUES (@EmployeeId, @SalaryGroupId, @BaseSalary, @SalaryCycle, @Currency, @AllowPayrollGenerate, @NetSalaryMonthly, @EffectiveFrom, @EffectiveTo); SELECT SCOPE_IDENTITY() AS EmployeeSalaryId; END
GO
CREATE OR ALTER PROCEDURE sp_GetAllPayrollComponents @ComponentType NVARCHAR(20) = NULL AS BEGIN SELECT * FROM PayrollComponents WHERE IsActive = 1 AND (@ComponentType IS NULL OR ComponentType = @ComponentType) ORDER BY ComponentType, ComponentName; END
GO
CREATE OR ALTER PROCEDURE sp_CreatePayrollComponent @ComponentName NVARCHAR(100), @ComponentType NVARCHAR(20), @CalculationType NVARCHAR(20), @DefaultValue DECIMAL(18, 2) = 0, @Description NVARCHAR(500) = NULL AS
BEGIN INSERT INTO PayrollComponents (ComponentName, ComponentType, CalculationType, DefaultValue, Description) VALUES (@ComponentName, @ComponentType, @CalculationType, @DefaultValue, @Description); SELECT SCOPE_IDENTITY() AS ComponentId; END
GO
CREATE OR ALTER PROCEDURE sp_GetAllPayroll @EmployeeId INT = NULL, @Status NVARCHAR(20) = NULL, @FromDate DATE = NULL, @ToDate DATE = NULL, @Year INT = NULL, @Month INT = NULL, @SalaryCycle NVARCHAR(20) = NULL AS
BEGIN SELECT p.*, e.EmployeeCode, e.FirstName, e.LastName, e.SalaryType, d.DepartmentName, des.DesignationName, (p.BaseSalary + p.TotalEarnings) AS CTC FROM Payroll p JOIN Employees e ON p.EmployeeId = e.EmployeeId LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId LEFT JOIN Designations des ON e.DesignationId = des.DesignationId WHERE (@EmployeeId IS NULL OR p.EmployeeId = @EmployeeId) AND (@Status IS NULL OR p.Status = @Status) AND (@FromDate IS NULL OR p.PayPeriodStart >= @FromDate) AND (@ToDate IS NULL OR p.PayPeriodEnd <= @ToDate) AND (@Year IS NULL OR YEAR(p.PayPeriodStart) = @Year) AND (@Month IS NULL OR MONTH(p.PayPeriodStart) = @Month) AND (@SalaryCycle IS NULL OR e.SalaryType = @SalaryCycle) ORDER BY p.PayPeriodStart DESC; END
GO
CREATE OR ALTER PROCEDURE sp_GetPayrollById @PayrollId INT AS
BEGIN SELECT p.*, e.EmployeeCode, e.FirstName, e.LastName, e.Email, e.Phone, d.DepartmentName, des.DesignationName FROM Payroll p JOIN Employees e ON p.EmployeeId = e.EmployeeId LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId LEFT JOIN Designations des ON e.DesignationId = des.DesignationId WHERE p.PayrollId = @PayrollId; SELECT pd.*, pc.ComponentType, pc.CalculationType FROM PayrollDetails pd LEFT JOIN PayrollComponents pc ON pd.ComponentId = pc.ComponentId WHERE pd.PayrollId = @PayrollId ORDER BY pd.ComponentType DESC, pd.ComponentName; END
GO
CREATE OR ALTER PROCEDURE sp_CalculateAttendanceForPeriod @EmployeeId INT, @StartDate DATE, @EndDate DATE AS
BEGIN DECLARE @TotalDays INT = DATEDIFF(DAY, @StartDate, @EndDate) + 1, @Holidays INT, @WorkingDays INT, @PresentDays INT, @LeaveDays INT, @AbsentDays INT; SELECT @Holidays = COUNT(*) FROM Holidays WHERE HolidayDate BETWEEN @StartDate AND @EndDate AND Status = 'Active'; SELECT @WorkingDays = COUNT(*) FROM (SELECT DATEADD(DAY, number, @StartDate) AS DateValue FROM master..spt_values WHERE type = 'P' AND number <= DATEDIFF(DAY, @StartDate, @EndDate)) AS Dates WHERE NOT EXISTS (SELECT 1 FROM Holidays h WHERE h.HolidayDate = Dates.DateValue AND h.Status = 'Active') AND (DATEPART(dw, Dates.DateValue) + @@DATEFIRST - 1) % 7 <> 0; SELECT @PresentDays = COUNT(*) FROM Attendance WHERE EmployeeId = @EmployeeId AND AttendanceDate BETWEEN @StartDate AND @EndDate AND Status IN ('Present', 'Half Day'); SELECT @LeaveDays = COUNT(*) FROM (SELECT DATEADD(DAY, number, @StartDate) AS DateValue FROM master..spt_values WHERE type = 'P' AND number <= DATEDIFF(DAY, @StartDate, @EndDate)) AS Dates WHERE EXISTS (SELECT 1 FROM Leaves l WHERE l.EmployeeId = @EmployeeId AND l.Status = 'Approved' AND Dates.DateValue BETWEEN l.FromDate AND l.ToDate) AND NOT EXISTS (SELECT 1 FROM Holidays h WHERE h.HolidayDate = Dates.DateValue AND h.Status = 'Active') AND (DATEPART(dw, Dates.DateValue) + @@DATEFIRST - 1) % 7 <> 0; SET @AbsentDays = @WorkingDays - @PresentDays - @LeaveDays; IF @AbsentDays < 0 SET @AbsentDays = 0; SELECT ISNULL(@WorkingDays, 0) AS WorkingDays, ISNULL(@PresentDays, 0) AS PresentDays, ISNULL(@AbsentDays, 0) AS AbsentDays, ISNULL(@LeaveDays, 0) AS LeaveDays, ISNULL(@Holidays, 0) AS Holidays, ISNULL(@TotalDays, 0) AS TotalDays; END
GO
CREATE OR ALTER PROCEDURE sp_GeneratePayroll @EmployeeId INT, @PayPeriodStart DATE, @PayPeriodEnd DATE, @PayDate DATE, @IncludeExpenseClaims BIT = 0, @AddSewerageToSalary BIT = 0, @UseAttendance BIT = 1 AS
BEGIN DECLARE @BaseSalary DECIMAL(18, 2), @WorkingDays INT, @PresentDays INT, @AbsentDays INT, @LeaveDays INT, @TotalEarnings DECIMAL(18, 2) = 0, @TotalDeductions DECIMAL(18, 2) = 0, @NetSalary DECIMAL(18, 2), @PayrollId INT; SELECT @BaseSalary = ISNULL(Salary, 0) FROM Employees WHERE EmployeeId = @EmployeeId; IF @BaseSalary = 0 THROW 50003, 'Salary not configured.', 1; IF @UseAttendance = 1 BEGIN DECLARE @Att TABLE (W INT, P INT, A INT, L INT, H INT, T INT); INSERT INTO @Att EXEC sp_CalculateAttendanceForPeriod @EmployeeId, @PayPeriodStart, @PayPeriodEnd; SELECT @WorkingDays = W, @PresentDays = P, @AbsentDays = A, @LeaveDays = L FROM @Att; IF @AbsentDays > 0 AND @WorkingDays > 0 SET @BaseSalary = @BaseSalary * (@PresentDays + @LeaveDays) / @WorkingDays; END ELSE BEGIN SET @WorkingDays = DATEDIFF(DAY, @PayPeriodStart, @PayPeriodEnd) + 1; SET @PresentDays = @WorkingDays; SET @AbsentDays = 0; SET @LeaveDays = 0; END; INSERT INTO Payroll (EmployeeId, PayPeriodStart, PayPeriodEnd, PayDate, BaseSalary, TotalEarnings, TotalDeductions, NetSalary, WorkingDays, PresentDays, AbsentDays, LeaveDays) VALUES (@EmployeeId, @PayPeriodStart, @PayPeriodEnd, @PayDate, @BaseSalary, 0, 0, @BaseSalary, @WorkingDays, @PresentDays, @AbsentDays, @LeaveDays); SET @PayrollId = SCOPE_IDENTITY(); INSERT INTO PayrollDetails (PayrollId, ComponentId, ComponentName, ComponentType, Amount) SELECT @PayrollId, ComponentId, ComponentName, ComponentType, CASE WHEN CalculationType = 'Fixed' THEN DefaultValue WHEN CalculationType = 'Percentage' THEN (@BaseSalary * DefaultValue / 100) END FROM PayrollComponents WHERE ComponentType = 'Earning' AND IsActive = 1; INSERT INTO PayrollDetails (PayrollId, ComponentId, ComponentName, ComponentType, Amount) SELECT @PayrollId, ComponentId, ComponentName, ComponentType, CASE WHEN CalculationType = 'Fixed' THEN DefaultValue WHEN CalculationType = 'Percentage' THEN (@BaseSalary * DefaultValue / 100) END FROM PayrollComponents WHERE ComponentType = 'Deduction' AND IsActive = 1; SELECT @TotalEarnings = ISNULL(SUM(Amount), 0) FROM PayrollDetails WHERE PayrollId = @PayrollId AND ComponentType = 'Earning'; SELECT @TotalDeductions = ISNULL(SUM(Amount), 0) FROM PayrollDetails WHERE PayrollId = @PayrollId AND ComponentType = 'Deduction'; SET @NetSalary = @BaseSalary + @TotalEarnings - @TotalDeductions; UPDATE Payroll SET TotalEarnings = @TotalEarnings, TotalDeductions = @TotalDeductions, NetSalary = @NetSalary WHERE PayrollId = @PayrollId; SELECT @PayrollId AS PayrollId; END
GO

-- =============================================
-- 8. ASSETS PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllAssets AS BEGIN SELECT a.*, aa.EmployeeID, e.FirstName + ' ' + e.LastName AS AssignedTo FROM Assets a LEFT JOIN AssetAssign aa ON a.AssetID = aa.AssetID AND aa.ReturnDate IS NULL AND a.Status = 'Assigned' LEFT JOIN Employees e ON aa.EmployeeID = e.EmployeeID ORDER BY a.CreatedAt DESC; END
GO
CREATE OR ALTER PROCEDURE sp_CreateAsset @AssetCode VARCHAR(50), @AssetName VARCHAR(100), @Category VARCHAR(50), @Brand VARCHAR(100), @Model VARCHAR(100), @SerialNumber VARCHAR(100), @PurchaseDate DATE, @AssetCondition VARCHAR(50), @AssetPhoto VARCHAR(255), @Status VARCHAR(50) = 'Available', @Processor VARCHAR(100) = NULL, @RAM VARCHAR(50) = NULL, @Storage VARCHAR(100) = NULL AS
BEGIN INSERT INTO Assets (AssetCode, AssetName, Category, Brand, Model, SerialNumber, PurchaseDate, AssetCondition, AssetPhoto, Status, Processor, RAM, Storage) VALUES (@AssetCode, @AssetName, @Category, @Brand, @Model, @SerialNumber, @PurchaseDate, @AssetCondition, @AssetPhoto, @Status, @Processor, @RAM, @Storage); SELECT SCOPE_IDENTITY() AS AssetID; END
GO
CREATE OR ALTER PROCEDURE sp_AssignAsset @AssetID INT, @EmployeeID INT, @AssignDate DATE, @ReturnDate DATE = NULL, @Remarks NVARCHAR(MAX) = NULL AS
BEGIN BEGIN TRAN; INSERT INTO AssetAssign (AssetID, EmployeeID, AssignDate, ReturnDate, Remarks) VALUES (@AssetID, @EmployeeID, @AssignDate, @ReturnDate, @Remarks); UPDATE Assets SET Status = 'Assigned' WHERE AssetID = @AssetID; COMMIT TRAN; END
GO
CREATE OR ALTER PROCEDURE sp_ReturnAsset @AssetID INT, @ReturnDate DATE, @AssetCondition VARCHAR(50), @Remarks NVARCHAR(MAX) = NULL AS
BEGIN BEGIN TRAN; UPDATE AssetAssign SET ReturnDate = @ReturnDate, AssetCondition = @AssetCondition, Remarks = ISNULL(Remarks + char(10) + @Remarks, @Remarks) WHERE AssetID = @AssetID AND ReturnDate IS NULL; UPDATE Assets SET Status = 'Available', AssetCondition = @AssetCondition WHERE AssetID = @AssetID; COMMIT TRAN; END
GO

-- =============================================
-- 9. DOCUMENTS PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_UploadDocument @EmployeeId INT, @DocumentType NVARCHAR(50), @OriginalName NVARCHAR(255), @FileName NVARCHAR(255), @MimeType NVARCHAR(50), @FileSize INT, @FileUrl NVARCHAR(500), @FileData VARBINARY(MAX) AS
BEGIN IF EXISTS (SELECT 1 FROM EmployeeDocuments WHERE EmployeeId = @EmployeeId AND DocumentType = @DocumentType) BEGIN UPDATE EmployeeDocuments SET OriginalName = @OriginalName, FileName = @FileName, MimeType = @MimeType, FileSize = @FileSize, FileUrl = @FileUrl, FileData = @FileData, UploadDate = GETDATE() WHERE EmployeeId = @EmployeeId AND DocumentType = @DocumentType; END ELSE BEGIN INSERT INTO EmployeeDocuments (EmployeeId, DocumentType, OriginalName, FileName, MimeType, FileSize, FileUrl, FileData) VALUES (@EmployeeId, @DocumentType, @OriginalName, @FileName, @MimeType, @FileSize, @FileUrl, @FileData); END SELECT DocumentId, EmployeeId, DocumentType, OriginalName, FileName, MimeType, FileSize, FileUrl, UploadDate FROM EmployeeDocuments WHERE EmployeeId = @EmployeeId AND DocumentType = @DocumentType; END
GO
CREATE OR ALTER PROCEDURE sp_GetEmployeeDocuments @EmployeeId INT AS BEGIN SELECT DocumentId, EmployeeId, DocumentType, OriginalName, FileName, MimeType, FileSize, FileUrl, UploadDate FROM EmployeeDocuments WHERE EmployeeId = @EmployeeId ORDER BY UploadDate DESC; END
GO
CREATE OR ALTER PROCEDURE sp_GetEmployeeDocumentFile @EmployeeId INT, @DocumentType NVARCHAR(50) AS BEGIN SELECT FileData, MimeType, OriginalName FROM EmployeeDocuments WHERE EmployeeId = @EmployeeId AND DocumentType = @DocumentType; END
GO

-- =============================================
-- 10. NOTES PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllNotes @EmployeeId INT = NULL AS
BEGIN SELECT n.NoteId, n.EmployeeId, n.Title, n.Description, n.CreatedAt, e.FirstName, e.LastName, des.DesignationName AS Designation FROM Notes n INNER JOIN Employees e ON n.EmployeeId = e.EmployeeId LEFT JOIN Designations des ON e.DesignationId = des.DesignationId WHERE (@EmployeeId IS NULL OR n.EmployeeId = @EmployeeId) ORDER BY n.CreatedAt DESC; END
GO
CREATE OR ALTER PROCEDURE sp_CreateNote @EmployeeId INT, @Title NVARCHAR(100), @Description NVARCHAR(MAX) = NULL AS
BEGIN INSERT INTO Notes (EmployeeId, Title, Description, CreatedAt) VALUES (@EmployeeId, @Title, @Description, GETDATE()); SELECT SCOPE_IDENTITY() AS NoteId; END
GO
CREATE OR ALTER PROCEDURE sp_DeleteNote @NoteId INT AS
BEGIN DELETE FROM Notes WHERE NoteId = @NoteId; SELECT @@ROWCOUNT AS RowsAffected; END
GO

-- =============================================
-- 11. CALENDAR & TIMESHEET PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_CreateCalendarEvent @Title NVARCHAR(200), @Description NVARCHAR(1000) = NULL, @EventDate DATE, @EventTime TIME = NULL, @EventType NVARCHAR(50), @Color NVARCHAR(20) = NULL, @CreatedBy INT = NULL AS
BEGIN INSERT INTO CalendarEvents (Title, Description, EventDate, EventTime, EventType, Color, CreatedBy) VALUES (@Title, @Description, @EventDate, @EventTime, @EventType, @Color, @CreatedBy); SELECT SCOPE_IDENTITY() AS EventId; END
GO
CREATE OR ALTER PROCEDURE sp_GetCalendarEvents @StartDate DATE, @EndDate DATE AS
BEGIN SELECT EventId, Title, Description, EventDate, EventTime, EventType, Color, CreatedBy, CreatedAt FROM CalendarEvents WHERE EventDate BETWEEN @StartDate AND @EndDate; END
GO
CREATE OR ALTER PROCEDURE sp_CreateTimesheet @EmployeeId INT, @Date DATE, @Project NVARCHAR(200) = NULL, @Task NVARCHAR(200) = NULL, @Description NVARCHAR(1000) = NULL, @StartTime TIME = NULL, @EndTime TIME = NULL, @TotalHours DECIMAL(5,2) = NULL AS
BEGIN INSERT INTO Timesheets (EmployeeId, Date, Project, Task, Description, StartTime, EndTime, TotalHours, Status) VALUES (@EmployeeId, @Date, @Project, @Task, @Description, @StartTime, @EndTime, @TotalHours, 'Pending'); SELECT SCOPE_IDENTITY() AS TimesheetId; END
GO
CREATE OR ALTER PROCEDURE sp_GetTimesheets @EmployeeId INT = NULL, @ManagerId INT = NULL, @StartDate DATE = NULL, @EndDate DATE = NULL, @Status NVARCHAR(20) = NULL AS
BEGIN SELECT t.*, e.FirstName, e.LastName, e.EmployeeCode, a.FirstName AS ApproverFirstName, a.LastName AS ApproverLastName FROM Timesheets t INNER JOIN Employees e ON t.EmployeeId = e.EmployeeId LEFT JOIN Employees a ON t.ApprovedBy = a.EmployeeId WHERE (@EmployeeId IS NULL OR t.EmployeeId = @EmployeeId) AND (@StartDate IS NULL OR t.Date >= @StartDate) AND (@EndDate IS NULL OR t.Date <= @EndDate) AND (@Status IS NULL OR t.Status = @Status) AND (@ManagerId IS NULL OR e.ReportingTo = @ManagerId OR t.EmployeeId = @ManagerId) ORDER BY t.Date DESC; END
GO

-- =============================================
-- 12. APPRECIATION PROCEDURES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllAppreciations @EmployeeId  INT = NULL, @ShowDeleted BIT = 0 AS
BEGIN SELECT a.*, e.FirstName + ' ' + e.LastName AS EmployeeName, e.EmployeeCode FROM Appreciations a INNER JOIN Employees e ON a.EmployeeId = e.EmployeeId WHERE (@EmployeeId IS NULL OR a.EmployeeId = @EmployeeId) AND (@ShowDeleted = 1 OR a.IsDeleted = 0) ORDER BY a.AppreciationDate DESC; END
GO
CREATE OR ALTER PROCEDURE sp_CreateAppreciation @EmployeeId INT, @Title NVARCHAR(200), @Description NVARCHAR(1000) = NULL, @AppreciationDate DATE, @AwardedBy NVARCHAR(100) = NULL, @Photo NVARCHAR(500) = NULL AS
BEGIN INSERT INTO Appreciations (EmployeeId, Title, Description, AppreciationDate, AwardedBy, Photo) VALUES (@EmployeeId, @Title, @Description, @AppreciationDate, @AwardedBy, @Photo); SELECT SCOPE_IDENTITY() AS AppreciationId; END
GO
CREATE OR ALTER PROCEDURE sp_UpdateAppreciation @AppreciationId INT, @Title NVARCHAR(200), @Description NVARCHAR(1000) = NULL, @AppreciationDate DATE, @AwardedBy NVARCHAR(100) = NULL, @Photo NVARCHAR(500) = NULL AS
BEGIN UPDATE Appreciations SET Title = @Title, Description = @Description, AppreciationDate = @AppreciationDate, AwardedBy = @AwardedBy, Photo = ISNULL(@Photo, Photo) WHERE AppreciationId = @AppreciationId; END
GO
CREATE OR ALTER PROCEDURE sp_SoftDeleteAppreciation @AppreciationId INT, @DeletedBy NVARCHAR(100), @DeleteReason NVARCHAR(500) = NULL AS
BEGIN UPDATE Appreciations SET IsDeleted = 1, DeletedAt = GETDATE(), DeletedBy = @DeletedBy, DeleteReason = @DeleteReason, UpdatedAt = GETDATE() WHERE AppreciationId = @AppreciationId AND IsDeleted = 0; SELECT @@ROWCOUNT AS AffectedRows; END
GO