-- Create Asset
CREATE OR ALTER PROCEDURE sp_CreateAsset
    @AssetCode VARCHAR(50),
    @AssetName VARCHAR(100),
    @Category VARCHAR(50),
    @Brand VARCHAR(100),
    @Model VARCHAR(100),
    @SerialNumber VARCHAR(100),
    @PurchaseDate DATE,
    @AssetCondition VARCHAR(50),
    @AssetPhoto VARCHAR(255),
    @Status VARCHAR(50) = 'Available',
    @Processor VARCHAR(100) = NULL,
    @RAM VARCHAR(50) = NULL,
    @Storage VARCHAR(100) = NULL
AS
BEGIN
    INSERT INTO Assets (AssetCode, AssetName, Category, Brand, Model, SerialNumber, PurchaseDate, AssetCondition, AssetPhoto, Status, Processor, RAM, Storage)
    VALUES (@AssetCode, @AssetName, @Category, @Brand, @Model, @SerialNumber, @PurchaseDate, @AssetCondition, @AssetPhoto, @Status, @Processor, @RAM, @Storage);
    
    SELECT SCOPE_IDENTITY() AS AssetID;
END
GO

-- Update Asset
CREATE OR ALTER PROCEDURE sp_UpdateAsset
    @AssetID INT,
    @AssetName VARCHAR(100),
    @Category VARCHAR(50),
    @Brand VARCHAR(100),
    @Model VARCHAR(100),
    @SerialNumber VARCHAR(100),
    @PurchaseDate DATE,
    @AssetCondition VARCHAR(50),
    @AssetPhoto VARCHAR(255),
    @Status VARCHAR(50),
    @Processor VARCHAR(100) = NULL,
    @RAM VARCHAR(50) = NULL,
    @Storage VARCHAR(100) = NULL
AS
BEGIN
    UPDATE Assets
    SET AssetName = @AssetName,
        Category = @Category,
        Brand = @Brand,
        Model = @Model,
        SerialNumber = @SerialNumber,
        PurchaseDate = @PurchaseDate,
        AssetCondition = @AssetCondition,
        AssetPhoto = ISNULL(@AssetPhoto, AssetPhoto),
        Status = @Status,
        Processor = @Processor,
        RAM = @RAM,
        Storage = @Storage
    WHERE AssetID = @AssetID;
END
GO

-- Delete Asset
CREATE OR ALTER PROCEDURE sp_DeleteAsset
    @AssetID INT
AS
BEGIN
    DELETE FROM AssetAssign WHERE AssetID = @AssetID;
    DELETE FROM Assets WHERE AssetID = @AssetID;
END
GO

-- Get All Assets
CREATE OR ALTER PROCEDURE sp_GetAllAssets
AS
BEGIN
    SELECT 
        a.AssetID, a.AssetCode, a.AssetName, a.Category, a.Brand, a.Model, 
        a.SerialNumber, a.PurchaseDate, a.AssetCondition, a.AssetPhoto, a.Status, 
        a.Processor, a.RAM, a.Storage, a.CreatedAt,
        -- Get current assignment info if assigned
        aa.EmployeeID,
        e.FirstName + ' ' + e.LastName AS AssignedTo
    FROM Assets a
    LEFT JOIN AssetAssign aa ON a.AssetID = aa.AssetID AND aa.ReturnDate IS NULL AND a.Status = 'Assigned'
    LEFT JOIN Employees e ON aa.EmployeeID = e.EmployeeID
    ORDER BY a.CreatedAt DESC;
END
GO

-- Get Asset By ID
CREATE OR ALTER PROCEDURE sp_GetAssetById
    @AssetID INT
AS
BEGIN
    SELECT * FROM Assets WHERE AssetID = @AssetID;
END
GO

-- Assign Asset
CREATE OR ALTER PROCEDURE sp_AssignAsset
    @AssetID INT,
    @EmployeeID INT,
    @AssignDate DATE,
    @ReturnDate DATE = NULL,
    @Remarks NVARCHAR(MAX) = NULL
AS
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION
        
        -- Insert assignment
        INSERT INTO AssetAssign (AssetID, EmployeeID, AssignDate, ReturnDate, Remarks)
        VALUES (@AssetID, @EmployeeID, @AssignDate, @ReturnDate, @Remarks);
        
        -- Update Asset Status
        UPDATE Assets
        SET Status = 'Assigned'
        WHERE AssetID = @AssetID;
        
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION
        THROW;
    END CATCH
END
GO

-- Return Asset
CREATE OR ALTER PROCEDURE sp_ReturnAsset
    @AssetID INT,
    @ReturnDate DATE,
    @AssetCondition VARCHAR(50),
    @Remarks NVARCHAR(MAX) = NULL
AS
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION
        
        -- Update the active assignment
        UPDATE AssetAssign
        SET ReturnDate = @ReturnDate,
            AssetCondition = @AssetCondition,
            Remarks = ISNULL(Remarks + char(10) + @Remarks, @Remarks)
        WHERE AssetID = @AssetID AND ReturnDate IS NULL;
        
        -- Update Asset Status and Condition
        UPDATE Assets
        SET Status = 'Available',
            AssetCondition = @AssetCondition
        WHERE AssetID = @AssetID;
        
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION
        THROW;
    END CATCH
END
GO

-- Get Asset History
CREATE OR ALTER PROCEDURE sp_GetAssetHistory
    @AssetID INT
AS
BEGIN
    SELECT 
        aa.AssignID, aa.AssetID, aa.EmployeeID, 
        e.FirstName + ' ' + e.LastName AS EmployeeName, e.EmployeeCode,
        aa.AssignDate, aa.ReturnDate, aa.AssetCondition, aa.Remarks, aa.CreatedAt
    FROM AssetAssign aa
    JOIN Employees e ON aa.EmployeeID = e.EmployeeID
    WHERE aa.AssetID = @AssetID
    ORDER BY aa.AssignDate DESC;
END
GO

-- Get Assigned Assets By Employee
CREATE OR ALTER PROCEDURE sp_GetAssignedAssetsByEmployee
    @EmployeeID INT
AS
BEGIN
    SELECT 
        a.AssetID, a.AssetCode, a.AssetName, a.Category, a.Brand, a.Model, 
        a.SerialNumber, a.AssetPhoto,
        aa.AssignID, aa.AssignDate, aa.ReturnDate, aa.AssetCondition, aa.Remarks
    FROM AssetAssign aa
    JOIN Assets a ON aa.AssetID = a.AssetID
    WHERE aa.EmployeeID = @EmployeeID AND aa.ReturnDate IS NULL;
END
GO
