IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Assets')
BEGIN
    CREATE TABLE Assets (
        AssetID INT IDENTITY(1,1) PRIMARY KEY,
        AssetCode VARCHAR(50) UNIQUE NOT NULL,
        AssetName VARCHAR(100) NOT NULL,
        Category VARCHAR(50) NOT NULL,
        Brand VARCHAR(100),
        Model VARCHAR(100),
        SerialNumber VARCHAR(100),
        PurchaseDate DATE,
        AssetCondition VARCHAR(50) DEFAULT 'New',
        AssetPhoto VARCHAR(255),
        Status VARCHAR(50) DEFAULT 'Available',
        Processor VARCHAR(100),
        RAM VARCHAR(50),
        Storage VARCHAR(100),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Assets') AND name = 'Processor')
BEGIN
    ALTER TABLE Assets ADD Processor VARCHAR(100);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Assets') AND name = 'RAM')
BEGIN
    ALTER TABLE Assets ADD RAM VARCHAR(50);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Assets') AND name = 'Storage')
BEGIN
    ALTER TABLE Assets ADD Storage VARCHAR(100);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssetAssign')
BEGIN
    CREATE TABLE AssetAssign (
        AssignID INT IDENTITY(1,1) PRIMARY KEY,
        AssetID INT FOREIGN KEY REFERENCES Assets(AssetID),
        EmployeeID INT FOREIGN KEY REFERENCES Employees(EmployeeID),
        AssignDate DATE NOT NULL,
        ReturnDate DATE,
        AssetCondition VARCHAR(50),
        Remarks NVARCHAR(MAX),
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO
