// Document Types
const DOCUMENT_TYPES = [
    { id: 'adhar', name: 'Adhar' },
    { id: 'pan', name: 'PAN' },
    { id: 'passbook', name: 'Pass Book/ Cancelled Cheque' },
    { id: 'educational', name: 'Educational Certificate (Graduation, Post Graduation, Diploma)' },
    { id: 'experience', name: 'Experience Certificate' },
    { id: 'salary_slip', name: 'Last 3 months Salary slip' },
    { id: 'relieving', name: 'Relieving Letter' },
    { id: 'offer', name: 'Offer Letter' },
    { id: 'signed_offer', name: 'Signed Offer Letter' },
    { id: 'onboarding', name: 'Onboarding Forms' },
    { id: 'photo', name: 'Photo' }
];

// State
let currentEmployeeId = null;
let uploadedDocuments = {};

// Initialize Documents Tab
async function initDocumentsTab(employeeId) {
    currentEmployeeId = employeeId;
    const tabDocuments = document.getElementById('tab-documents');
    
    // Check role permissions (only HR/Admin or the employee themselves can upload)
    const isOwner = window.roleManager?.getCurrentEmployeeId() === employeeId;
    const isManager = ['hr', 'admin'].includes(window.roleManager?.getCurrentRole());
    const canUpload = isOwner || isManager;

    // Build the grid UI
    tabDocuments.innerHTML = `
        <div class="documents-header">
            <h3>Employee Documents</h3>
            <p>Upload and manage employee documents here. Note: Max size 5MB. Formats: PDF, JPG, PNG.</p>
        </div>
        <div class="documents-grid" id="documentsGrid">
            <!-- Document cards will be rendered here -->
            <div class="documents-loading">
                <div class="spinner"></div>
                <p>Loading documents...</p>
            </div>
        </div>
    `;

    await fetchDocuments();
}

async function fetchDocuments() {
    try {
        const response = await endpoints.documents.getAll(currentEmployeeId);
        if (response.success) {
            // Build dict of documents by type
            uploadedDocuments = {};
            response.data.forEach(doc => {
                uploadedDocuments[doc.documentType] = doc;
            });
            renderDocumentsGrid();
        }
    } catch (error) {
        console.error('Failed to fetch documents:', error);
        utils.showAlert('Failed to load documents', 'error');
        // Render empty grid on failure
        renderDocumentsGrid();
    }
}

function renderDocumentsGrid() {
    const grid = document.getElementById('documentsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const isOwner = window.roleManager?.getCurrentEmployeeId() === currentEmployeeId;
    const isManager = ['hr', 'admin'].includes(window.roleManager?.getCurrentRole());
    const canUpload = isOwner || isManager;

    DOCUMENT_TYPES.forEach(docDef => {
        const doc = uploadedDocuments[docDef.id];
        const isUploaded = !!doc;
        
        const card = document.createElement('div');
        card.className = `document-card ${isUploaded ? 'uploaded' : 'missing'}`;
        card.dataset.type = docDef.id;

        card.innerHTML = `
            <div class="doc-icon">
                ${isUploaded ? 
                    (doc.mimetype === 'application/pdf' ? '📄' : '🖼️') : 
                    '📄'}
            </div>
            <div class="doc-info">
                <h4>${docDef.name}</h4>
                ${isUploaded ? 
                    `<p class="doc-status success">✓ Uploaded</p>
                     <p class="doc-filename" title="${doc.originalName}">${doc.originalName}</p>
                     <p class="doc-date">${utils.formatDate(doc.uploadDate)}</p>` : 
                    `<p class="doc-status pending">Pending</p>`
                }
            </div>
            <div class="doc-actions">
                ${isUploaded ? `
                    <a href="${api.baseURL.replace('/api', '') + doc.url}" target="_blank" class="btn btn-view" title="View Document">
                        👁️
                    </a>
                    ${canUpload ? `
                        <button class="btn btn-delete doc-delete-btn" title="Delete Document" data-type="${docDef.id}">
                            🗑️
                        </button>
                    ` : ''}
                ` : `
                    ${canUpload ? `
                        <input type="file" id="upload-${docDef.id}" class="doc-file-input" accept=".pdf,image/png,image/jpeg,image/jpg" style="display: none;" data-type="${docDef.id}">
                        <label for="upload-${docDef.id}" class="btn btn-upload">
                            Upload
                        </label>
                    ` : ''}
                `}
            </div>
        `;

        grid.appendChild(card);
    });

    // Attach event listeners
    attachDocumentEvents();
}

function attachDocumentEvents() {
    // Handle File Selection (Upload)
    const fileInputs = document.querySelectorAll('.doc-file-input');
    fileInputs.forEach(input => {
        input.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const docType = e.target.dataset.type;
                const file = e.target.files[0];
                
                // Validate file
                if (file.size > 5 * 1024 * 1024) {
                    utils.showAlert('File size must be less than 5MB', 'error');
                    e.target.value = ''; // Reset input
                    return;
                }
                
                await uploadFile(docType, file);
                e.target.value = ''; // Reset input
            }
        });
    });

    // Handle Deletion
    const deleteBtns = document.querySelectorAll('.doc-delete-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const docType = e.currentTarget.dataset.type;
            if (confirm('Are you sure you want to delete this document?')) {
                await deleteFile(docType);
            }
        });
    });
}

async function uploadFile(docType, file) {
    try {
        utils.showLoading(true);
        
        const formData = new FormData();
        formData.append('document', file);
        formData.append('documentType', docType);

        const response = await endpoints.documents.upload(currentEmployeeId, formData);
        
        if (response.success) {
            utils.showAlert('Document uploaded successfully', 'success');
            await fetchDocuments(); // Refresh grid
        }
    } catch (error) {
        console.error('Upload Error:', error);
        utils.showAlert(error.message || 'Failed to upload document', 'error');
    } finally {
        utils.showLoading(false);
    }
}

async function deleteFile(docType) {
    try {
        utils.showLoading(true);
        
        const response = await endpoints.documents.delete(currentEmployeeId, docType);
        
        if (response.success) {
            utils.showAlert('Document deleted successfully', 'success');
            await fetchDocuments(); // Refresh grid
        }
    } catch (error) {
        console.error('Delete Error:', error);
        utils.showAlert(error.message || 'Failed to delete document', 'error');
    } finally {
        utils.showLoading(false);
    }
}

// Export for profile page to use
window.documentsManager = {
    init: initDocumentsTab
};
