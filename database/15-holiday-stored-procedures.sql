-- =============================================
-- Holiday Stored Procedures
-- Database: HRMS
-- Run this script once to create all holiday SPs
-- =============================================

USE HRMS;
GO

-- =============================================
-- Create Holidays table if it doesn't exist
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Holidays')
BEGIN
    CREATE TABLE Holidays (
        HolidayId   INT PRIMARY KEY IDENTITY(1,1),
        HolidayName NVARCHAR(100) NOT NULL,
        HolidayDate DATE NOT NULL,
        Description NVARCHAR(500),
        Year        INT NOT NULL,
        Status      NVARCHAR(20) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
        CreatedAt   DATETIME DEFAULT GETDATE(),
        UpdatedAt   DATETIME DEFAULT GETDATE()
    );
    PRINT 'Holidays table created.';
END
ELSE
    PRINT 'Holidays table already exists.';
GO

-- =============================================
-- sp_GetAllHolidays
-- =============================================
IF OBJECT_ID('sp_GetAllHolidays', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetAllHolidays;
GO
CREATE PROCEDURE sp_GetAllHolidays
    @Year INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        HolidayId,
        HolidayName,
        HolidayDate,
        Description,
        Year,
        Status,
        CreatedAt,
        UpdatedAt
    FROM Holidays
    WHERE Status = 'Active'
      AND (@Year IS NULL OR Year = @Year)
    ORDER BY HolidayDate ASC;
END
GO

-- =============================================
-- sp_CreateHoliday
-- =============================================
IF OBJECT_ID('sp_CreateHoliday', 'P') IS NOT NULL
    DROP PROCEDURE sp_CreateHoliday;
GO
CREATE PROCEDURE sp_CreateHoliday
    @HolidayName NVARCHAR(100),
    @HolidayDate DATE,
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year INT = YEAR(@HolidayDate);

    INSERT INTO Holidays (HolidayName, HolidayDate, Description, Year)
    VALUES (@HolidayName, @HolidayDate, @Description, @Year);

    SELECT
        HolidayId,
        HolidayName,
        HolidayDate,
        Description,
        Year,
        Status,
        CreatedAt
    FROM Holidays
    WHERE HolidayId = SCOPE_IDENTITY();
END
GO

-- =============================================
-- sp_UpdateHoliday
-- =============================================
IF OBJECT_ID('sp_UpdateHoliday', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateHoliday;
GO
CREATE PROCEDURE sp_UpdateHoliday
    @HolidayId   INT,
    @HolidayName NVARCHAR(100),
    @HolidayDate DATE,
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year INT = YEAR(@HolidayDate);

    UPDATE Holidays
    SET
        HolidayName = @HolidayName,
        HolidayDate = @HolidayDate,
        Description = @Description,
        Year        = @Year,
        UpdatedAt   = GETDATE()
    WHERE HolidayId = @HolidayId;

    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

-- =============================================
-- sp_DeleteHoliday  (soft delete)
-- =============================================
IF OBJECT_ID('sp_DeleteHoliday', 'P') IS NOT NULL
    DROP PROCEDURE sp_DeleteHoliday;
GO
CREATE PROCEDURE sp_DeleteHoliday
    @HolidayId INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Holidays
    SET Status    = 'Inactive',
        UpdatedAt = GETDATE()
    WHERE HolidayId = @HolidayId;

    SELECT @@ROWCOUNT AS AffectedRows;
END
GO

PRINT 'All Holiday stored procedures created successfully!';
GO
