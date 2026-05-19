-- =============================================
-- Migration: Create TaxConfiguration Table
-- =============================================
USE HRMS;
GO

IF OBJECT_ID('TaxConfiguration', 'U') IS NOT NULL DROP TABLE TaxConfiguration;
GO

CREATE TABLE TaxConfiguration (
    ConfigKey VARCHAR(50) PRIMARY KEY,
    ConfigValue DECIMAL(10,2) NOT NULL,
    EffectiveDate DATE DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1,
    Description NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Seed initial tax settings
INSERT INTO TaxConfiguration (ConfigKey, ConfigValue, Description) VALUES
('INCOME_TAX_RATE', 10.00, 'Default Income Tax percentage (TDS)'),
('PROFESSIONAL_TAX_AMOUNT', 200.00, 'Fixed Professional Tax amount'),
('PROVIDENT_FUND_RATE', 12.00, 'Default PF percentage');
GO

PRINT '✅ TaxConfiguration table created and seeded.';
GO
