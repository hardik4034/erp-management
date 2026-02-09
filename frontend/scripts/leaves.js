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
const CURRENT_EMPLOYEE_ID = 1; // For testing - can be changed to logged-in user
let employeeData = null;
let leaveBalanceData = [];

// Load all data on page load
// Load all data on page load
async function loadLeaves() {
    try {
        const params = {};
        const status = document.getElementById('filterStatus').value;
        const empId = document.getElementById('filterEmployee').value;
        const leaveTypeId = document.getElementById('filterLeaveType').value;
        const fromDate = document.getElementById('filterFromDate').value;
        const toDate = document.getElementById('filterToDate').value;
        
        if (status) params.status = status;
        if (empId) params.employeeId = empId;

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
        
        renderTable(filteredLeaves);
        
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

function renderTable(leavesToRender = leaves) {
    const tbody = document.getElementById('leavesTable');
    if (leavesToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No leave requests found</td></tr>';
        return;
    }

    tbody.innerHTML = leavesToRender.map((leave, index) => {
        const duration = getDuration(leave.FromDate, leave.ToDate);
        const leaveTypeBadge = getLeaveTypeBadgeClass(leave.LeaveType);
        const initials = getInitials(leave.FirstName, leave.LastName);
        const isPaid = leave.LeaveType.toLowerCase().includes('paid') && !leave.LeaveType.toLowerCase().includes('unpaid');
        
        // Determine permissions
        // Use roleManager if available, otherwise fallback to auth (which might be mock)
        // Employee role should NOT see actions
        let canShowActions = false;
        if (window.roleManager) {
            const role = window.roleManager.getCurrentRole();
            // Show actions for Admin, HR, Manager. Hide for Employee.
            canShowActions = ['admin', 'hr', 'manager'].includes(role);
        } else {
             canShowActions = canManage; // Fallback
        }
        return `
            <tr>
                <td class="checkbox-cell">
                    <input type="checkbox" class="leave-checkbox" data-leave-id="${leave.LeaveId}" 
                           onchange="toggleLeaveSelection(${leave.LeaveId})" 
                           ${selectedLeaves.has(leave.LeaveId) ? 'checked' : ''}>
                </td>
                <td>
                    <div class="employee-cell">
                        <div class="employee-avatar">
                            ${leave.ProfilePicture ? 
                                `<img src="${leave.ProfilePicture}" alt="${leave.FirstName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                                initials
                            }
                        </div>
                        <div class="employee-info">
                            <div class="employee-name" style="cursor: pointer; color: var(--primary-color);" 
                                 onclick="window.utils.navigateToProfile(${leave.EmployeeId})" 
                                 title="View ${leave.FirstName} ${leave.LastName}'s profile">${leave.FirstName} ${leave.LastName}</div>
                            <div class="employee-role">${leave.DesignationName || 'Trainee'}</div>
                        </div>
                    </div>
                </td>
                <td>${formatLeaveDate(leave.FromDate)}</td>
                <td>
                    <span class="duration-badge ${duration.type}">${duration.label}</span>
                </td>
                <td>
                    <span class="badge badge-${leave.Status.toLowerCase()}">${leave.Status}</span>
                </td>
                <td>
                    <span class="leave-type-badge ${leaveTypeBadge}">${leave.LeaveType}</span>
                </td>
                <td>
                    <span class="paid-icon ${isPaid ? 'yes' : 'no'}">${isPaid ? '✓' : '✗'}</span>
                </td>
                <td>
                    <div class="action-dropdown">
                        <button class="action-btn" onclick="toggleActionMenu(this)">⋮</button>
                        <div class="action-menu">
                            <div class="action-menu-item" onclick="viewLeave(${leave.LeaveId})">
                                👁️ View
                            </div>
                            ${canShowActions ? `
                            <div class="action-menu-item" onclick="editLeave(${leave.LeaveId})">
                                ✏️ Edit
                            </div>
                            <div class="action-menu-item success" onclick="approveLeave(${leave.LeaveId})">
                                ✅ Approve
                            </div>
                            <div class="action-menu-item warning" onclick="rejectLeave(${leave.LeaveId})">
                                ❌ Reject
                            </div>
                            <div class="action-menu-item danger" onclick="deleteLeave(${leave.LeaveId})">
                                🗑️ Delete
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </td>
            </tr>
        `;
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
        document.getElementById('viewFromDate').textContent = utils.formatDate(leave.FromDate);
        document.getElementById('viewToDate').textContent = utils.formatDate(leave.ToDate);
        
        const days = calculateDays(leave.FromDate, leave.ToDate);
        document.getElementById('viewDuration').textContent = `${days} Day(s)`;
        
        const statusEl = document.getElementById('viewStatus');
        statusEl.textContent = leave.Status;
        statusEl.className = 'form-control-static'; // Reset class
        if (leave.Status === 'Approved') statusEl.style.color = 'var(--secondary-color)';
        if (leave.Status === 'Rejected') statusEl.style.color = 'var(--danger-color)';
        
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
    document.getElementById('statusModal').classList.add('active');
}

function rejectLeave(id) {
    document.getElementById('statusLeaveId').value = id;
    document.getElementById('leaveStatus').value = 'Rejected';
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
            renderTable(leaves);
            return;
        }
        
        const filtered = leaves.filter(leave => 
            `${leave.FirstName} ${leave.LastName}`.toLowerCase().includes(searchTerm) ||
            leave.LeaveType.toLowerCase().includes(searchTerm) ||
            leave.Status.toLowerCase().includes(searchTerm)
        );
        
        renderTable(filtered);
    }, 300);
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
        const select = document.getElementById('leaveTypeId');
        select.innerHTML = '<option value="">Select Leave Type</option>' +
            leaveTypes.map(lt => `<option value="${lt.LeaveTypeId}">${lt.TypeName} (${lt.MaxDaysPerYear} days/year)</option>`).join('');
        
        // Populate filter select
        const filterSelect = document.getElementById('filterLeaveType');
        filterSelect.innerHTML = '<option value="">All Types</option>' +
            leaveTypes.map(lt => `<option value="${lt.LeaveTypeId}">${lt.TypeName}</option>`).join('');
    } catch (error) {
        console.error('Error loading leave types:', error);
    }
}

// Modal Functions
function openAddModal() {
    document.getElementById('leaveForm').reset();
    document.getElementById('leaveModal').classList.add('active');
}

async function saveLeave() {
    const form = document.getElementById('leaveForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const data = {
        employeeId: parseInt(document.getElementById('employeeId').value),
        leaveTypeId: parseInt(document.getElementById('leaveTypeId').value),
        fromDate: document.getElementById('fromDate').value,
        toDate: document.getElementById('toDate').value,
        reason: document.getElementById('reason').value
    };

    try {
        await endpoints.leaves.create(data);
        utils.showAlert('Leave applied successfully', 'success');
        closeModal();
        loadLeaves();
    } catch (error) {
        console.error('Error applying leave:', error);
        utils.showAlert(error.message || 'Failed to apply leave', 'error');
    }
}

function openStatusModal(id, status) {
    document.getElementById('statusLeaveId').value = id;
    if (status) {
        document.getElementById('leaveStatus').value = status;
    }
    document.getElementById('statusModal').classList.add('active');
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

async function deleteLeave(id) {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
        await endpoints.leaves.delete(id);
        utils.showAlert('Leave cancelled successfully', 'success');
        loadLeaves();
    } catch (error) {
        console.error('Error deleting leave:', error);
        utils.showAlert('Failed to cancel leave', 'error');
    }
}

function closeModal() {
    document.getElementById('leaveModal').classList.remove('active');
}

function closeStatusModal() {
    document.getElementById('statusModal').classList.remove('active');
}

// ========== NEW LEAVE MODAL FUNCTIONS ==========

let newLeaveSelectedFile = null;

// Open New Leave Modal
async function openNewLeaveModal() {
    // Reset form
    document.getElementById('newLeaveForm').reset();
    newLeaveSelectedFile = null;
    
    // Reset file upload UI
    document.getElementById('newFileUploadContent').style.display = 'block';
    document.getElementById('newFilePreview').style.display = 'none';
    
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
    
    // Setup file upload
    setupNewFileUpload();
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

// Save new leave
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
    
    const data = {
        employeeId: parseInt(document.getElementById('newMemberId').value),
        leaveTypeId: parseInt(document.getElementById('newLeaveTypeId').value),
        fromDate: fromDate,
        toDate: toDate,
        reason: document.getElementById('newReason').value,
        status: document.getElementById('newLeaveStatus').value,
        durationType: duration
    };
    
    const id = document.getElementById('newLeaveId').value;

    try {
        console.log('💾 Saving leave with data:', data);
        
        if (id) {
            await endpoints.leaves.update(id, data);
            utils.showAlert('Leave updated successfully', 'success');
        } else {
            const response = await endpoints.leaves.create(data);
            console.log('✅ Leave created successfully:', response);
            utils.showAlert('Leave created successfully', 'success');
        }
        
        // TODO: Handle file upload if file is selected
        if (newLeaveSelectedFile) {
            console.log('File upload not yet implemented:', newLeaveSelectedFile.name);
        }
        
        closeNewLeaveModal();
        loadLeaves();
    } catch (error) {
        console.error('Error saving leave:', error);
        utils.showAlert(error.message || 'Failed to save leave', 'error');
    }
}

// ========== MY LEAVES FUNCTIONS ==========

// Load employee profile
async function loadEmployeeProfile() {
    try {
        const response = await endpoints.employees.getById(CURRENT_EMPLOYEE_ID);
        employeeData = response.data;
        renderProfile(employeeData);
    } catch (error) {
        console.error('Error loading employee profile:', error);
        // Silently fail - profile section will show loading state
    }
}

// Load leave balance
async function loadLeaveBalance() {
    try {
        const response = await endpoints.leaves.getBalance(CURRENT_EMPLOYEE_ID);
        leaveBalanceData = response.data || [];
        renderLeaveQuota(leaveBalanceData);
        calculateAndDisplayRemainingLeaves(leaveBalanceData);
    } catch (error) {
        console.error('Error loading leave balance:', error);
        const tbody = document.getElementById('quotaTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <div>Failed to load leave quota data</div>
                    </td>
                </tr>
            `;
        }
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
loadEmployees();
loadLeaveTypes();
loadLeaves();
loadEmployeeProfile();
loadLeaveBalance();
