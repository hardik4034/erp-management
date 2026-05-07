/**
 * Payroll Management Script
 * Handles fetching, displaying, and generating payroll records.
 */

// Initialize state
let payrollData = [];
let employees = [];
let departments = [];
let roles = [];

// Initialize Auth and Role Manager
const initPayroll = async () => {
    try {
        // Ensure auth is initialized
        if (typeof auth !== 'undefined' && typeof auth.initAuth === 'function') {
            auth.initAuth();
        }

        // Wait for roleManager to be ready
        if (typeof roleManager !== 'undefined' && typeof roleManager.applyRolePermissions === 'function') {
            roleManager.applyRolePermissions();
        }

        // Load initial data
        await Promise.all([
            loadEmployees(),
            loadDepartments()
        ]);

        // After loading metadata, load payroll records
        await loadPayrollRecords();

        // Populate filters
        populateFilterDropdowns();

        console.log('✅ Payroll initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing payroll:', error);
        if (window.utils && window.utils.showAlert) {
            utils.showAlert('Failed to initialize payroll: ' + error.message, 'error');
        }
    }
};

/**
 * Load payroll records with advanced filtering
 */
async function loadPayrollRecords() {
    try {
        const tbody = document.getElementById('payrollTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8">
                        <div class="spinner-border text-primary" role="status"></div>
                        <div class="mt-2 text-gray-500">Loading payroll records...</div>
                    </td>
                </tr>
            `;
        }

        const role = window.roleManager ? window.roleManager.getCurrentRole() : 'employee';
        const currentEmployeeId = window.roleManager ? window.roleManager.getCurrentEmployeeId() : null;
        
        // Collect filters
        const params = {};
        
        // Role-based scoping
        if (role === 'employee' || role === 'manager') {
            params.employeeId = currentEmployeeId;
        } else {
            // HR/Admin can use individual employee filter
            const filterEmp = document.getElementById('filterEmployee')?.value;
            if (filterEmp) params.employeeId = filterEmp;
        }

        const filterDept = document.getElementById('filterDepartment')?.value;
        const filterStatus = document.getElementById('filterStatus')?.value;
        const filterYear = document.getElementById('filterYear')?.value;
        const filterMonth = document.getElementById('filterMonth')?.value;

        if (filterDept) params.departmentId = filterDept;
        if (filterStatus) params.status = filterStatus;
        if (filterYear) params.year = filterYear;
        if (filterMonth) params.month = filterMonth;

        console.log('📡 Fetching payroll records with params:', params);
        const response = await endpoints.payroll.getAll(params);
        payrollData = response.data || [];

        renderPayrollTable();
    } catch (error) {
        console.error('Error loading payroll records:', error);
        const tbody = document.getElementById('payrollTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-8">Error: ${error.message}</td></tr>`;
        }
    }
}

/**
 * Load metadata for dropdowns
 */
async function loadEmployees() {
    try {
        const response = await endpoints.employees.getAll();
        employees = response.data || [];
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

async function loadDepartments() {
    try {
        const response = await endpoints.departments.getAll();
        departments = response.data || [];
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

/**
 * Populate filter dropdowns
 */
function populateFilterDropdowns() {
    const empSelect = document.getElementById('filterEmployee');
    if (empSelect) {
        empSelect.innerHTML = '<option value="">All Employees</option>' +
            employees.map(emp => `<option value="${emp.EmployeeId}">${emp.FirstName} ${emp.LastName} (${emp.EmployeeCode})</option>`).join('');
    }

    const deptSelect = document.getElementById('filterDepartment');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">All Departments</option>' +
            departments.map(dept => `<option value="${dept.DepartmentId}">${dept.DepartmentName}</option>`).join('');
    }
}

/**
 * Render the enhanced payroll table
 */
function renderPayrollTable() {
    const tbody = document.getElementById('payrollTableBody');
    if (!tbody) return;

    if (payrollData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No payroll records found matching the filters.</td></tr>';
        return;
    }

    tbody.innerHTML = payrollData.map(record => {
        const monthYear = formatMonthYear(record.PayPeriodStart);
        const statusClass = getStatusBadgeClass(record.Status);
        const canManage = window.roleManager && (roleManager.isRole('admin') || roleManager.isRole('hr'));
        
        // Attendance summary
        const attendSummary = record.WorkingDays ? `${record.PresentDays}/${record.WorkingDays} Days` : 'N/A';
        
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                            ${record.FirstName[0]}${record.LastName[0]}
                        </div>
                        <div>
                            <div class="font-bold text-gray-900">${record.FirstName} ${record.LastName}</div>
                            <div class="text-[10px] text-gray-500 uppercase tracking-tighter">${record.EmployeeCode} • ${record.DepartmentName || 'No Dept'}</div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm font-medium text-gray-700">${monthYear}</div>
                    <div class="text-[10px] text-gray-400">Paid on: ${formatDateShort(record.PayDate)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <div class="text-sm font-bold text-gray-700">${attendSummary}</div>
                    <div class="text-[10px] text-red-400">${record.AbsentDays || 0} Absences</div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm font-bold text-green-600">$${parseFloat(record.NetSalary).toFixed(2)}</div>
                </td>
                <td class="px-4 py-3">
                    <div class="text-sm font-medium text-gray-600">$${parseFloat(record.CTC).toFixed(2)}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="badge ${statusClass}">${record.Status}</span>
                </td>
                <td class="px-4 py-3">
                    <div class="flex gap-1 justify-end">
                        <button class="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all" onclick="viewPayrollDetails(${record.PayrollId})" title="View Details">👁️</button>
                        ${canManage ? `
                            <button class="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all" onclick="openStatusModal(${record.PayrollId}, '${record.Status}')" title="Update Status">⚙️</button>
                            <button class="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all" onclick="deletePayroll(${record.PayrollId})" title="Delete">🗑️</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Utility: Formatters
 */
function formatMonthYear(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function formatDateShort(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function getStatusBadgeClass(status) {
    switch (status?.toLowerCase()) {
        case 'paid': return 'badge-success';
        case 'approved': return 'badge-info';
        case 'pending': return 'badge-warning';
        case 'cancelled': return 'badge-danger';
        case 'draft': return 'badge-secondary';
        default: return 'badge-secondary';
    }
}

/**
 * Modal: Details Viewer
 */
async function viewPayrollDetails(payrollId) {
    try {
        if (window.utils) utils.showLoading(true);
        const response = await endpoints.payroll.getById(payrollId);
        const payroll = response.data;

        if (!payroll) throw new Error('Payroll record not found');

        // Create detail modal
        let modal = document.getElementById('viewPayrollModal');
        if (!modal) {
            modal = createDetailModal();
            document.body.appendChild(modal);
        }

        renderPayrollDetails(payroll);
        modal.classList.add('active');
    } catch (error) {
        console.error('Error viewing details:', error);
        utils.showAlert('Failed to load details: ' + error.message, 'error');
    } finally {
        if (window.utils) utils.showLoading(false);
    }
}

function renderPayrollDetails(p) {
    const content = document.getElementById('payrollDetailContent');
    if (!content) return;

    const earnings = p.details.filter(d => d.ComponentType === 'Earning');
    const deductions = p.details.filter(d => d.ComponentType === 'Deduction');

    content.innerHTML = `
        <div class="mb-6 pb-6 border-b border-gray-100 flex justify-between items-start">
            <div>
                <h4 class="text-xl font-bold text-gray-900">${p.FirstName} ${p.LastName}</h4>
                <p class="text-sm text-gray-500 uppercase tracking-widest font-medium">${p.EmployeeCode} • ${p.DepartmentName} • ${p.DesignationName}</p>
            </div>
            <div class="text-right">
                <div class="text-xs text-gray-400 uppercase font-bold">Pay Period</div>
                <div class="text-lg font-bold text-orange-600">${formatMonthYear(p.PayPeriodStart)}</div>
            </div>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-8">
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Attendance</div>
                <div class="text-sm font-bold text-gray-800">${p.PresentDays} / ${p.WorkingDays} Days</div>
                <div class="text-[10px] text-gray-500">Leaves: ${p.LeaveDays} • Absences: ${p.AbsentDays}</div>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</div>
                <div class="text-sm font-bold"><span class="badge ${getStatusBadgeClass(p.Status)}">${p.Status}</span></div>
                <div class="text-[10px] text-gray-500">Method: ${p.PaymentMethod || 'Not set'}</div>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div class="text-[10px] text-gray-400 uppercase font-bold mb-1">Total CTC</div>
                <div class="text-sm font-bold text-gray-800">$${parseFloat(p.CTC).toFixed(2)}</div>
                <div class="text-[10px] text-gray-500">Base: $${parseFloat(p.BaseSalary).toFixed(2)}</div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-8 mb-6">
            <!-- Earnings -->
            <div>
                <h5 class="text-sm font-bold text-gray-700 mb-3 flex justify-between">
                    <span>Earnings</span>
                    <span class="text-green-600">$${parseFloat(p.TotalEarnings).toFixed(2)}</span>
                </h5>
                <div class="space-y-2">
                    ${earnings.map(e => `
                        <div class="flex justify-between text-sm py-1 border-b border-gray-50">
                            <span class="text-gray-500">${e.ComponentName}</span>
                            <span class="font-medium text-gray-800">$${parseFloat(e.Amount).toFixed(2)}</span>
                        </div>
                    `).join('') || '<div class="text-xs text-gray-400 italic">No earnings found</div>'}
                </div>
            </div>
            <!-- Deductions -->
            <div>
                <h5 class="text-sm font-bold text-gray-700 mb-3 flex justify-between">
                    <span>Deductions</span>
                    <span class="text-red-600">-$${parseFloat(p.TotalDeductions).toFixed(2)}</span>
                </h5>
                <div class="space-y-2">
                    ${deductions.map(d => `
                        <div class="flex justify-between text-sm py-1 border-b border-gray-50">
                            <span class="text-gray-500">${d.ComponentName}</span>
                            <span class="font-medium text-gray-800">$${parseFloat(d.Amount).toFixed(2)}</span>
                        </div>
                    `).join('') || '<div class="text-xs text-gray-400 italic">No deductions found</div>'}
                </div>
            </div>
        </div>

        <div class="mt-8 p-4 bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-200 flex justify-between items-center">
            <div>
                <div class="text-xs uppercase font-bold opacity-80">Net Payable Amount</div>
                <div class="text-2xl font-black">$${parseFloat(p.NetSalary).toFixed(2)}</div>
            </div>
            <div class="text-right">
                <div class="text-[10px] opacity-70">Payment REF: ${p.PaymentReference || 'PENDING'}</div>
                <div class="text-[10px] opacity-70">Approved By: ${p.ApprovedBy || 'PENDING'}</div>
            </div>
        </div>

        ${p.Notes ? `
            <div class="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 italic">
                <strong>Notes:</strong> ${p.Notes}
            </div>
        ` : ''}
    `;
}

function createDetailModal() {
    const modal = document.createElement('div');
    modal.id = 'viewPayrollModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3 class="modal-title">Payroll Details</h3>
                <button class="modal-close" onclick="closeDetailModal()">&times;</button>
            </div>
            <div class="modal-body" id="payrollDetailContent">
                <!-- Content injected here -->
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeDetailModal()">Close</button>
                <button class="btn btn-primary" onclick="window.print()">🖨️ Print Payslip</button>
            </div>
        </div>
    `;
    return modal;
}

function closeDetailModal() {
    const modal = document.getElementById('viewPayrollModal');
    if (modal) modal.classList.remove('active');
}

/**
 * Other Modal Logics (Generate, Status, etc. - From previous implementation)
 */
function openGenerateModal() {
    let modal = document.getElementById('generatePayrollModal');
    if (!modal) {
        modal = createGenerateModal();
        document.body.appendChild(modal);
    }
    populateGenerateModalDropdowns();
    toggleGenerateMode('single');
    modal.classList.add('active');
}

function populateGenerateModalDropdowns() {
    const empSelect = document.getElementById('genEmployeeId');
    if (empSelect) {
        empSelect.innerHTML = '<option value="">-- Select Employee --</option>' +
            employees.map(emp => `<option value="${emp.EmployeeId}">${emp.FirstName} ${emp.LastName} (${emp.EmployeeCode})</option>`).join('');
    }

    const deptSelect = document.getElementById('genDepartmentId');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">-- All Departments --</option>' +
            departments.map(dept => `<option value="${dept.DepartmentId}">${dept.DepartmentName}</option>`).join('');
    }
}

function closeGenerateModal() {
    const modal = document.getElementById('generatePayrollModal');
    if (modal) modal.classList.remove('active');
}

function openStatusModal(payrollId, currentStatus) {
    let modal = document.getElementById('updateStatusModal');
    if (!modal) {
        modal = createStatusModal();
        document.body.appendChild(modal);
    }
    document.getElementById('statusPayrollId').value = payrollId;
    document.getElementById('newStatus').value = currentStatus;
    document.getElementById('paymentRef').value = '';
    modal.classList.add('active');
}

function closeStatusModal() {
    const modal = document.getElementById('updateStatusModal');
    if (modal) modal.classList.remove('active');
}

async function handleUpdateStatus() {
    const payrollId = document.getElementById('statusPayrollId').value;
    const status = document.getElementById('newStatus').value;
    const paymentReference = document.getElementById('paymentRef').value;
    if (!payrollId || !status) return;

    try {
        if (window.utils) utils.showLoading(true);
        const payload = { status, paymentReference, approvedBy: auth.user ? `${auth.user.firstName} ${auth.user.lastName}` : 'System' };
        const response = await endpoints.payroll.updateStatus(payrollId, payload);
        if (response.success) {
            utils.showAlert('Status updated successfully!', 'success');
            closeStatusModal();
            loadPayrollRecords();
        }
    } catch (error) {
        utils.showAlert('Error: ' + error.message, 'error');
    } finally {
        if (window.utils) utils.showLoading(false);
    }
}

function toggleGenerateMode(mode) {
    const singleSection = document.getElementById('genSingleSection');
    const bulkSection = document.getElementById('genBulkSection');
    const btnSingle = document.getElementById('btnModeSingle');
    const btnBulk = document.getElementById('btnModeBulk');

    if (mode === 'single') {
        singleSection.style.display = 'block';
        bulkSection.style.display = 'none';
        btnSingle.classList.add('btn-primary');
        btnSingle.classList.remove('btn-outline');
        btnBulk.classList.add('btn-outline');
        window.currentGenMode = 'single';
    } else {
        singleSection.style.display = 'none';
        bulkSection.style.display = 'block';
        btnBulk.classList.add('btn-primary');
        btnBulk.classList.remove('btn-outline');
        btnSingle.classList.add('btn-outline');
        window.currentGenMode = 'bulk';
    }
}

async function handleGeneratePayroll() {
    const mode = window.currentGenMode || 'single';
    const payPeriodStart = document.getElementById('genPeriodStart').value;
    const payPeriodEnd = document.getElementById('genPeriodEnd').value;
    const payDate = document.getElementById('genPayDate').value;
    const useAttendance = document.getElementById('genUseAttendance').checked;
    const includeExpenses = document.getElementById('genIncludeExpenses').checked;
    const addSewerage = document.getElementById('genAddSewerage').checked;

    if (!payPeriodStart || !payPeriodEnd || !payDate) {
        utils.showAlert('Fill date fields', 'warning');
        return;
    }

    try {
        if (window.utils) utils.showLoading(true);
        let response;
        if (mode === 'single') {
            const employeeId = document.getElementById('genEmployeeId').value;
            if (!employeeId) throw new Error('Select employee');
            response = await endpoints.payroll.generate({
                employeeId: parseInt(employeeId), payPeriodStart, payPeriodEnd, payDate,
                useAttendance, includeExpenseClaims: includeExpenses, addSewerageToSalary: addSewerage
            });
        } else {
            const deptId = document.getElementById('genDepartmentId').value;
            response = await endpoints.payroll.generateBulk({
                employeeIds: employees.filter(e => !deptId || e.DepartmentId == deptId).map(e => e.EmployeeId),
                departmentId: deptId ? parseInt(deptId) : null, payPeriodStart, payPeriodEnd, payDate,
                useAttendance, includeExpenseClaims: includeExpenses, addSewerageToSalary: addSewerage
            });
        }
        if (response.success) {
            utils.showAlert('Generated!', 'success');
            closeGenerateModal();
            loadPayrollRecords();
        }
    } catch (error) {
        utils.showAlert('Error: ' + error.message, 'error');
    } finally {
        if (window.utils) utils.showLoading(false);
    }
}

async function deletePayroll(payrollId) {
    if (!confirm('Confirm delete?')) return;
    try {
        if (window.utils) utils.showLoading(true);
        const response = await endpoints.payroll.delete(payrollId);
        if (response.success) {
            utils.showAlert('Deleted', 'success');
            loadPayrollRecords();
        }
    } catch (error) {
        utils.showAlert('Error: ' + error.message, 'error');
    } finally {
        if (window.utils) utils.showLoading(false);
    }
}

function createGenerateModal() {
    const modal = document.createElement('div');
    modal.id = 'generatePayrollModal';
    modal.className = 'modal';
    const day1 = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const dayL = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header"><h3 class="modal-title">Generate Payroll</h3><button class="modal-close" onclick="closeGenerateModal()">&times;</button></div>
            <div class="modal-body">
                <div class="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
                    <button id="btnModeSingle" class="flex-1 py-1 rounded shadow-sm transition-all" onclick="toggleGenerateMode('single')">Single</button>
                    <button id="btnModeBulk" class="flex-1 py-1 rounded transition-all" onclick="toggleGenerateMode('bulk')">Bulk</button>
                </div>
                <div id="genSingleSection" class="mb-4"><label class="text-xs font-bold uppercase text-gray-500 mb-1 block">Employee</label><select id="genEmployeeId" class="form-control"></select></div>
                <div id="genBulkSection" class="mb-4" style="display:none;"><label class="text-xs font-bold uppercase text-gray-500 mb-1 block">Department</label><select id="genDepartmentId" class="form-control"></select></div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div><label class="text-xs font-bold uppercase text-gray-500 mb-1 block">Start</label><input type="date" id="genPeriodStart" class="form-control" value="${day1}"></div>
                    <div><label class="text-xs font-bold uppercase text-gray-500 mb-1 block">End</label><input type="date" id="genPeriodEnd" class="form-control" value="${dayL}"></div>
                </div>
                <div class="mb-4"><label class="text-xs font-bold uppercase text-gray-500 mb-1 block">Pay Date</label><input type="date" id="genPayDate" class="form-control" value="${dayL}"></div>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                    <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="genUseAttendance" checked> <span class="text-sm">Attendance</span></label>
                    <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="genIncludeExpenses"> <span class="text-sm">Expenses</span></label>
                    <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="genAddSewerage"> <span class="text-sm">Sewerage</span></label>
                </div>
            </div>
            <div class="modal-footer"><button class="btn btn-outline" onclick="closeGenerateModal()">Cancel</button><button class="btn btn-primary" onclick="handleGeneratePayroll()">Generate</button></div>
        </div>
    `;
    return modal;
}

function createStatusModal() {
    const modal = document.createElement('div');
    modal.id = 'updateStatusModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header"><h3 class="modal-title">Status</h3><button class="modal-close" onclick="closeStatusModal()">&times;</button></div>
            <div class="modal-body">
                <input type="hidden" id="statusPayrollId">
                <div class="mb-4"><label class="text-xs font-bold uppercase text-gray-500 mb-1 block">New Status</label><select id="newStatus" class="form-control"><option>Draft</option><option>Approved</option><option>Paid</option><option>Cancelled</option></select></div>
                <div class="mb-4"><label class="text-xs font-bold uppercase text-gray-500 mb-1 block">Reference</label><input type="text" id="paymentRef" class="form-control" placeholder="TXN-ID"></div>
            </div>
            <div class="modal-footer"><button class="btn btn-outline" onclick="closeStatusModal()">Cancel</button><button class="btn btn-primary" onclick="handleUpdateStatus()">Update</button></div>
        </div>
    `;
    return modal;
}

// Global exposure
window.openGenerateModal = openGenerateModal;
window.closeGenerateModal = closeGenerateModal;
window.openStatusModal = openStatusModal;
window.closeStatusModal = closeStatusModal;
window.handleUpdateStatus = handleUpdateStatus;
window.toggleGenerateMode = toggleGenerateMode;
window.handleGeneratePayroll = handleGeneratePayroll;
window.viewPayrollDetails = viewPayrollDetails;
window.closeDetailModal = closeDetailModal;
window.deletePayroll = deletePayroll;
window.loadPayrollRecords = loadPayrollRecords;

// Initialize
document.addEventListener('DOMContentLoaded', initPayroll);
