// Leaves Page JavaScript
auth.requireAuth();
auth.initAuth();

let leaves = [];
let employees = []; // Filtered by role
let allEmployees = []; // Unfiltered - for dropdowns
let leaveTypes = [];
let selectedLeaves = new Set();
let activeDropdown = null;
const canManage = auth.hasRole('Admin', 'HR');

// ========== MY LEAVES SECTION ==========
const getCurrentEmpId = () => window.roleManager ? window.roleManager.getCurrentEmployeeId() : 1;
let employeeData = null;
let leaveBalanceData = [];

// Load all data on page load
// Load all data on page load
async function loadLeaves() {
    try {
        const params = {};
        const status = document.getElementById('filterStatus')?.value;
        const empId = document.getElementById('filterEmployee')?.value;
        const leaveTypeId = document.getElementById('filterLeaveType')?.value;
        const fromDate = document.getElementById('filterFromDate')?.value;
        const toDate = document.getElementById('filterToDate')?.value;
        
        if (status) params.status = status;
        if (empId) params.employeeId = empId;

        const showDeleted = document.getElementById('showDeletedToggle')?.checked;
        if (showDeleted) params.showDeleted = 'true';

        // Load employee data for the profile card for "My Leaves" mode
        if (window.roleManager) {
            loadEmployeeProfile(getCurrentEmpId());
        }

        const response = await endpoints.leaves.getAll(params);
        let allLeaves = response.data || [];
        
        // Filter leaves based on role
        if (window.roleManager) {
            const dataScope = window.roleManager.getDataScope();
            const currentEmployeeId = window.roleManager.getCurrentEmployeeId();
            
            console.log('🔍 Filtering Leaves Debug:', { 
                role: window.roleManager.getCurrentRole(),
                dataScope, 
                currentEmployeeId
            });

            if (dataScope === 'own' && currentEmployeeId) {
                // Employee role: show only their own leaves
                leaves = allLeaves.filter(l => l.EmployeeId == currentEmployeeId);
                console.log(`📊 Leaves filtered to own data: ${leaves.length}/${allLeaves.length}`);
                console.log('🔍 Current Employee ID:', currentEmployeeId);
                console.log('🔍 All Leave Employee IDs:', allLeaves.map(l => l.EmployeeId));
                console.log('🔍 Filtered Leaves:', leaves.map(l => ({ LeaveId: l.LeaveId, EmployeeId: l.EmployeeId, FromDate: l.FromDate })));
            } else if (dataScope === 'team' && currentEmployeeId) {
                // Manager role: show their team (we don't get reporting-to in leaves list, 
                // so we rely on employee list filtering or backend - for now, simplest assumption)
                // Note: The leaves API response lacks ReportingTo, so we might need to filter against loaded employees list
                // For now, assuming manager sees all or implementing simple filter if possible
                // Better approach: Get team IDs from filtered employee list
                
                // Let's filter by employees that are currently loaded/visible in the employee dropdown 
                // (which is already role-filtered if we update loadEmployees)
                leaves = allLeaves.filter(l => 
                    l.EmployeeId == currentEmployeeId || // Own leaves
                    employees.some(e => e.EmployeeId == l.EmployeeId && e.ReportingTo == currentEmployeeId) // Team members
                );
                
                // Fallback if employees not loaded yet: just show own + anyone reporting to them if available in data
                if (leaves.length === 0 && allLeaves.length > 0) {
                     // If we can't determine team structure easily here without employees loaded, 
                     // we might just show own data + warning, or all data.
                     // Let's rely on backend filtering eventually, but frontend logic:
                     // Wait for employees to load? 
                     // Simplification: Manager sees all leaves for now OR we fix loadEmployees first
                     
                     // If we have employees list loaded first:
                     if (employees.length > 0) {
                        const teamIds = employees.map(e => e.EmployeeId);
                        leaves = allLeaves.filter(l => teamIds.includes(l.EmployeeId));
                     } else {
                        // If employees not loaded, maybe just show all for manager or own
                        // Let's show all for manager as temporary fallback if validation fails, 
                        // OR reload employees first.
                        leaves = allLeaves; 
                     }
                }
                
                console.log(`📊 Leaves filtered to team data: ${leaves.length}`);
            } else {
                // Admin/HR role: show all data
                leaves = allLeaves;
                console.log(`📊 Leaves showing all data: ${leaves.length}`);
            }
        } else {
            leaves = allLeaves;
        }
        
        // Apply client-side filters
        let filteredLeaves = leaves;
        
        if (leaveTypeId) {
            filteredLeaves = filteredLeaves.filter(l => l.LeaveTypeId == leaveTypeId);
        }
        
        if (fromDate) {
            filteredLeaves = filteredLeaves.filter(l => new Date(l.FromDate) >= new Date(fromDate));
        }
        
        if (toDate) {
            filteredLeaves = filteredLeaves.filter(l => new Date(l.ToDate) <= new Date(toDate));
        }
        
        displayLeaves(filteredLeaves);
        
        // Ensure UI permissions are applied
        if (window.roleManager) {
            window.roleManager.applyRolePermissions();
        }
    } catch (error) {
        console.error('Error loading leaves:', error);
        utils.showAlert('Failed to load leaves', 'error');
    }
}

// Listen for role changes
window.addEventListener('roleChanged', (event) => {
    console.log(`🔄 Role changed, reloading leaves data...`);
    // Reload employees first to get correct team structure for manager filtering
    loadEmployees().then(() => loadLeaves());
});

function calculateDays(from, to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = Math.abs(toDate - fromDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function getDuration(from, to) {
    const days = calculateDays(from, to);
    if (days === 1) {
        return { type: 'full-day', label: 'Full Day' };
    } else if (days < 1) {
        return { type: 'half-day', label: 'Half Day' };
    } else {
        return { type: 'full-day', label: `${days} Days` };
    }
}

function getLeaveTypeBadgeClass(leaveType) {
    const type = leaveType.toLowerCase();
    if (type.includes('sick')) return 'sick';
    if (type.includes('casual')) return 'casual';
    if (type.includes('paid')) return 'paid';
    if (type.includes('unpaid')) return 'unpaid';
    return 'casual'; // default
}

function formatLeaveDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${day}-${month}-${year} (${dayName})`;
}

function getInitials(firstName, lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function renderTable(leavesToRender, tableId) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    if (leavesToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No leave records found</td></tr>`;
        return;
    }

    tbody.innerHTML = leavesToRender.map((leave, index) => {
        const isDeleted = leave.IsDeleted === true || leave.IsDeleted === 1;
        const duration = getDuration(leave.FromDate, leave.ToDate);
        const leaveTypeBadge = getLeaveTypeBadgeClass(leave.LeaveTypeName || leave.LeaveType || '');
        const initials = leave.EmployeeName ? 
            leave.EmployeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 
            getInitials(leave.FirstName || 'U', leave.LastName || 'N');
        const status = (leave.Status || 'Pending').toLowerCase();
        
        // Role-based permissions
        const currentRole = window.roleManager ? window.roleManager.getCurrentRole() : 'employee';
        const currentEmpId = window.roleManager ? window.roleManager.getCurrentEmployeeId() : null;
        const isAdminHR = ['admin', 'hr'].includes(currentRole);
        const isManager = currentRole === 'manager';
        const isOwnLeave = leave.EmployeeId == currentEmpId;
        
        // Action visibility logic
        const canApprove = (isAdminHR || isManager) && !isOwnLeave && status === 'pending';
        const canEdit = isAdminHR || (isOwnLeave && status === 'pending');
        const canDelete = isAdminHR || (isOwnLeave && status === 'pending');
        const canView = true;

        const actionHtml = `
            <div class="action-dropdown">
                <button class="action-btn" onclick="toggleActionMenu(this)">⋮</button>
                <div class="action-menu">
                    ${isDeleted ? `
                        ${isAdminHR ? `
                            <div class="action-menu-item text-green-600" onclick="restoreLeave(${leave.LeaveId})">&#x267B; Restore</div>
                            <div class="action-menu-item text-red-600" onclick="hardDeleteLeave(${leave.LeaveId})">🗑️ Permanent Delete</div>
                        ` : '<div class="action-menu-item text-gray-400">No actions</div>'}
                    ` : `
                        <div class="action-menu-item" onclick="viewLeave(${leave.LeaveId})">👁️ View</div>
                        ${canEdit ? `<div class="action-menu-item" onclick="editLeave(${leave.LeaveId})">✏️ Edit</div>` : ''}
                        ${canApprove ? `
                            <div class="action-menu-item success" onclick="approveLeave(${leave.LeaveId})">✅ Approve</div>
                            <div class="action-menu-item warning" onclick="rejectLeave(${leave.LeaveId})">❌ Reject</div>
                        ` : ''}
                        ${canDelete ? `<div class="action-menu-item danger" onclick="openDeleteModal(${leave.LeaveId})">🗑️ Delete</div>` : ''}
                    `}
                </div>
            </div>`;

        const rowStyle = isDeleted ? 'opacity:0.6;background:#fef2f2;' : '';
        const statusBadgeClass = `status-badge ${status}`;

        if (tableId === 'myLeavesTableBody') {
            const reasonStr = leave.Reason ? (leave.Reason.length > 25 ? leave.Reason.substring(0, 25) + '...' : leave.Reason) : '-';
            return `
                <tr style="${rowStyle}">
                    <td><span class="leave-type-badge ${leaveTypeBadge}">${leave.LeaveTypeName || leave.LeaveType || '-'}</span></td>
                    <td>${formatLeaveDate(leave.FromDate)}</td>
                    <td>${formatLeaveDate(leave.ToDate)}</td>
                    <td><span class="duration-badge ${duration.type}">${duration.label}</span></td>
                    <td><span title="${leave.Reason || ''}">${reasonStr}</span></td>
                    <td>
                        <span class="${statusBadgeClass}">${leave.Status || 'Pending'}</span>
                        ${isDeleted ? '<span class="deleted-tag">Deleted</span>' : ''}
                    </td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        } else {
            return `
                <tr style="${rowStyle}">
                    <td>
                        <div class="employee-cell">
                            <div class="employee-avatar">
                                ${leave.ProfilePicture ? 
                                    `<img src="${leave.ProfilePicture}" alt="${leave.EmployeeName || ''}">` : 
                                    initials
                                }
                            </div>
                            <div class="employee-info">
                                <div class="employee-name" onclick="window.utils.navigateToProfile(${leave.EmployeeId})">${leave.EmployeeName || (leave.FirstName + ' ' + (leave.LastName || '')) || 'Unknown'}</div>
                                <div class="employee-role text-xs text-gray-500">${leave.DesignationName || 'Employee'}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="leave-type-badge ${leaveTypeBadge}">${leave.LeaveTypeName || leave.LeaveType || '-'}</span></td>
                    <td>${formatLeaveDate(leave.FromDate)}</td>
                    <td>${formatLeaveDate(leave.ToDate)}</td>
                    <td><span class="duration-badge ${duration.type}">${duration.label}</span></td>
                    <td>
                        <span class="${statusBadgeClass}">${leave.Status || 'Pending'}</span>
                        ${isDeleted ? '<span class="deleted-tag text-xs bg-red-100 text-red-600 px-1 rounded ml-1">Deleted</span>' : ''}
                    </td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        }
    }).join('');
}

// Action Menu Functions
function toggleActionMenu(button) {
    document.querySelectorAll('.action-menu').forEach(menu => {
        if (menu !== button.nextElementSibling) {
            menu.classList.remove('active');
        }
    });

    const menu = button.nextElementSibling;
    menu.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', function (e) {
    if (!e.target.closest('.action-dropdown')) {
        document.querySelectorAll('.action-menu').forEach(menu => {
            menu.classList.remove('active');
        });
    }
});

function viewLeave(id) {
    const leave = leaves.find(l => l.LeaveId === id);
    if (leave) {
        document.getElementById('viewEmployeeName').textContent = `${leave.FirstName} ${leave.LastName}`;
        document.getElementById('viewLeaveType').textContent = leave.LeaveType;
        document.getElementById('viewFromDate').textContent = formatLeaveDate(leave.FromDate);
        document.getElementById('viewToDate').textContent = formatLeaveDate(leave.ToDate);
        
        const duration = getDuration(leave.FromDate, leave.ToDate);
        document.getElementById('viewDuration').textContent = duration.label;
        
        const statusEl = document.getElementById('viewStatus');
        statusEl.textContent = leave.Status;
        statusEl.className = 'font-semibold'; // Reset class
        
        const status = (leave.Status || 'Pending').toLowerCase();
        if (status === 'approved') statusEl.classList.add('text-green-600');
        else if (status === 'rejected') statusEl.classList.add('text-red-600');
        else statusEl.classList.add('text-amber-600');
        
        document.getElementById('viewReason').textContent = leave.Reason || 'No reason provided';
        document.getElementById('viewLeaveModal').classList.add('active');
    }
}

function closeViewModal() {
    document.getElementById('viewLeaveModal').classList.remove('active');
}

function approveLeave(id) {
    document.getElementById('statusLeaveId').value = id;
    document.getElementById('leaveStatus').value = 'Approved';
    document.getElementById('statusModalTitle').textContent = 'Approve Leave';
    document.getElementById('statusConfirmationText').textContent = 'Are you sure you want to APPROVE this leave request?';
    document.getElementById('rejectionReasonWrapper').style.display = 'none';
    document.getElementById('statusSubmitBtn').className = 'btn btn-primary bg-green-600 hover:bg-green-700';
    document.getElementById('statusModal').classList.add('active');
}

function rejectLeave(id) {
    document.getElementById('statusLeaveId').value = id;
    document.getElementById('leaveStatus').value = 'Rejected';
    document.getElementById('statusModalTitle').textContent = 'Reject Leave';
    document.getElementById('statusConfirmationText').textContent = 'Please provide a reason for rejecting this leave request.';
    document.getElementById('rejectionReasonWrapper').style.display = 'block';
    document.getElementById('statusSubmitBtn').className = 'btn btn-primary bg-red-600 hover:bg-red-700';
    document.getElementById('statusModal').classList.add('active');
}

function editLeave(id) {
    const leave = leaves.find(l => l.LeaveId === id);
    if (!leave) return;

    // Use New Leave Modal for editing
    document.getElementById('newLeaveForm').reset();
    document.getElementById('newLeaveId').value = leave.LeaveId;
    
    // Set employee
    const memberSelect = document.getElementById('newMemberId');
    memberSelect.value = leave.EmployeeId;
    
    // Set leave type
    const leaveTypeSelect = document.getElementById('newLeaveTypeId');
    leaveTypeSelect.value = leave.LeaveTypeId;
    
    // Set dates
    const fromDate = leave.FromDate.split('T')[0];
    const toDate = leave.ToDate.split('T')[0];
    
    const singleDateWrapper = document.getElementById('newSingleDateWrapper');
    const dateRangeWrapper = document.getElementById('newDateRangeWrapper');
    const multipleRadio = document.querySelector('input[name="newDuration"][value="multiple"]');
    const fullDayRadio = document.querySelector('input[name="newDuration"][value="full-day"]');
    
    if (fromDate !== toDate) {
        multipleRadio.checked = true;
        singleDateWrapper.style.display = 'none';
        dateRangeWrapper.style.display = 'block';
        document.getElementById('newFromDate').value = fromDate;
        document.getElementById('newToDate').value = toDate;
        
        // Remove required from single date
        document.getElementById('newSingleDate').removeAttribute('required');
        document.getElementById('newFromDate').setAttribute('required', 'required');
        document.getElementById('newToDate').setAttribute('required', 'required');
    } else {
        fullDayRadio.checked = true;
        singleDateWrapper.style.display = 'block';
        dateRangeWrapper.style.display = 'none';
        document.getElementById('newSingleDate').value = fromDate;
        
        // Add required to single date
        document.getElementById('newSingleDate').setAttribute('required', 'required');
        document.getElementById('newFromDate').removeAttribute('required');
        document.getElementById('newToDate').removeAttribute('required');
    }
    
    // Set reason
    document.getElementById('newReason').value = leave.Reason || '';
    
    // Set status
    document.getElementById('newLeaveStatus').value = leave.Status;
    
    // Update Modal Title
    document.querySelector('#newLeaveModal .modal-title').textContent = 'Edit Leave';
    
    // Show modal
    document.getElementById('newLeaveModal').classList.add('active');
}

// Checkbox Functions
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.leave-checkbox');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
        const leaveId = parseInt(cb.dataset.leaveId);
        if (selectAll.checked) {
            selectedLeaves.add(leaveId);
        } else {
            selectedLeaves.delete(leaveId);
        }
    });
}

function toggleLeaveSelection(leaveId) {
    if (selectedLeaves.has(leaveId)) {
        selectedLeaves.delete(leaveId);
    } else {
        selectedLeaves.add(leaveId);
    }
    
    // Update select all checkbox
    const checkboxes = document.querySelectorAll('.leave-checkbox');
    const selectAll = document.getElementById('selectAll');
    selectAll.checked = checkboxes.length > 0 && selectedLeaves.size === checkboxes.length;
}

// Search Function
let searchTimeout;
function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        if (!searchTerm) {
            displayLeaves(leaves);
            return;
        }
        
        const filtered = leaves.filter(leave => 
            `${leave.FirstName} ${leave.LastName}`.toLowerCase().includes(searchTerm) ||
            leave.LeaveType.toLowerCase().includes(searchTerm) ||
            leave.Status.toLowerCase().includes(searchTerm)
        );
        
        displayLeaves(filtered);
    }, 300);
}

// Display leaves in their respective sections/tables
function displayLeaves(filteredLeaves) {
    const isManager = window.roleManager && window.roleManager.isRole('manager');
    const isStaff = window.roleManager && (window.roleManager.isRole('admin') || window.roleManager.isRole('hr') || isManager);
    const isOwn = true; // Everyone should be able to see their own leaves

    const mySection = document.getElementById('myLeavesSection');
    const staffSection = document.getElementById('staffLeavesSection');

    if (mySection) mySection.style.display = isOwn ? 'block' : 'none';
    if (staffSection) staffSection.style.display = isStaff ? 'block' : 'none';

    // Render to appropriate tables
    if (isOwn) {
        const ownLeaves = filteredLeaves.filter(l => l.EmployeeId == getCurrentEmpId());
        renderTable(ownLeaves, 'myLeavesTableBody');
    }

    if (isStaff) {
        const staffLeaves = isManager ?
            filteredLeaves.filter(l => l.EmployeeId != getCurrentEmpId()) :
            filteredLeaves;
        renderTable(staffLeaves, 'staffLeavesTableBody');
    }
}

// Toggle Filters
function toggleFilters() {
    const filters = document.getElementById('additionalFilters');
    filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
}

// Export Function
function exportLeaves() {
    if (leaves.length === 0) {
        utils.showAlert('No data to export', 'warning');
        return;
    }
    
    // Create CSV content
    const headers = ['Employee', 'Leave Type', 'From Date', 'To Date', 'Days', 'Status', 'Reason'];
    const csvContent = [
        headers.join(','),
        ...leaves.map(leave => {
            const days = calculateDays(leave.FromDate, leave.ToDate);
            return [
                `"${leave.FirstName} ${leave.LastName}"`,
                `"${leave.LeaveType}"`,
                utils.formatDate(leave.FromDate),
                utils.formatDate(leave.ToDate),
                days,
                leave.Status,
                `"${leave.Reason}"`
            ].join(',');
        })
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaves_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    utils.showAlert('Leaves exported successfully', 'success');
}

// Load Employees
async function loadEmployees() {
    try {
        const response = await endpoints.employees.getAll();
        allEmployees = response.data || [];
        
        console.log('📥 Loaded employees from API:', allEmployees.length);
        
        // Filter employees based on role (for dropdown and manager team detection)
        if (window.roleManager) {
            const dataScope = window.roleManager.getDataScope();
            const currentEmployeeId = window.roleManager.getCurrentEmployeeId();
            
            console.log('🔍 Role-based filtering:', { dataScope, currentEmployeeId });
            
            if (dataScope === 'own' && currentEmployeeId) {
                employees = allEmployees.filter(emp => emp.EmployeeId == currentEmployeeId);
                console.log(`📊 Filtered to own data: ${employees.length} employee(s)`);
            } else if (dataScope === 'team' && currentEmployeeId) {
                employees = allEmployees.filter(emp => 
                    emp.ReportingTo == currentEmployeeId || emp.EmployeeId == currentEmployeeId
                );
                console.log(`📊 Filtered to team data: ${employees.length} employee(s)`);
            } else {
                employees = allEmployees;
                console.log(`📊 Showing all data: ${employees.length} employee(s)`);
            }
        } else {
            employees = allEmployees;
        }
        
        // For the "Assign Leave" modal dropdown, we should show ALL employees
        // regardless of role, but the backend will validate permissions
        // NEW LOGIC: Respect role filtering for filterEmployee too!
        // Skip newMemberId here, it's handled in populateNewLeaveDropdowns
        const selects = [document.getElementById('employeeId'), document.getElementById('filterEmployee')];
        selects.forEach((select, idx) => {
            if (!select) return; // Skip if element not found
            
            // For filterEmployee (idx 1), use filtered list if restricted role
            // For employeeId (idx 0), use filtered list
            
            let employeeList = employees;
            
            // If Admin/HR, they can see all in filter. 
            // If Manager, they see team (in 'employees'). 
            // If Employee, they see themselves (in 'employees').
            
            const options = idx === 1 ? '<option value="">All Employees</option>' : '<option value="">Select Employee</option>';
            
            select.innerHTML = options + employeeList.map(e => 
                `<option value="${e.EmployeeId}">${e.FirstName} ${e.LastName}</option>`
            ).join('');
            
            console.log(`✅ Populated dropdown ${select.id} with ${employeeList.length} employees`);
        });
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Load Leave Types
async function loadLeaveTypes() {
    try {
        const response = await endpoints.leaves.getTypes();
        leaveTypes = response.data || [];
        
        // Populate modal select
        const select = document.getElementById('newLeaveTypeId');
        if (select) {
            select.innerHTML = '<option value="">Select Leave Type</option>' +
                leaveTypes.map(lt => `<option value="${lt.LeaveTypeId}">${lt.TypeName} (${lt.MaxDaysPerYear} days/year)</option>`).join('');
        }
        
        // Populate filter select
        const filterSelect = document.getElementById('filterLeaveType');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">All Types</option>' +
                leaveTypes.map(lt => `<option value="${lt.LeaveTypeId}">${lt.TypeName}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading leave types:', error);
    }
}

// Modal Functions
async function editLeave(id) {
    const leave = leaves.find(l => l.LeaveId == id);
    if (!leave) {
        console.error('Leave not found for editing:', id);
        return;
    }

    // Reset and open modal
    await openNewLeaveModal();
    
    // Change title to reflect editing
    document.querySelector('#newLeaveModal .modal-title').textContent = 'Edit Leave Request';
    document.getElementById('newLeaveId').value = leave.LeaveId;
    
    // Populate fields
    const memberSelect = document.getElementById('newMemberId');
    if (memberSelect) {
        memberSelect.value = leave.EmployeeId;
    }
    
    document.getElementById('newLeaveTypeId').value = leave.LeaveTypeId;
    document.getElementById('newReason').value = leave.Reason || '';
    
    if (document.getElementById('newLeaveStatus')) {
        document.getElementById('newLeaveStatus').value = leave.Status || 'Pending';
    }

    // Handle duration (safe split)
    const fromDate = (leave.FromDate || '').split('T')[0];
    const toDate = (leave.ToDate || '').split('T')[0];
    
    if (fromDate === toDate) {
        document.querySelector('input[name="newDuration"][value="full-day"]').checked = true;
        document.getElementById('newSingleDate').value = fromDate;
    } else {
        document.querySelector('input[name="newDuration"][value="multiple"]').checked = true;
        document.getElementById('newFromDate').value = fromDate;
        document.getElementById('newToDate').value = toDate;
    }
    
    toggleNewDateInputs();
}

function openStatusModal(id, status) {
    const leave = leaves.find(l => l.LeaveId === id);
    if (!leave) return;

    document.getElementById('statusLeaveId').value = id;
    document.getElementById('leaveStatus').value = status;
    
    // Customize based on status
    const titleEl = document.getElementById('statusModalTitle');
    const submitBtn = document.getElementById('statusSubmitBtn');
    const confirmationText = document.getElementById('statusConfirmationText');
    const reasonWrapper = document.getElementById('rejectionReasonWrapper');

    if (status === 'Approved') {
        titleEl.textContent = 'Approve Leave Request';
        submitBtn.className = 'btn btn-primary bg-green-600 hover:bg-green-700 text-white';
        submitBtn.textContent = 'Approve';
        confirmationText.textContent = `Are you sure you want to approve the leave for ${leave.FirstName} ${leave.LastName}?`;
    } else {
        titleEl.textContent = 'Reject Leave Request';
        submitBtn.className = 'btn btn-primary bg-red-600 hover:bg-red-700 text-white';
        submitBtn.textContent = 'Reject';
        confirmationText.textContent = `Are you sure you want to reject the leave for ${leave.FirstName} ${leave.LastName}?`;
    }

    // Reset reason
    document.getElementById('rejectionReason').value = '';
    
    document.getElementById('statusModal').classList.add('active');
}

function approveLeave(id) {
    openStatusModal(id, 'Approved');
}

function rejectLeave(id) {
    openStatusModal(id, 'Rejected');
}

async function viewLeave(id) {
    const leave = leaves.find(l => l.LeaveId === id);
    if (!leave) return;
    
    const duration = getDuration(leave.FromDate, leave.ToDate);
    
    document.getElementById('viewEmployeeName').textContent = `${leave.FirstName} ${leave.LastName}`;
    document.getElementById('viewLeaveType').textContent = leave.LeaveType || '-';
    document.getElementById('viewFromDate').textContent = formatLeaveDate(leave.FromDate);
    document.getElementById('viewToDate').textContent = formatLeaveDate(leave.ToDate);
    document.getElementById('viewDuration').textContent = duration.label;
    document.getElementById('viewReason').textContent = leave.Reason || '-';
    
    const statusEl = document.getElementById('viewStatus');
    statusEl.textContent = leave.Status;
    statusEl.className = `status-badge ${leave.Status.toLowerCase()}`;
    
    document.getElementById('viewLeaveModal').classList.add('active');
}

function closeViewModal() {
    document.getElementById('viewLeaveModal').classList.remove('active');
}

async function updateStatus() {
    const form = document.getElementById('statusForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const id = document.getElementById('statusLeaveId').value;
    const data = {
        status: document.getElementById('leaveStatus').value,
        rejectionReason: document.getElementById('rejectionReason').value || null
    };

    try {
        await endpoints.leaves.updateStatus(id, data);
        utils.showAlert(`Leave ${data.status.toLowerCase()} successfully`, 'success');
        closeStatusModal();
        loadLeaves();
    } catch (error) {
        console.error('Error updating leave status:', error);
        utils.showAlert('Failed to update leave status', 'error');
    }
}

let _pendingDeleteLeaveId = null;

function openDeleteModal(id) {
    _pendingDeleteLeaveId = id;
    document.getElementById('leaveDeleteReasonInput').value = '';
    document.getElementById('softDeleteModal').classList.add('active');
}

function closeSoftDeleteModal() {
    document.getElementById('softDeleteModal').classList.remove('active');
    _pendingDeleteLeaveId = null;
}

async function confirmSoftDelete() {
    const reason = document.getElementById('leaveDeleteReasonInput').value.trim();
    try {
        await endpoints.leaves.delete(_pendingDeleteLeaveId, { reason });
        utils.showAlert('Leave deleted successfully', 'success');
        closeSoftDeleteModal();
        loadLeaves();
    } catch (error) {
        utils.showAlert('Failed to delete leave', 'error');
    }
}

async function restoreLeave(id) {
    if (!confirm('Restore this leave?')) return;
    try {
        await endpoints.leaves.restore(id);
        utils.showAlert('Leave restored successfully', 'success');
        loadLeaves();
    } catch (error) {
        utils.showAlert('Failed to restore leave', 'error');
    }
}

async function hardDeleteLeave(id) {
    if (!confirm('⚠️ Permanently delete? This CANNOT be undone.')) return;
    try {
        await endpoints.leaves.hardDelete(id);
        utils.showAlert('Leave permanently deleted', 'success');
        loadLeaves();
    } catch (error) {
        utils.showAlert('Failed to permanently delete leave', 'error');
    }
}

// Removed legacy closeModal function

function closeStatusModal() {
    document.getElementById('statusModal').classList.remove('active');
}

// ========== NEW LEAVE MODAL FUNCTIONS ==========

let newLeaveSelectedFile = null;

// Open New Leave Modal
async function openNewLeaveModal() {
    document.getElementById('newLeaveForm').reset();
    newLeaveSelectedFile = null;
    
    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('newSingleDate').value = today;
    
    // Ensure employees and leave types are loaded before populating
    if (employees.length === 0) {
        console.log('📥 Employees not loaded, loading now...');
        await loadEmployees();
    }
    if (leaveTypes.length === 0) {
        console.log('📥 Leave types not loaded, loading now...');
        await loadLeaveTypes();
    }
    
    // Populate dropdowns
    populateNewLeaveDropdowns();
    
    // Show modal
    document.querySelector('#newLeaveModal .modal-title').textContent = 'Assign Leave';
    document.getElementById('newLeaveId').value = ''; // Clear ID
    document.getElementById('newLeaveModal').classList.add('active');
}

// Close New Leave Modal
function closeNewLeaveModal() {
    document.getElementById('newLeaveModal').classList.remove('active');
}

// Populate dropdowns for new leave modal
function populateNewLeaveDropdowns() {
    // Populate employees - respect role!
    const memberSelect = document.getElementById('newMemberId');
    const roleManager = window.roleManager;
    const statusField = document.getElementById('newLeaveStatus')?.closest('.form-group');
    
    // Default state
    if (statusField) statusField.style.display = 'block';
    memberSelect.disabled = false;
    
    let employeesToPopulate = allEmployees;

    if (roleManager && roleManager.isRole('employee')) {
        // Employee: Restrict to self
        const currentEmpId = roleManager.getCurrentEmployeeId();
        employeesToPopulate = allEmployees.filter(e => e.EmployeeId == currentEmpId);
        memberSelect.disabled = true;
        
        // Hide status field (force Pending)
        if (statusField) statusField.style.display = 'none';
        
        // Auto-set status to Pending just in case
        const statusSelect = document.getElementById('newLeaveStatus');
        if (statusSelect) statusSelect.value = 'Pending';
        
    } else if (roleManager && roleManager.isRole('manager')) {
        // Manager: Show team? Or all? Plan said "Show all" for Manager/HR/Admin
        // But practically Manager might only assign to team. 
        // For now, sticking to "Show All" as per plan for Manager/HR/Admin, 
        // but typically Manager should limit to team.
        // Plan: "If logged-in role is Manager / HR / Admin: “Choose Member” dropdown should show all employees"
        employeesToPopulate = allEmployees;
    }

    console.log('🔍 Populating member dropdown:', {
        role: roleManager ? roleManager.getCurrentRole() : 'unknown',
        count: employeesToPopulate.length
    });
    
    if (employeesToPopulate.length === 0) {
        memberSelect.innerHTML = '<option value="">-- No employees available --</option>';
    } else {
        memberSelect.innerHTML = '<option value="">--</option>' + 
            employeesToPopulate.map(e => {
                const isSelected = (roleManager && roleManager.isRole('employee')) ? 'selected' : '';
                return `<option value="${e.EmployeeId}" ${isSelected}>${e.FirstName} ${e.LastName}</option>`;
            }).join('');
    }
    
    // Populate leave types
    const leaveTypeSelect = document.getElementById('newLeaveTypeId');
    
    if (leaveTypes.length === 0) {
        leaveTypeSelect.innerHTML = '<option value="">-- No leave types available --</option>';
    } else {
        leaveTypeSelect.innerHTML = '<option value="">--</option>' + 
            leaveTypes.map(lt => `<option value="${lt.LeaveTypeId}">${lt.TypeName}</option>`).join('');
    }
}

// Handle duration change in new leave modal
function handleNewDurationChange() {
    const duration = document.querySelector('input[name="newDuration"]:checked').value;
    const singleDateWrapper = document.getElementById('newSingleDateWrapper');
    const dateRangeWrapper = document.getElementById('newDateRangeWrapper');
    const singleDateInput = document.getElementById('newSingleDate');
    const fromDateInput = document.getElementById('newFromDate');
    const toDateInput = document.getElementById('newToDate');
    
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

// Setup file upload for new leave modal
function setupNewFileUpload() {
    const dropZone = document.getElementById('newFileUploadZone');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
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
            handleNewFile(files[0]);
        }
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Handle file selection
function handleNewFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleNewFile(file);
    }
}

// Handle file
function handleNewFile(file) {
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
    
    newLeaveSelectedFile = file;
    displayNewFilePreview(file);
}

// Display file preview
function displayNewFilePreview(file) {
    const uploadContent = document.getElementById('newFileUploadContent');
    const preview = document.getElementById('newFilePreview');
    
    uploadContent.style.display = 'none';
    preview.style.display = 'flex';
    
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
        <button type="button" class="file-remove" onclick="removeNewFile()">✕</button>
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
function removeNewFile() {
    newLeaveSelectedFile = null;
    document.getElementById('newFileInput').value = '';
    document.getElementById('newFileUploadContent').style.display = 'block';
    document.getElementById('newFilePreview').style.display = 'none';
}

// Add leave type (placeholder)
function addLeaveType() {
    utils.showAlert('Add Leave Type functionality coming soon', 'info');
}

// Show hosting suggestions
function showHostingSuggestions() {
    const reasonTextarea = document.getElementById('newReason');
    const suggestions = [
        'Feeling unwell and need rest',
        'Personal family matter',
        'Medical appointment scheduled',
        'Emergency situation at home',
        'Planned vacation'
    ];
    
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    
    if (confirm(`Suggestion: "${randomSuggestion}"\n\nUse this suggestion?`)) {
        reasonTextarea.value = randomSuggestion;
    }
}

// Save Leave
async function saveNewLeave() {
    const form = document.getElementById('newLeaveForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const duration = document.querySelector('input[name="newDuration"]:checked').value;
    let fromDate, toDate;
    
    if (duration === 'multiple') {
        fromDate = document.getElementById('newFromDate').value;
        toDate = document.getElementById('newToDate').value;
    } else {
        fromDate = document.getElementById('newSingleDate').value;
        toDate = fromDate;
    }
    
    const id = document.getElementById('newLeaveId').value;
    const currentEmpId = window.roleManager ? window.roleManager.getCurrentEmployeeId() : null;
    const canManageLeaves = window.roleManager && ['admin', 'hr', 'manager'].includes(window.roleManager.getCurrentRole());

    const data = {
        employeeId: !canManageLeaves ? currentEmpId : parseInt(document.getElementById('newMemberId').value),
        leaveTypeId: parseInt(document.getElementById('newLeaveTypeId').value),
        fromDate: fromDate,
        toDate: toDate,
        reason: document.getElementById('newReason').value,
        status: canManageLeaves ? document.getElementById('newLeaveStatus').value : 'Pending'
    };
    
    try {
        if (id) {
            await endpoints.leaves.update(id, data);
            utils.showAlert('Leave updated successfully', 'success');
        } else {
            await endpoints.leaves.create(data);
            utils.showAlert('Leave applied successfully', 'success');
        }
        
        closeNewLeaveModal();
        loadLeaves();
    } catch (error) {
        console.error('Error saving leave:', error);
        utils.showAlert(error.message || 'Failed to save leave', 'error');
    }
}

function toggleNewDateInputs() {
    const duration = document.querySelector('input[name="newDuration"]:checked').value;
    const singleWrapper = document.getElementById('newSingleDateWrapper');
    const rangeWrapper = document.getElementById('newDateRangeWrapper');
    
    if (duration === 'multiple') {
        singleWrapper.style.display = 'none';
        rangeWrapper.style.display = 'block';
        document.getElementById('newSingleDate').removeAttribute('required');
        document.getElementById('newFromDate').setAttribute('required', 'required');
        document.getElementById('newToDate').setAttribute('required', 'required');
    } else {
        singleWrapper.style.display = 'block';
        rangeWrapper.style.display = 'none';
        document.getElementById('newSingleDate').setAttribute('required', 'required');
        document.getElementById('newFromDate').removeAttribute('required');
        document.getElementById('newToDate').removeAttribute('required');
    }
}

// ========== MY LEAVES FUNCTIONS ==========

// Load employee profile
async function loadEmployeeProfile(id = null) {
    if (!id) id = getCurrentEmpId();
    if (!id) return;
    try {
        const response = await endpoints.employees.getById(id);
        const emp = response.data;
        if (!emp) return;
        employeeData = emp;

        const nameEl = document.getElementById('profileName');
        const roleEl = document.getElementById('profileRole');
        const emailEl = document.getElementById('profileEmail');
        const phoneEl = document.getElementById('profilePhone');
        const avatarEl = document.getElementById('profileAvatar');

        if (nameEl) nameEl.textContent = `${emp.FirstName} ${emp.LastName}`;
        if (roleEl) roleEl.textContent = emp.DesignationName || emp.UserRole || 'Employee';
        if (emailEl) emailEl.textContent = emp.Email || '-';
        if (phoneEl) phoneEl.textContent = emp.Phone || '-';
        if (avatarEl) avatarEl.textContent = getInitials(emp.FirstName, emp.LastName);
        
        // Also load balance
        loadLeaveBalance(id);
    } catch (error) {
        console.warn('Error loading employee profile for leave card:', error);
    }
}

// Load leave balance
async function loadLeaveBalance(id = null) {
    if (!id) id = getCurrentEmpId();
    if (!id) return;
    try {
        const response = await endpoints.leaves.getBalance(id);
        leaveBalanceData = response.data || [];
        calculateAndDisplayRemainingLeaves(leaveBalanceData);
    } catch (error) {
        console.error('Error loading leave balance:', error);
    }
}

// Render profile section
function renderProfile(employee) {
    if (!employee) return;

    // Profile avatar
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) {
        const initials = getInitials(employee.FirstName, employee.LastName);
        
        if (employee.ProfilePicture) {
            avatarEl.innerHTML = `<img src="${employee.ProfilePicture}" alt="${employee.FirstName}">`;
        } else {
            avatarEl.textContent = initials;
        }
    }

    // Profile name and role
    const nameEl = document.getElementById('profileName');
    const roleEl = document.getElementById('profileRole');
    if (nameEl) nameEl.textContent = `${employee.FirstName} ${employee.LastName}`;
    if (roleEl) roleEl.textContent = `${employee.DesignationName || 'Employee'} • ${employee.DepartmentName || 'General'}`;

    // Profile meta
    const emailEl = document.getElementById('profileEmail');
    const phoneEl = document.getElementById('profilePhone');
    if (emailEl) emailEl.textContent = employee.Email || '-';
    if (phoneEl) phoneEl.textContent = employee.Phone || '-';
    
    // Last login (using current date as placeholder)
    const loginEl = document.getElementById('profileLastLogin');
    if (loginEl) {
        const now = new Date();
        const lastLogin = now.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        loginEl.textContent = lastLogin;
    }
}

// Calculate and display total remaining leaves
function calculateAndDisplayRemainingLeaves(balanceData) {
    const countEl = document.getElementById('remainingLeavesCount');
    if (!countEl) return;

    if (!balanceData || balanceData.length === 0) {
        countEl.textContent = '0';
        return;
    }

    const totalRemaining = balanceData.reduce((sum, item) => {
        const remaining = (item.MaxDaysPerYear || 0) - (item.TotalTaken || 0);
        return sum + Math.max(0, remaining);
    }, 0);

    countEl.textContent = totalRemaining;
}

// Render leave quota table
function renderLeaveQuota(balanceData) {
    const tbody = document.getElementById('quotaTableBody');
    if (!tbody) return;

    if (!balanceData || balanceData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div>No leave quota data available</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = balanceData.map(item => {
        const allocated = item.MaxDaysPerYear || 0;
        const monthlyLimit = item.MonthlyLimit || '--';
        const taken = item.TotalTaken || 0;
        const remaining = Math.max(0, allocated - taken);
        const overUtilized = Math.max(0, taken - allocated);
        const unused = remaining;

        const leaveTypeClass = getLeaveTypeClass(item.TypeName);

        return `
            <tr>
                <td>
                    <div class="leave-type-cell">
                        <span class="leave-type-indicator ${leaveTypeClass}"></span>
                        <span class="leave-type-name">${item.TypeName}</span>
                    </div>
                </td>
                <td><span class="quota-number">${allocated}</span></td>
                <td><span class="quota-number ${monthlyLimit === '--' ? 'zero' : ''}">${monthlyLimit}</span></td>
                <td><span class="quota-number">${taken}</span></td>
                <td><span class="quota-number ${remaining === 0 ? 'zero' : 'positive'}">${remaining}</span></td>
                <td><span class="quota-number ${overUtilized > 0 ? 'negative' : 'zero'}">${overUtilized}</span></td>
                <td><span class="quota-number ${unused === 0 ? 'zero' : 'positive'}">${unused}</span></td>
            </tr>
        `;
    }).join('');
}

// Get leave type CSS class
function getLeaveTypeClass(typeName) {
    const type = typeName.toLowerCase();
    if (type.includes('casual')) return 'casual';
    if (type.includes('sick')) return 'sick';
    if (type.includes('earned') || type.includes('paid')) return 'earned';
    return 'casual'; // default
}

// Scroll to My Leaves section
function scrollToMyLeaves() {
    const section = document.getElementById("myLeavesSection");
    
    if (!section) return;
    
    // Show section if hidden
    if (section.style.display === "none") {
        section.style.display = "block";
    }
    
    // Scroll to section
    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
    
    // Add a subtle highlight effect to profile card
    const profileCard = document.getElementById('profileCard');
    if (profileCard) {
        profileCard.style.transition = 'box-shadow 0.3s ease';
        profileCard.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.3)';
        setTimeout(() => {
            profileCard.style.boxShadow = '';
        }, 2000);
    }
}

// Initialize
async function init() {
    try {
        await loadEmployees();
        await loadLeaveTypes();
        await loadLeaves();
        console.log('🚀 Leave Management initialized successfully');
    } catch (error) {
        console.error('❌ Initialization failed:', error);
    }
}

init();
