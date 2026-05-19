USE HRMS;
GO

-- =============================================
-- Stored Procedure: sp_UploadDocument
-- Description: Upserts an employee document record with binary data
-- =============================================
CREATE OR ALTER PROCEDURE sp_UploadDocument
    @EmployeeId INT,
    @DocumentType NVARCHAR(50),
    @OriginalName NVARCHAR(255),
    @FileName NVARCHAR(255),
    @MimeType NVARCHAR(50),
    @FileSize INT,
    @FileUrl NVARCHAR(500),
    @FileData VARBINARY(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if document type already exists for this employee
    IF EXISTS (SELECT 1 FROM EmployeeDocuments WHERE EmployeeId = @EmployeeId AND DocumentType = @DocumentType)
    BEGIN
        -- Update existing record
        UPDATE EmployeeDocuments
        SET OriginalName = @OriginalName,
            FileName = @FileName,
            MimeType = @MimeType,
            FileSize = @FileSize,
            FileUrl = @FileUrl,
            FileData = @FileData,
            UploadDate = GETDATE()
        WHERE EmployeeId = @EmployeeId AND DocumentType = @DocumentType;
    END
    ELSE
    BEGIN
        -- Insert new record
        INSERT INTO EmployeeDocuments (
            EmployeeId, DocumentType, OriginalName, FileName, MimeType, FileSize, FileUrl, FileData
        )
        VALUES (
            @EmployeeId, @DocumentType, @OriginalName, @FileName, @MimeType, @FileSize, @FileUrl, @FileData
        );
    END
    
    -- Return the inserted/updated record (excluding FileData to save bandwidth)
    SELECT DocumentId, EmployeeId, DocumentType, OriginalName, FileName, MimeType, FileSize, FileUrl, UploadDate 
    FROM EmployeeDocuments 
    WHERE EmployeeId = @EmployeeId AND DocumentType = @DocumentType;
END
GO


-- =============================================
-- Stored Procedure: sp_GetEmployeeDocuments
-- Description: Retrieves all document metadata for an employee
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetEmployeeDocuments
    @EmployeeId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Do not SELECT FileData here to prevent large payload downloads
    SELECT DocumentId, EmployeeId, DocumentType, OriginalName, FileName, MimeType, FileSize, FileUrl, UploadDate
    FROM EmployeeDocuments
    WHERE EmployeeId = @EmployeeId
    ORDER BY UploadDate DESC;
END
GO

-- =============================================
-- Stored Procedure: sp_GetEmployeeDocumentFile
-- Description: Retrieves the binary stream for a specific document
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetEmployeeDocumentFile
    @EmployeeId INT,
    @DocumentType NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Return only the file data and mimetype for streaming
    SELECT FileData, MimeType, OriginalName
    FROM EmployeeDocuments
    WHERE EmployeeId = @EmployeeId AND DocumentType = @DocumentType;
END
GO


-- =============================================
-- Stored Procedure: sp_DeleteEmployeeDocument
-- Description: Deletes a specific document for an employee
-- =============================================
CREATE OR ALTER PROCEDURE sp_DeleteEmployeeDocument
    @EmployeeId INT,
    @DocumentType NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    DELETE FROM EmployeeDocuments
    WHERE EmployeeId = @EmployeeId AND DocumentType = @DocumentType;
    
    SELECT @@ROWCOUNT AS Success;
END
GO

PRINT 'Document stored procedures created successfully.';
GO
