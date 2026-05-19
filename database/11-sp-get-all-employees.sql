CREATE PROCEDURE [dbo].[sp_GetAllEmployees]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.EmployeeId,
        e.EmployeeCode,
        e.FirstName,
        e.LastName,
        e.Email,
        e.Phone,
        e.DateOfJoining,
        e.DepartmentId,
        d.DepartmentName,
        e.DesignationId,
        des.DesignationName,
        e.ReportingTo,
        r.FirstName + ' ' + r.LastName AS ReportingToName,
        e.Status,
        e.ProfilePicture
    FROM Employees e
    LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
    LEFT JOIN Employees r ON e.ReportingTo = r.EmployeeId
    WHERE e.IsDeleted = 0
    ORDER BY e.FirstName, e.LastName;
END
GO
