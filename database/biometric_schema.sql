-- =============================================
-- eSSL Biometric Integration Database Schema
-- MSSQL Server
-- =============================================

-- Table: biometric_devices
-- Stores connected eSSL biometric devices
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[biometric_devices]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[biometric_devices] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [device_id] NVARCHAR(100) NOT NULL UNIQUE,
        [device_name] NVARCHAR(200) NULL,
        [status] NVARCHAR(50) DEFAULT 'active' CHECK ([status] IN ('active', 'inactive', 'error')),
        [last_sync] DATETIME NULL,
        [created_at] DATETIME DEFAULT GETDATE(),
        [updated_at] DATETIME DEFAULT GETDATE()
    );
    
    PRINT 'Table biometric_devices created successfully.';
END
ELSE
BEGIN
    PRINT 'Table biometric_devices already exists.';
END
GO

-- Table: biometric_logs
-- Stores raw attendance punch logs from eSSL devices
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[biometric_logs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[biometric_logs] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [device_id] NVARCHAR(100) NOT NULL,
        [biometric_user_id] NVARCHAR(50) NOT NULL,
        [punch_time] DATETIME NOT NULL,
        [punch_type] NVARCHAR(20) NULL, -- 'IN', 'OUT', 'BREAK'
        [raw_json] NVARCHAR(MAX) NULL,
        [processed] BIT DEFAULT 0,
        [created_at] DATETIME DEFAULT GETDATE(),
        
        -- Foreign key to biometric_devices
        CONSTRAINT [FK_biometric_logs_device] 
            FOREIGN KEY ([device_id]) 
            REFERENCES [dbo].[biometric_devices]([device_id])
            ON DELETE CASCADE
    );
    
    -- Index for faster queries
    CREATE INDEX [IX_biometric_logs_device_user] 
        ON [dbo].[biometric_logs]([device_id], [biometric_user_id]);
    
    CREATE INDEX [IX_biometric_logs_punch_time] 
        ON [dbo].[biometric_logs]([punch_time]);
    
    CREATE INDEX [IX_biometric_logs_processed] 
        ON [dbo].[biometric_logs]([processed]);
    
    PRINT 'Table biometric_logs created successfully.';
END
ELSE
BEGIN
    PRINT 'Table biometric_logs already exists.';
END
GO

-- Add biometric_id column to employees table
-- =============================================
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[employees]') 
    AND name = 'biometric_id'
)
BEGIN
    ALTER TABLE [dbo].[employees]
    ADD [biometric_id] NVARCHAR(50) NULL;
    
    -- Create unique index to prevent duplicate biometric IDs
    CREATE UNIQUE INDEX [IX_employees_biometric_id] 
        ON [dbo].[employees]([biometric_id])
        WHERE [biometric_id] IS NOT NULL;
    
    PRINT 'Column biometric_id added to employees table.';
END
ELSE
BEGIN
    PRINT 'Column biometric_id already exists in employees table.';
END
GO

-- =============================================
-- Sample View: Employee Attendance Summary
-- (Optional - for reporting purposes)
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[vw_employee_biometric_attendance]'))
BEGIN
    DROP VIEW [dbo].[vw_employee_biometric_attendance];
END
GO

CREATE VIEW [dbo].[vw_employee_biometric_attendance]
AS
SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    e.biometric_id,
    bl.device_id,
    bl.punch_time,
    bl.punch_type,
    bl.processed,
    bl.created_at
FROM 
    [dbo].[employees] e
    INNER JOIN [dbo].[biometric_logs] bl 
        ON e.biometric_id = bl.biometric_user_id
WHERE 
    e.biometric_id IS NOT NULL;
GO

PRINT 'View vw_employee_biometric_attendance created successfully.';
GO

-- =============================================
-- Verification Queries
-- =============================================
PRINT '==============================================';
PRINT 'Schema creation completed!';
PRINT '==============================================';
PRINT 'Verify tables:';
SELECT 
    name AS TableName,
    create_date AS CreatedDate
FROM sys.tables
WHERE name IN ('biometric_devices', 'biometric_logs', 'employees')
ORDER BY name;
