// New Leave Page JavaScript
auth.requireAuth();
auth.initAuth();

let employees = [];
let leaveTypes = [];
let selectedFile = null;

// Initialize page
async function init() {
    await loadEmployees();
    await loadLeaveTypes();
    setDefaultDate();
    setupFileUpload();
}

// Load employees from API
async function loadEmployees() {
    try {
        const response = await endpoints.employees.getAll();
        employees = response.data || [];
        
        const select = document.getElementById('memberId');
        const roleManager = window.roleManager;
        
        // Handle Employee Role
        if (roleManager && roleManager.isRole('employee')) {
            // Get current employee ID (mocked for now in role-manager)
            const currentEmpId = roleManager.getCurrentEmployeeId();
            const currentEmployee = employees.find(e => e.EmployeeId === currentEmpId);
            
            if (currentEmployee) {
                select.innerHTML = `<option value="${currentEmployee.EmployeeId}" selected>${currentEmployee.FirstName} ${currentEmployee.LastName}</option>`;
                select.disabled = true;
            }
            
            // Allow selecting oneself if API fails or ID not found (fallback)
            // But main logic is to restrict.
            
            // Hide Status Field for Employees
            const statusField = document.getElementById('newLeaveStatus').closest('.form-group');
            if (statusField) statusField.style.display = 'none';
            
        } else {
            // Admin/HR/Manager - Show All
            select.innerHTML = '<option value="">--</option>' + 
                employees.map(e => 
                    `<option value="${e.EmployeeId}">${e.FirstName} ${e.LastName}</option>`
                ).join('');
            select.disabled = false;
            
             // Show Status Field for Managers
            const statusField = document.getElementById('newLeaveStatus').closest('.form-group');
            if (statusField) statusField.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        utils.showAlert('Failed to load employees', 'error');
    }
}

// Load leave types from API
async function loadLeaveTypes() {
    try {
        const response = await endpoints.leaves.getTypes();
        leaveTypes = response.data || [];
        
        const select = document.getElementById('leaveTypeId');
        select.innerHTML = '<option value="">--</option>' + 
            leaveTypes.map(lt => 
                `<option value="${lt.LeaveTypeId}">${lt.TypeName}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading leave types:', error);
        utils.showAlert('Failed to load leave types', 'error');
    }
}

// Set default date to today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('singleDate').value = today;
}

// Handle duration selection change
function handleDurationChange() {
    const duration = document.querySelector('input[name="duration"]:checked').value;
    const singleDateWrapper = document.querySelector('.date-input-wrapper');
    const dateRangeWrapper = document.getElementById('dateRangeWrapper');
    const singleDateInput = document.getElementById('singleDate');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    
    if (duration === 'multiple') {
        // Show date range, hide single date
        singleDateWrapper.style.display = 'none';
        dateRangeWrapper.style.display = 'block';
        singleDateInput.removeAttribute('required');
        fromDateInput.setAttribute('required', 'required');
        toDateInput.setAttribute('required', 'required');
        
        // Set default values
        const today = new Date().toISOString().split('T')[0];
        fromDateInput.value = today;
        toDateInput.value = today;
    } else {
        // Show single date, hide date range
        singleDateWrapper.style.display = 'block';
        dateRangeWrapper.style.display = 'none';
        singleDateInput.setAttribute('required', 'required');
        fromDateInput.removeAttribute('required');
        toDateInput.removeAttribute('required');
    }
}

// File upload setup
function setupFileUpload() {
    const dropZone = document.getElementById('fileUploadZone');
    const fileInput = document.getElementById('fileInput');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle file
function handleFile(file) {
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        utils.showAlert('File size must be less than 5MB', 'error');
        return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        utils.showAlert('Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG', 'error');
        return;
    }
    
    selectedFile = file;
    displayFilePreview(file);
}

// Display file preview
function displayFilePreview(file) {
    const uploadContent = document.getElementById('fileUploadContent');
    const preview = document.getElementById('filePreview');
    
    uploadContent.style.display = 'none';
    preview.style.display = 'block';
    
    const fileIcon = getFileIcon(file.type);
    const fileSize = formatFileSize(file.size);
    
    preview.innerHTML = `
        <div class="file-info">
            <span class="file-icon">${fileIcon}</span>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${fileSize}</div>
            </div>
        </div>
        <button type="button" class="file-remove" onclick="removeFile()">✕</button>
    `;
}

// Get file icon based on type
function getFileIcon(type) {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('image')) return '🖼️';
    return '📎';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Remove file
function removeFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileUploadContent').style.display = 'block';
    document.getElementById('filePreview').style.display = 'none';
}

// Add leave type (placeholder)
function addLeaveType() {
    utils.showAlert('Add Leave Type functionality coming soon', 'info');
    // TODO: Implement modal to add new leave type
}

// Show hosting suggestions (AI feature placeholder)
function showHostingSuggestions() {
    const reasonTextarea = document.getElementById('reason');
    const suggestions = [
        'Feeling unwell and need rest',
        'Personal family matter',
        'Medical appointment scheduled',
        'Emergency situation at home',
        'Planned vacation'
    ];
    
    // For now, show a simple suggestion
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    
    if (confirm(`Suggestion: "${randomSuggestion}"\n\nUse this suggestion?`)) {
        reasonTextarea.value = randomSuggestion;
    }
    
    // TODO: Implement AI-powered suggestions
}

// Form submission
document.getElementById('newLeaveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const duration = document.querySelector('input[name="duration"]:checked').value;
    let fromDate, toDate;
    
    if (duration === 'multiple') {
        fromDate = document.getElementById('fromDate').value;
        toDate = document.getElementById('toDate').value;
    } else {
        fromDate = document.getElementById('singleDate').value;
        toDate = fromDate;
    }
    
    const data = {
        employeeId: parseInt(document.getElementById('memberId').value),
        leaveTypeId: parseInt(document.getElementById('leaveTypeId').value),
        fromDate: fromDate,
        toDate: toDate,
        reason: document.getElementById('newReason').value,
        status: document.getElementById('newLeaveStatus').value,
        durationType: duration
    };
    
    try {
        // Create leave
        const response = await endpoints.leaves.create(data);
        
        // TODO: Handle file upload if file is selected
        if (selectedFile) {
            console.log('File upload not yet implemented:', selectedFile.name);
            // await uploadLeaveFile(response.data.leaveId, selectedFile);
        }
        
        utils.showAlert('Leave created successfully', 'success');
        
        // Redirect to leaves page after short delay
        setTimeout(() => {
            window.location.href = 'leaves.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error creating leave:', error);
        utils.showAlert(error.message || 'Failed to create leave', 'error');
    }
});

// Cancel form
function cancelForm() {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        window.location.href = 'leaves.html';
    }
}

// Initialize on page load
init();
