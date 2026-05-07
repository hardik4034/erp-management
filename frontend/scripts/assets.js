// Assets Management Logic
(function() {
    'use strict';

    let allAssets = [];
    let allEmployees = [];

    // Helper to log errors with alerts
    const handleError = (message, error) => {
        console.error(message, error);
        if (window.utils && window.utils.showAlert) {
            window.utils.showAlert(message, 'error');
        } else {
            alert(message);
        }
    };

    // Helper for date formatting
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const formatSqlDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // Load Employees for dropdown
    async function loadEmployees() {
        try {
            const data = await endpoints.employees.getAll();
            if (data.success) {
                allEmployees = data.data;
                const selects = ['assignEmployeeId', 'quickAssignEmployeeId'];
                selects.forEach(id => {
                    const select = document.getElementById(id);
                    if (select) {
                        select.innerHTML = '<option value="">Select Employee</option>';
                        allEmployees.forEach(emp => {
                            select.innerHTML += `<option value="${emp.EmployeeId || emp.EmployeeID}">${emp.FirstName} ${emp.LastName} (${emp.EmployeeCode || ''})</option>`;
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    }

    // Load Assets
    async function loadAssets() {
        try {
            const data = await endpoints.assets.getAll();
            if (data && data.success) {
                allAssets = data.data;
                renderAssets();
            }
        } catch (error) {
            handleError('Error loading assets', error);
        }
    }

    // Load My Assets (for Employee role)
    async function loadMyAssets() {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const empId = user.employeeId || user.EmployeeId || user.EmployeeID || user.id;
        
        if (!empId) return;
        
        try {
            const data = await endpoints.assets.getByEmployee(empId);
            if (data && data.success) {
                const tbody = document.getElementById('myAssetsTable');
                if (!tbody) return;
                
                tbody.innerHTML = '';
                if (data.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No assigned assets</td></tr>`;
                    return;
                }
                
                data.data.forEach(asset => {
                    tbody.innerHTML += `
                        <tr>
                            <td><span style="font-weight: 600; color: #ea580c">${asset.AssetCode}</span></td>
                            <td>${asset.AssetName}</td>
                            <td>${asset.Brand || '-'} / ${asset.Model || '-'}</td>
                            <td>${asset.SerialNumber || '-'}</td>
                            <td>${formatDate(asset.AssignDate)}</td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            console.error('Error loading my assets:', error);
        }
    }

    // Render Assets Table
    function renderAssets() {
        const tbody = document.getElementById('assetsTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
        const filterStatus = document.getElementById('filterStatus')?.value || '';
        const filterCategory = document.getElementById('filterCategory')?.value || '';
        
        const filtered = allAssets.filter(asset => {
            const matchesSearch = (asset.AssetCode || '').toLowerCase().includes(searchTerm) || 
                                  (asset.AssetName || '').toLowerCase().includes(searchTerm) || 
                                  (asset.AssignedTo || '').toLowerCase().includes(searchTerm);
            const matchesStatus = !filterStatus || asset.Status === filterStatus;
            const matchesCategory = !filterCategory || asset.Category === filterCategory;
            return matchesSearch && matchesStatus && matchesCategory;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center">No assets found</td></tr>`;
            return;
        }

        const serverUrl = window.api ? window.api.baseURL.replace('/api', '') : '';
        filtered.forEach(asset => {
            let statusBadge = '';
            if (asset.Status === 'Available') statusBadge = '<span class="status-badge bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Available</span>';
            else if (asset.Status === 'Assigned') statusBadge = '<span class="status-badge bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Assigned</span>';
            else statusBadge = '<span class="status-badge bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Damaged</span>';

            let actionBtns = '';
            if (asset.Status === 'Available') {
                actionBtns += `<button class="btn btn-sm btn-primary" onclick="window.openAssignModal(${asset.AssetID})">Assign</button> `;
            } else if (asset.Status === 'Assigned') {
                actionBtns += `<button class="btn btn-sm" style="background:#ea580c; color:white;" onclick="window.openReturnModal(${asset.AssetID})">Return</button> `;
            }
            
            const canDelete = window.roleManager ? window.roleManager.hasPermission('delete') : true;
            actionBtns += `
                <button class="btn btn-sm btn-outline-secondary" onclick="window.editAsset(${asset.AssetID})">✏️</button>
                ${canDelete ? `<button class="btn btn-sm btn-outline-danger" onclick="window.deleteAsset(${asset.AssetID})">🗑️</button>` : ''}
            `;

            if (asset.AssetPhoto) {
                actionBtns += ` <a href="${serverUrl}${asset.AssetPhoto}" target="_blank" class="btn btn-sm btn-outline-secondary">🖼️</a>`;
            }

            const specs = [asset.Processor, asset.RAM, asset.Storage].filter(Boolean).join(' | ') || '-';

            tbody.innerHTML += `
                <tr>
                    <td><span style="font-weight: 600; color: #ea580c">${asset.AssetCode}</span></td>
                    <td>${asset.AssetName}<div class="text-xs text-slate-500">${asset.Category}</div></td>
                    <td>${asset.Brand || '-'} / ${asset.Model || '-'}</td>
                    <td><div class="text-xs">${specs}</div><div class="text-xs text-slate-400">SN: ${asset.SerialNumber || '-'}</div></td>
                    <td>${statusBadge}</td>
                    <td>${asset.AssignedTo || '-'}</td>
                    <td class="flex gap-1 justify-center">${actionBtns}</td>
                </tr>
            `;
        });
    }

    // Modal Operations
    function openAddAssetModal() {
        const form = document.getElementById('assetForm');
        if (form) form.reset();
        
        const resetIds = ['assetId', 'assetCode', 'assetProcessor', 'assetRAM', 'assetStorage', 'assetIssueDate', 'quickAssignEmployeeId'];
        resetIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const title = document.getElementById('assetModalTitle');
        if (title) title.textContent = 'Add New Asset';
        
        const stGroup = document.getElementById('statusGroup');
        if (stGroup) stGroup.style.display = 'none';
        
        const quickSect = document.getElementById('quickAssignSection');
        if (quickSect) quickSect.style.display = 'block';

        const preview = document.getElementById('photoPreview');
        if (preview) preview.innerHTML = '';
        
        const modal = document.getElementById('assetModal');
        if (modal) modal.style.display = 'flex';
    }

    function closeAssetModal() {
        const modal = document.getElementById('assetModal');
        if (modal) modal.style.display = 'none';
    }

    function editAsset(id) {
        const asset = allAssets.find(a => a.AssetID === id);
        if (!asset) return;

        document.getElementById('assetId').value = asset.AssetID;
        if (document.getElementById('assetCode')) document.getElementById('assetCode').value = asset.AssetCode || '';
        document.getElementById('assetName').value = asset.AssetName;
        document.getElementById('assetCategory').value = asset.Category;
        document.getElementById('assetBrand').value = asset.Brand || '';
        document.getElementById('assetModel').value = asset.Model || '';
        document.getElementById('assetSerialNumber').value = asset.SerialNumber || '';
        
        if (document.getElementById('assetProcessor')) document.getElementById('assetProcessor').value = asset.Processor || '';
        if (document.getElementById('assetRAM')) document.getElementById('assetRAM').value = asset.RAM || '';
        if (document.getElementById('assetStorage')) document.getElementById('assetStorage').value = asset.Storage || '';

        if (document.getElementById('assetIssueDate')) 
            document.getElementById('assetIssueDate').value = formatSqlDate(asset.PurchaseDate);
        document.getElementById('assetCondition').value = asset.AssetCondition;
        
        const stGroup = document.getElementById('statusGroup');
        if (stGroup) stGroup.style.display = 'block';
        document.getElementById('assetStatus').value = asset.Status;
        document.getElementById('existingPhoto').value = asset.AssetPhoto || '';
        
        const qSect = document.getElementById('quickAssignSection');
        if (qSect) qSect.style.display = 'none';

        const serverUrl = window.api ? window.api.baseURL.replace('/api', '') : '';
        const preview = document.getElementById('photoPreview');
        if (preview && asset.AssetPhoto) {
            preview.innerHTML = `<img src="${serverUrl}${asset.AssetPhoto}" style="max-width: 150px; border-radius: 4px;" alt="Asset Photo">`;
        }

        document.getElementById('assetModalTitle').textContent = 'Edit Asset';
        document.getElementById('assetModal').style.display = 'flex';
    }

    async function saveAsset() {
        const form = document.getElementById('assetForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('assetId').value;
        const formData = new FormData();
        
        const assetManualCode = document.getElementById('assetCode')?.value || '';
        if (assetManualCode) formData.append('AssetCode', assetManualCode);
        
        formData.append('AssetName', document.getElementById('assetName').value);
        formData.append('Category', document.getElementById('assetCategory').value);
        formData.append('Brand', document.getElementById('assetBrand').value);
        formData.append('Model', document.getElementById('assetModel').value);
        formData.append('SerialNumber', document.getElementById('assetSerialNumber').value);
        formData.append('PurchaseDate', document.getElementById('assetIssueDate').value);
        formData.append('AssetCondition', document.getElementById('assetCondition').value);
        
        formData.append('Processor', document.getElementById('assetProcessor')?.value || '');
        formData.append('RAM', document.getElementById('assetRAM')?.value || '');
        formData.append('Storage', document.getElementById('assetStorage')?.value || '');

        if (id) {
            formData.append('Status', document.getElementById('assetStatus').value);
            formData.append('ExistingPhoto', document.getElementById('existingPhoto').value);
        } else {
            // Check for quick assignment
            const empId = document.getElementById('quickAssignEmployeeId')?.value;
            const issueDate = document.getElementById('assetIssueDate')?.value;
            if (empId && issueDate) {
                formData.append('EmployeeID', empId);
                formData.append('AssignDate', issueDate);
            }
        }
        
        const photoFile = document.getElementById('assetPhoto').files[0];
        if (photoFile) {
            formData.append('AssetPhoto', photoFile);
        }

        try {
            let data;
            if (id) {
                data = await endpoints.assets.update(id, formData);
            } else {
                data = await endpoints.assets.create(formData);
            }

            if (data.success) {
                window.utils.showAlert(data.message, 'success');
                closeAssetModal();
                loadAssets();
            } else {
                handleError(data.message || 'Error saving asset');
            }
        } catch (error) {
            handleError('Server error while saving asset', error);
        }
    }

    async function deleteAsset(id) {
        if (!confirm('Are you sure you want to delete this asset?')) return;
        try {
            const response = await endpoints.assets.delete(id);
            if (response.success) {
                window.utils.showAlert('Asset deleted', 'success');
                loadAssets();
            }
        } catch (error) {
            handleError('Delete error', error);
        }
    }

    function openAssignModal(id) {
        document.getElementById('assignAssetId').value = id;
        document.getElementById('assignModal').style.display = 'flex';
    }

    function closeAssignModal() {
        document.getElementById('assignModal').style.display = 'none';
    }

    async function submitAssign() {
        const payload = {
            AssetID: document.getElementById('assignAssetId').value,
            EmployeeID: document.getElementById('assignEmployeeId').value,
            AssignDate: document.getElementById('assignDate').value,
            ReturnDate: document.getElementById('assignReturnDate').value || null,
            Remarks: document.getElementById('assignRemarks').value
        };

        if (!payload.EmployeeID || !payload.AssignDate) {
            window.utils.showAlert('Employee and date are required', 'warning');
            return;
        }

        try {
            const response = await endpoints.assets.assign(payload);
            if (response.success) {
                window.utils.showAlert('Asset assigned', 'success');
                closeAssignModal();
                loadAssets();
            }
        } catch (error) {
            handleError('Assign error', error);
        }
    }

    function openReturnModal(id) {
        document.getElementById('returnAssetId').value = id;
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('returnDate').value = today;
        document.getElementById('returnModal').style.display = 'flex';
    }

    function closeReturnModal() {
        document.getElementById('returnModal').style.display = 'none';
    }

    async function submitReturn() {
        const payload = {
            AssetID: document.getElementById('returnAssetId').value,
            ReturnDate: document.getElementById('returnDate').value,
            AssetCondition: document.getElementById('returnCondition').value,
            Remarks: document.getElementById('returnRemarks').value
        };

        try {
            const response = await endpoints.assets.return(payload);
            if (response.success) {
                window.utils.showAlert('Asset returned', 'success');
                closeReturnModal();
                loadAssets();
            }
        } catch (error) {
            handleError('Return error', error);
        }
    }

    function handleSearch() {
        renderAssets();
    }

    function exportAssets() {
        if (!window.XLSX) {
            window.utils.showAlert('Export library not loaded', 'error');
            return;
        }
        const exportData = allAssets.map(asset => ({
            'Asset Code': asset.AssetCode,
            'Asset Name': asset.AssetName,
            'Category': asset.Category,
            'Brand': asset.Brand || '-',
            'Model': asset.Model || '-',
            'Serial Number': asset.SerialNumber || '-',
            'Processor': asset.Processor || '-',
            'RAM': asset.RAM || '-',
            'Storage': asset.Storage || '-',
            'Status': asset.Status,
            'Assigned To': asset.AssignedTo || 'N/A'
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
        XLSX.writeFile(workbook, `Assets_List.xlsx`);
    }

    // Role-based view switching
    function handleRoleChange() {
        const role = document.getElementById('roleDropdown')?.value || 'admin';
        const isAdmin = (role === 'admin' || role === 'hr');
        
        document.querySelectorAll('.hr-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
        document.querySelectorAll('.hr-view-area').forEach(el => el.style.display = isAdmin ? '' : 'none');
        document.querySelectorAll('.employee-only').forEach(el => el.style.display = isAdmin ? 'none' : '');
        
        if (isAdmin) loadAssets();
        else loadMyAssets();
    }

    // Initialization
    document.addEventListener('DOMContentLoaded', () => {
        console.log("🛠️ Assets Module Loaded");
        if (window.auth && window.auth.initAuth) window.auth.initAuth();
        
        loadEmployees();
        
        const today = new Date().toISOString().split('T')[0];
        if (document.getElementById('assignDate')) document.getElementById('assignDate').value = today;
        
        const roleDropdown = document.getElementById('roleDropdown');
        if (roleDropdown) {
            roleDropdown.addEventListener('change', handleRoleChange);
            handleRoleChange();
        } else {
            loadAssets();
        }
    });

    // Final Global Exposures
    window.openAddAssetModal = openAddAssetModal;
    window.closeAssetModal = closeAssetModal;
    window.saveAsset = saveAsset;
    window.editAsset = editAsset;
    window.deleteAsset = deleteAsset;
    window.openAssignModal = openAssignModal;
    window.closeAssignModal = closeAssignModal;
    window.submitAssign = submitAssign;
    window.openReturnModal = openReturnModal;
    window.closeReturnModal = closeReturnModal;
    window.submitReturn = submitReturn;
    window.handleSearch = handleSearch;
    window.exportAssets = exportAssets;
    window.loadAssets = loadAssets;

})();
