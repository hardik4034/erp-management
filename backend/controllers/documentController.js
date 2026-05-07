const multer = require('multer');
const { getConnection, sql } = require('../config/database');

// Multer memory storage configuration (no longer saving to disk!)
const storage = multer.memoryStorage();

// File filter (same as before)
const fileFilter = (req, file, cb) => {
    // Only accept PDFs and images
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});


const documentController = {
    // Middleware for handling multipart upload (writes to req.file.buffer)
    uploadMiddleware: upload.single('document'),

    // Upload a document directly to DB
    uploadDocument: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const { employeeId } = req.params;
            const { documentType } = req.body;

            if (!documentType) {
                return res.status(400).json({ success: false, error: 'Document type is required' });
            }

            // Generate relative URL for accessing the downloaded stream via standard API
            const fileUrl = `/api/documents/${employeeId}/${documentType}/download`;
            
            // Connect to DB and upsert record with binary buffer
            const pool = await getConnection();
            const request = pool.request();
            
            request.input('EmployeeId', sql.Int, parseInt(employeeId));
            request.input('DocumentType', sql.NVarChar(50), documentType);
            request.input('OriginalName', sql.NVarChar(255), req.file.originalname);
            request.input('FileName', sql.NVarChar(255), req.file.originalname); // filename isn't strictly needed on disk anymore
            request.input('MimeType', sql.NVarChar(50), req.file.mimetype);
            request.input('FileSize', sql.Int, req.file.size);
            request.input('FileUrl', sql.NVarChar(500), fileUrl);
            request.input('FileData', sql.VarBinary, req.file.buffer);
            
            const result = await request.execute('sp_UploadDocument');

            if (!result.recordset || result.recordset.length === 0) {
                 throw new Error("Failed to insert document into database");
            }
            
            const documentData = result.recordset[0];
            
            const camelData = {
                documentId: documentData.DocumentId,
                documentType: documentData.DocumentType,
                filename: documentData.FileName,
                originalName: documentData.OriginalName,
                mimetype: documentData.MimeType,
                size: documentData.FileSize,
                url: documentData.FileUrl,
                uploadDate: documentData.UploadDate
            };

            res.status(201).json({
                success: true,
                message: 'Document uploaded to database successfully',
                data: camelData
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ success: false, error: error.message || 'Error uploading document' });
        }
    },

    // Get all documents for an employee (excludes binary data)
    getDocuments: async (req, res) => {
        try {
            const { employeeId } = req.params;
            
            const pool = await getConnection();
            const request = pool.request();
            request.input('EmployeeId', sql.Int, parseInt(employeeId));
            
            const result = await request.execute('sp_GetEmployeeDocuments');
            
            const data = result.recordset.map(row => ({
                documentId: row.DocumentId,
                documentType: row.DocumentType,
                filename: row.FileName,
                originalName: row.OriginalName,
                mimetype: row.MimeType,
                size: row.FileSize,
                url: row.FileUrl,
                uploadDate: row.UploadDate
            }));
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('Get documents error:', error);
            res.status(500).json({ success: false, error: 'Error fetching documents metadata' });
        }
    },

    // Download a specific document stream from SQL
    downloadDocument: async (req, res) => {
        try {
            const { employeeId, documentType } = req.params;

            const pool = await getConnection();
            const request = pool.request();
            request.input('EmployeeId', sql.Int, parseInt(employeeId));
            request.input('DocumentType', sql.NVarChar(50), documentType);
            
            const result = await request.execute('sp_GetEmployeeDocumentFile');

            if (!result.recordset || result.recordset.length === 0) {
                return res.status(404).send('Document not found in database');
            }

            const doc = result.recordset[0];
            const fileData = doc.FileData;
            const mimeType = doc.MimeType;
            const originalName = doc.OriginalName;

            // Optional: specify inline for viewing in browser vs attachment to force download
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
            res.send(fileData);

        } catch (error) {
            console.error('Download document error:', error);
            res.status(500).send('Error downloading document');
        }
    },

    // Delete a document from SQL
    deleteDocument: async (req, res) => {
        try {
            const { employeeId, documentType } = req.params;
            
            const pool = await getConnection();
            const request = pool.request();
            request.input('EmployeeId', sql.Int, parseInt(employeeId));
            request.input('DocumentType', sql.NVarChar(50), documentType);
            
            const result = await request.execute('sp_DeleteEmployeeDocument');
            const isSuccess = result.recordset && result.recordset.length > 0 && result.recordset[0].Success >= 1;
            
            if (!isSuccess) {
                return res.status(404).json({ success: false, error: 'Document not found' });
            }

            res.json({
                success: true,
                message: 'Document deleted successfully from database'
            });
        } catch (error) {
            console.error('Delete document error:', error);
            res.status(500).json({ success: false, error: 'Error deleting document' });
        }
    }
};

module.exports = documentController;
