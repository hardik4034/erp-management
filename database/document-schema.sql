USE HRMS;
GO

-- Drop table so we can recreate it with FileData (since this is a new feature, wiping existing test data is fine)
IF OBJECT_ID('EmployeeDocuments', 'U') IS NOT NULL
BEGIN
    DROP TABLE EmployeeDocuments;
    PRINT 'Dropped existing EmployeeDocuments table.';
END

CREATE TABLE EmployeeDocuments (
    DocumentId INT PRIMARY KEY IDENTITY(1,1),
    EmployeeId INT NOT NULL,
    DocumentType NVARCHAR(50) NOT NULL,
    OriginalName NVARCHAR(255) NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    MimeType NVARCHAR(50) NOT NULL,
    FileSize INT NOT NULL,
    FileUrl NVARCHAR(500) NOT NULL,
    FileData VARBINARY(MAX) NOT NULL, -- New column for storing physical file data
    UploadDate DATETIME DEFAULT GETDATE(),
    
    CONSTRAINT FK_EmployeeDocuments_Employees FOREIGN KEY (EmployeeId) REFERENCES Employees(EmployeeId),
    CONSTRAINT UQ_Employee_DocumentType UNIQUE (EmployeeId, DocumentType)
);

PRINT 'EmployeeDocuments table created successfully with FileData column.';
GO
