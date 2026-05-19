-- Seed Calendar Data for March 2026
USE HRMS;
GO

-- 1. Insert some user-created events
INSERT INTO CalendarEvents (title, description, event_date, event_time, event_type, color, created_by)
VALUES 
('Project Sync Meeting', 'Review progress on HRMS migration', '2026-03-27', '10:00:00', 'Meeting', '#3788d8', 1),
('Hardik''s Birthday Celebration', 'Cake cutting in the common area', '2026-03-28', '16:00:00', 'Birthday', '#9b59b6', 1),
('Interview: Senior Developer', 'Candidate: John Doe', '2026-03-30', '11:00:00', 'Interview', '#f1c40f', 1);

-- 2. Ensure some holidays exist in March 2026 (if not already there)
-- Holi is usually in March. Let's add it if it doesn't exist.
IF NOT EXISTS (SELECT 1 FROM Holidays WHERE HolidayDate = '2026-03-14')
BEGIN
    INSERT INTO Holidays (HolidayName, HolidayDate, Description, Year, Status)
    VALUES ('Holi Festival', '2026-03-14', 'Festival of Colors', 2026, 'Active');
END

-- 3. Ensure some approved leaves exist in March 2026
-- Let's say EmployeeId 2 has a leave from March 24 to March 26
IF EXISTS (SELECT 1 FROM Employees WHERE EmployeeId = 2)
BEGIN
    -- Check if leave type exists, if not use ID 1
    DECLARE @LTID INT = (SELECT TOP 1 LeaveTypeId FROM LeaveTypes);
    IF @LTID IS NULL SET @LTID = 1;

    INSERT INTO Leaves (EmployeeId, LeaveTypeId, FromDate, ToDate, Reason, Status, AppliedDate)
    VALUES (2, @LTID, '2026-03-24', '2026-03-26', 'Family vacaction', 'Approved', GETDATE());
END

PRINT 'Seed data for March 2026 inserted successfully!';
GO
