-- ============================================================
-- Run this in SSMS connected as sa or a sysadmin account
-- ============================================================

-- STEP 1: Enable SQL Server Mixed Authentication (SQL + Windows)
USE [master];
EXEC xp_instance_regwrite
    N'HKEY_LOCAL_MACHINE',
    N'Software\Microsoft\MSSQLServer\MSSQLServer',
    N'LoginMode',
    REG_DWORD,
    2;
GO

-- STEP 2: Create HRMS database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'HRMS')
BEGIN
    CREATE DATABASE [HRMS];
    PRINT 'Database HRMS created.';
END
ELSE
    PRINT 'Database HRMS already exists.';
GO

-- STEP 3: Create the server login
USE [master];
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'hrms_user')
BEGIN
    CREATE LOGIN [hrms_user]
        WITH PASSWORD   = 'Hrms@2026',
             DEFAULT_DATABASE = [HRMS],
             CHECK_EXPIRATION = OFF,
             CHECK_POLICY     = OFF;
    PRINT 'Login hrms_user created.';
END
ELSE
BEGIN
    ALTER LOGIN [hrms_user] WITH PASSWORD = 'Hrms@2026', CHECK_POLICY = OFF;
    ALTER LOGIN [hrms_user] ENABLE;
    PRINT 'Login hrms_user updated and enabled.';
END
GO

-- STEP 4: Create DB user inside HRMS and grant db_owner
USE [HRMS];
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'hrms_user')
BEGIN
    CREATE USER [hrms_user] FOR LOGIN [hrms_user];
    PRINT 'DB user hrms_user created.';
END
ELSE
    PRINT 'DB user hrms_user already exists.';

ALTER ROLE [db_owner] ADD MEMBER [hrms_user];
PRINT 'db_owner role granted.';
GO

-- ============================================================
-- IMPORTANT: After running this script, restart SQL Server:
--   Services > SQL Server (MSSQLSERVER) > Restart
-- Then test the connection with: node test-db-connection.js
-- ============================================================
