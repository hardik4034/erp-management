-- =============================================
-- STEP 1: Create Database and User
-- Run this FIRST in SQL Server Management Studio
-- =============================================

-- Create the HRMS database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'HRMS')
BEGIN
    CREATE DATABASE HRMS;
    PRINT '✅ Database HRMS created successfully';
END
ELSE
BEGIN
    PRINT '✅ Database HRMS already exists';
END
GO

-- Create login and user
CREATE LOGIN hrms_user WITH PASSWORD = 'Hrms@2026';
PRINT '✅ Login hrms_user created';
GO

-- Switch to HRMS database
USE HRMS;
GO

-- Create user for the login
CREATE USER hrms_user FOR LOGIN hrms_user;
PRINT '✅ User hrms_user created in HRMS database';
GO

-- Give full permissions
ALTER ROLE db_owner ADD MEMBER hrms_user;
PRINT '✅ User hrms_user granted db_owner role';
GO

PRINT '';
PRINT '========================================';
PRINT '✅ Setup Complete!';
PRINT 'Database: HRMS';
PRINT 'User: hrms_user';
PRINT 'Password: Hrms@2026';
PRINT '========================================';
PRINT '';
PRINT 'Next step: Run the database-schema.sql file to create tables';
GO
