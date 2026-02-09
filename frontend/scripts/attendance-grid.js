// =============================================
// Attendance Grid JavaScript Module
// Calendar view for attendance management
// =============================================

auth.requireAuth();
auth.initAuth();

// Global State
let currentDate = new Date();
let employees = [];
let attendanceMap = {};
let holidays = [];
let activeFilter = 'all';
let selectedFile = null;
let currentView = 'grid'; // Default to grid view
const canManage = auth.hasRole('Admin', 'HR');

if (!canManage) {
    document.getElementById('addBtn').style.display = 'none';
}

// =============================================
// Status Configuration - Single Source of Truth
// =============================================
const STATUS_CONFIG = {
    'Present': { class: 'status-present', icon: '✓', color: '#28a745' },
    'Late': { class: 'status-late', icon: '⏰', color: '#ff9800' },
    'Half Day': { class: 'status-half-day', icon: '◐', color: '#2196f3' },
    'Absent': { class: 'status-absent', icon: '✗', color: '#dc3545' },
    'On Leave': { class: 'status-on-leave', icon: '🏖️', color: '#9c27b0' }
};

// =============================================
// Status Derivation Function
// =============================================
function deriveAttendanceStatus() {
    // Read status directly from dropdown
    const statusDropdown = document.getElementById('attendanceStatus');
    return statusDropdown ? statusDropdown.value : 'Present';
}

// =============================================
// Initialization
// =============================================
async function init() {
    await loadEmployees();
    await loadAttendanceGrid();
}

// =============================================
// Load Employees for Dropdown
// =============================================
async function loadEmployees() {
    try {
        const response = await endpoints.employees.getAll();
        let allEmployees = response.data || [];
        
        // Filter employees based on role (for dropdown)
        const dataScope = window.roleManager.getDataScope();
        const currentEmployeeId = window.roleManager.getCurrentEmployeeId();
        
        if (dataScope === 'own' && currentEmployeeId) {
            // Employee role: show only themselves
            employees = allEmployees.filter(emp => emp.EmployeeId === currentEmployeeId);
        } else if (dataScope === 'team' && currentEmployeeId) {
            // Manager role: show their team
            employees = allEmployees.filter(emp => 
                emp.ReportingTo === currentEmployeeId || emp.EmployeeId === currentEmployeeId
            );
        } else {
            // Admin/HR role: show all
            employees = allEmployees;
        }
        
        // Populate employee dropdown
        const select = document.getElementById('employeeId');
        select.innerHTML = '<option value="">Nothing selected</option>' + 
            employees.map(e => 
                `<option value="${e.EmployeeId}">${e.FirstName} ${e.LastName} (${e.EmployeeCode})</option>`
            ).join('');
        
        // Load and populate departments
        await loadDepartments();
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// =============================================
// Load Departments for Dropdown
// =============================================
async function loadDepartments() {
    try {
        const response = await endpoints.departments.getAll();
        const departments = response.data || [];
        
        const select = document.getElementById('departmentId');
        select.innerHTML = '<option value="">--</option>' + 
            departments.map(d => 
                `<option value="${d.DepartmentId}">${d.DepartmentName}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// =============================================
// Filter Employees by Department
// =============================================
function filterEmployeesByDepartment() {
    const departmentId = document.getElementById('departmentId').value;
    const employeeSelect = document.getElementById('employeeId');
    
    if (!departmentId) {
        // Show all employees
        employeeSelect.innerHTML = '<option value="">Nothing selected</option>' + 
            employees.map(e => 
                `<option value="${e.EmployeeId}">${e.FirstName} ${e.LastName} (${e.EmployeeCode})</option>`
            ).join('');
    } else {
        // Filter by department
        const filteredEmployees = employees.filter(e => e.DepartmentId == departmentId);
        employeeSelect.innerHTML = '<option value="">Nothing selected</option>' + 
            filteredEmployees.map(e => 
                `<option value="${e.EmployeeId}">${e.FirstName} ${e.LastName} (${e.EmployeeCode})</option>`
            ).join('');
    }
}

// =============================================
// Toggle Date Fields (Month vs Date)
// =============================================
function toggleDateFields() {
    const attendanceBy = document.querySelector('input[name="attendanceBy"]:checked').value;
    const monthFields = document.getElementById('monthFields');
    const dateField = document.getElementById('dateField');
    
    if (attendanceBy === 'month') {
        monthFields.style.display = 'grid';
        dateField.style.display = 'none';
        // Set current month and year
        const now = new Date();
        document.getElementById('attendanceYear').value = now.getFullYear();
        document.getElementById('attendanceMonth').value = now.getMonth() + 1;
    } else {
        monthFields.style.display = 'none';
        dateField.style.display = 'block';
        // Set current date
        document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
    }
}


// =============================================
// Load Attendance Grid Data
// =============================================
async function loadAttendanceGrid() {
    try {
        showLoadingGrid(true);
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Calculate fromDate and toDate for the month
        const fromDate = new Date(year, month, 1).toISOString().split('T')[0];
        const toDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        
        const params = { fromDate, toDate };
        const response = await endpoints.attendance.getGrid(params);
        
        if (response.data) {
            // Backend returns attendanceMap directly, not an attendance array
            attendanceMap = response.data.attendanceMap || {};
            let allEmployees = response.data.employees || [];
            holidays = response.data.holidays || [];
            
            // Filter employees based on role
            const dataScope = window.roleManager.getDataScope();
            const currentEmployeeId = window.roleManager.getCurrentEmployeeId();
            
            if (dataScope === 'own' && currentEmployeeId) {
                // Employee role: show only their own data
                employees = allEmployees.filter(emp => emp.EmployeeId == currentEmployeeId);
                console.log(`📊 Attendance filtered to own data: ${employees.length} employee(s)`);
            } else if (dataScope === 'team' && currentEmployeeId) {
                // Manager role: show their team (employees reporting to them)
                employees = allEmployees.filter(emp => 
                    emp.ReportingTo == currentEmployeeId || emp.EmployeeId == currentEmployeeId
                );
                console.log(`📊 Attendance filtered to team data: ${employees.length} employee(s)`);
            } else {
                // Admin/HR role: show all data
                employees = allEmployees;
                console.log(`📊 Attendance showing all data: ${employees.length} employee(s)`);
            }
            
            // Render current view
            if (currentView === 'grid') {
                renderGrid();
            } else {
                renderListView();
            }
        }
        
        showLoadingGrid(false);
    } catch (error) {
        console.error('Error loading attendance grid:', error);
        showLoadingGrid(false);
        utils.showAlert('Error loading attendance grid: ' + error.message, 'error');
    }
}

// Listen for role changes and reload attendance data
window.addEventListener('roleChanged', (event) => {
    console.log(`🔄 Role changed, reloading attendance data...`);
    loadAttendanceGrid();
});

// =============================================
// Get Month Date Range
// =============================================
function getMonthDateRange() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const fromDateObj = new Date(year, month, 1);
    const toDateObj = new Date(year, month + 1, 0);

    const fromDate =
        `${fromDateObj.getFullYear()}-${String(fromDateObj.getMonth() + 1).padStart(2, '0')}-${String(fromDateObj.getDate()).padStart(2, '0')}`;

    const toDate =
        `${toDateObj.getFullYear()}-${String(toDateObj.getMonth() + 1).padStart(2, '0')}-${String(toDateObj.getDate()).padStart(2, '0')}`;

    return { fromDate, toDate };
}

// =============================================
// Render Grid
// =============================================
function renderGrid() {
    updateMonthTitle();
    renderGridHeader();   // 👈 Date columns
    renderGridBody();     // 👈 Employee rows
    document.getElementById('attendanceGrid').style.display = 'table';
}


// =============================================
// Update Month Title
// =============================================
function updateMonthTitle() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthTitle = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    document.getElementById('monthTitle').textContent = monthTitle;
}

// =============================================
// Render Grid Header (Dates)
// =============================================
function renderGridHeader() {
    const { fromDate, toDate } = getMonthDateRange();
    const dates = generateDateArray(fromDate, toDate);
    const today = new Date().toISOString().split('T')[0];
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const headerHTML = `
        <tr>
            <th class="employee-col">Employee</th>
            ${dates.map(date => {
                const d = new Date(date + "T00:00:00");
                const dayNum = d.getDate();
                const dayName = dayNames[d.getDay()];
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = date === today;
                const isHoliday = holidays.some(h => h.HolidayDate.split('T')[0] === date);
                
                let classes = 'date-col';
                if (isWeekend) classes += ' weekend';
                if (isToday) classes += ' today';
                if (isHoliday) classes += ' holiday';
                
                return `<th class="${classes}" data-date="${date}" title="${isHoliday ? getHolidayName(date) : ''}">
                    ${dayNum}<br>${dayName}
                </th>`;
            }).join('')}
            <th>Total</th>
        </tr>
    `;
    
    document.getElementById('gridHeader').innerHTML = headerHTML;
}

// =============================================
// Render Grid Body (Employees & Attendance)
// =============================================
function renderGridBody() {
    const { fromDate, toDate } = getMonthDateRange();
    const dates = generateDateArray(fromDate, toDate);
    const totalDays = dates.length; // Total days in the month
    
    if (employees.length === 0) {
        document.getElementById('gridBody').innerHTML = `
            <tr><td colspan="${dates.length + 2}" class="grid-empty">
                <div class="empty-icon">📭</div>
                <div>No employees found</div>
            </td></tr>
        `;
        return;
    }
    
    const bodyHTML = employees.map(emp => {
        const avatar = emp.ProfilePicture 
            ? `<img src="${emp.ProfilePicture}" alt="${emp.FirstName}" class="employee-avatar">` 
            : `<div class="employee-avatar">${emp.FirstName.charAt(0)}</div>`;
        
        let presentCount = 0;
        
        const cells = dates.map(date => {
            const key = `${emp.EmployeeId}_${date}`;
            const attendance = attendanceMap[key];
            const d = new Date(date + "T00:00:00");
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isHoliday = holidays.some(h => h.HolidayDate.split('T')[0] === date);
            
            let cellClass = 'attendance-cell';
            let icon = '';
            let status = '';
            let shouldShow = true;
            
            if (isHoliday) {
                cellClass += ' holiday';
                icon = '🎉';
                status = 'holiday';
                shouldShow = activeFilter === 'all' || activeFilter === 'holiday';
            } else if (isWeekend) {
                cellClass += ' weekend';
                // Only show weekend icon on Sunday (day 0), not Saturday (day 6)
                icon = d.getDay() === 0 ? '📅' : '-';
                status = 'day-off';
                shouldShow = activeFilter === 'all';
            } else if (attendance) {
                status = attendance.status.toLowerCase().replace(' ', '-');
                cellClass += ` has-status`;
                shouldShow = activeFilter === 'all' || attendance.status === activeFilter;
                
                // Use STATUS_CONFIG for consistent rendering
                const config = STATUS_CONFIG[attendance.status];
                if (config) {
                    icon = `<span class="status-icon ${config.class}">${config.icon}</span>`;
                    
                    // Count present days for total
                    if (attendance.status === 'Present' || attendance.status === 'Late') {
                        presentCount++;
                    } else if (attendance.status === 'Half Day') {
                        presentCount += 0.5;
                    }
                } else {
                    icon = '-';
                }
            } else {
                icon = '-';
                shouldShow = activeFilter === 'all';
            }
            
            // Add filtered-out class if not matching filter
            if (!shouldShow) {
                cellClass += ' filtered-out';
            }
            
            const title = attendance 
                ? `${attendance.status}${attendance.checkInTime ? ' - In: ' + attendance.checkInTime : ''}${attendance.checkOutTime ? ' Out: ' + attendance.checkOutTime : ''}`
                : (isHoliday ? getHolidayName(date) : (isWeekend ? 'Weekend' : 'No record'));
            
            const attendanceJson = attendance ? JSON.stringify(attendance).replace(/"/g, '&quot;') : 'null';
            
            return `<td class="${cellClass}" data-date="${date}" data-employee="${emp.EmployeeId}" 
                        data-status="${status}" title="${title}" 
                        onclick="openCellModal(${emp.EmployeeId}, '${date}', ${attendanceJson})">
                ${icon}
            </td>`;
        }).join('');
        
        return `
            <tr>
                <td class="employee-cell">
                    <div class="employee-info">
                        ${avatar}
                        <div class="employee-details">
                            <div class="employee-name" style="cursor: pointer; color: var(--primary-color);" 
                                 onclick="event.stopPropagation(); window.utils.navigateToProfile(${emp.EmployeeId});" 
                                 title="View ${emp.FirstName} ${emp.LastName}'s profile">${emp.FirstName} ${emp.LastName}</div>
                            <div class="employee-code">${emp.EmployeeCode}</div>
                        </div>
                    </div>
                </td>
                ${cells}
                <td><span class="total-badge">${presentCount}/${totalDays}</span></td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('gridBody').innerHTML = bodyHTML;
}

// =============================================
// Render Horizontal Grid (Dates as Rows)
// =============================================
function renderHorizontalGrid() {
    const { fromDate, toDate } = getMonthDateRange();
    const dates = generateDateArray(fromDate, toDate);
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Header: Date column + Employee columns
    const headerHTML = `
        <tr>
            <th class="employee-col">Date</th>
            ${employees.map(emp => {
                const avatar = emp.ProfilePicture 
                    ? `<img src="${emp.ProfilePicture}" alt="${emp.FirstName}" class="employee-avatar" style="width: 32px; height: 32px; border-radius: 50%;">` 
                    : `<div class="employee-avatar" style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">${emp.FirstName.charAt(0)}</div>`;
                
                return `<th style="min-width: 80px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        ${avatar}
                        <div style="font-size: 0.75rem; font-weight: 500; cursor: pointer; color: var(--primary-color);" 
                             onclick="window.utils.navigateToProfile(${emp.EmployeeId})" 
                             title="View ${emp.FirstName} ${emp.LastName}'s profile">${emp.FirstName} ${emp.LastName}</div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary);">${emp.EmployeeCode}</div>
                    </div>
                </th>`;
            }).join('')}
        </tr>
    `;
    
    // Body: Each date as a row
    const bodyHTML = dates.map(date => {
        const d = new Date(date + "T00:00:00");
        const dayNum = d.getDate();
        const dayName = dayNames[d.getDay()];
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isToday = date === today;
        const isHoliday = holidays.some(h => h.HolidayDate.split('T')[0] === date);
        
        let dateClass = 'employee-cell';
        if (isWeekend) dateClass += ' weekend';
        if (isToday) dateClass += ' today';
        if (isHoliday) dateClass += ' holiday';
        
        const cells = employees.map(emp => {
            const key = `${emp.EmployeeId}_${date}`;
            const attendance = attendanceMap[key];
            
            let cellClass = 'attendance-cell';
            let icon = '';
            let status = '';
            
            if (isHoliday) {
                cellClass += ' holiday';
                icon = '🎉';
                status = 'holiday';
            } else if (isWeekend) {
                cellClass += ' weekend';
                // Only show weekend icon on Sunday (day 0), not Saturday (day 6)
                icon = d.getDay() === 0 ? '📅' : '-';
                status = 'day-off';
            } else if (attendance) {
                status = attendance.status.toLowerCase().replace(' ', '-');
                cellClass += ` has-status`;
                
                switch (attendance.status) {
                    case 'Present':
                        icon = '<span class="status-icon present">✓</span>';
                        break;
                    case 'Absent':
                        icon = '<span class="status-icon absent">✗</span>';
                        break;
                    case 'Half Day':
                        icon = '<span class="status-icon half-day">◐</span>';
                        break;
                    case 'Late':
                        icon = '<span class="status-icon late">⏰</span>';
                        break;
                    case 'On Leave':
                        icon = '<span class="status-icon on-leave">🏖️</span>';
                        break;
                }
            } else {
                icon = '-';
            }
            
            // Apply filter
            if (activeFilter !== 'all') {
                if (activeFilter === 'holiday' && !isHoliday) {
                    cellClass += ' filtered-out';
                } else if (activeFilter !== 'holiday' && (!attendance || attendance.status !== activeFilter)) {
                    cellClass += ' filtered-out';
                }
            }
            
            const title = attendance 
                ? `${attendance.status}${attendance.checkInTime ? ' - In: ' + attendance.checkInTime : ''}${attendance.checkOutTime ? ' Out: ' + attendance.checkOutTime : ''}`
                : (isHoliday ? getHolidayName(date) : (isWeekend ? 'Weekend' : 'No record'));
            
            const attendanceJson = attendance ? JSON.stringify(attendance).replace(/"/g, '&quot;') : 'null';
            
            return `<td class="${cellClass}" data-date="${date}" data-employee="${emp.EmployeeId}" 
                        data-status="${status}" title="${title}" 
                        onclick="openCellModal(${emp.EmployeeId}, '${date}', ${attendanceJson})">
                ${icon}
            </td>`;
        }).join('');
        
        return `
            <tr>
                <td class="${dateClass}">
                    <div style="font-weight: 600;">${dayNum} ${dayName}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${date}</div>
                    ${isHoliday ? `<div style="font-size: 0.7rem; color: var(--primary-color);">${getHolidayName(date)}</div>` : ''}
                </td>
                ${cells}
            </tr>
        `;
    }).join('');
    
    document.getElementById('gridHeader').innerHTML = headerHTML;
    document.getElementById('gridBody').innerHTML = bodyHTML;
}

// =============================================
// Generate Date Array
// =============================================
function generateDateArray(fromDate, toDate) {
    const dates = [];

    const start = new Date(fromDate + "T00:00:00");
    const end = new Date(toDate + "T00:00:00");

    let current = new Date(start);

    while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');

        dates.push(`${year}-${month}-${day}`);

        current.setDate(current.getDate() + 1);
    }

    return dates;
}


// =============================================
// Get Holiday Name
// =============================================
function getHolidayName(date) {
    const holiday = holidays.find(h => h.HolidayDate.split('T')[0] === date);
    return holiday ? holiday.HolidayName : '';
}

// =============================================
// Navigate Month
// =============================================
function navigateMonth(offset) {
    if (offset === 0) {
        currentDate = new Date();
    } else {
        currentDate.setMonth(currentDate.getMonth() + offset);
    }
    loadAttendanceGrid();
}

// =============================================
// Apply Filter
// =============================================
function applyFilter(status) {
    activeFilter = status;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Re-render current view with filter
    if (currentView === 'grid') {
        renderGridBody();
    } else {
        renderListView();
    }
}

// =============================================
// Open Cell Modal (Quick Mark)
// =============================================
function openCellModal(employeeId, date, attendance) {
    if (!canManage) return;
    
    try {
        document.getElementById('modalTitle').textContent = 'Mark Attendance';
        document.getElementById('attendanceForm').reset();
        document.getElementById('attendanceId').value = '';
        document.getElementById('employeeId').value = employeeId;
        document.getElementById('attendanceDate').value = date;
        
        // Default times
        document.getElementById('checkInTime').value = '08:00';
        document.getElementById('checkOutTime').value = '18:00';
        
        if (attendance) {
            document.getElementById('attendanceId').value = attendance.attendanceId || ''; 
            
            // Set status dropdown based on attendance status
            const statusDropdown = document.getElementById('attendanceStatus');
            if (statusDropdown && attendance.status) {
                statusDropdown.value = attendance.status;
            }
            
            document.getElementById('checkInTime').value = formatTimeLocal(attendance.checkInTime) || '08:00';
            document.getElementById('checkOutTime').value = formatTimeLocal(attendance.checkOutTime) || '18:00';
            
            if (attendance.checkInLocation) document.getElementById('checkInLocation').value = attendance.checkInLocation;
            if (attendance.checkOutLocation) document.getElementById('checkOutLocation').value = attendance.checkOutLocation;
            if (attendance.workingFrom) document.getElementById('workingFrom').value = attendance.workingFrom;
            if (attendance.workingFromOut) document.getElementById('workingFromOut').value = attendance.workingFromOut;
            
            document.getElementById('attendanceOverwrite').checked = true; 
        }
        
        document.getElementById('attendanceModal').classList.add('active');
    } catch (e) {
        console.error('Error opening cell modal:', e);
        utils.showAlert('Error opening modal: ' + e.message, 'error');
    }
}

// Helper to format time (HH:mm:ss -> HH:mm) because input type="time" needs HH:mm
function formatTimeLocal(timeStr) {
    if (!timeStr) return '';
    if (typeof timeStr === 'string') {
        return timeStr.substring(0, 5);
    }
    return '';
}

// =============================================
// Open Mark Attendance Modal
// =============================================
function openMarkAttendanceModal() {
    try {
        document.getElementById('modalTitle').textContent = 'Mark Attendance';
        document.getElementById('attendanceForm').reset();
        document.getElementById('attendanceId').value = '';
        
        // Initialize date fields
        const now = new Date();
        document.getElementById('attendanceYear').value = now.getFullYear();
        document.getElementById('attendanceMonth').value = now.getMonth() + 1;
        document.getElementById('attendanceDate').value = now.toISOString().split('T')[0];
        
        // Set default times
        document.getElementById('checkInTime').value = '08:00';
        document.getElementById('checkOutTime').value = '18:00';
        
        // Initialize month/date toggle
        if (typeof toggleDateFields === 'function') {
            toggleDateFields();
        } else {
            console.warn('toggleDateFields function not found');
        }
        
        document.getElementById('attendanceModal').classList.add('active');
    } catch (e) {
        console.error('Error opening mark attendance modal:', e);
        utils.showAlert('Error opening modal: ' + e.message, 'error');
    }
}

// =============================================
// Save Attendance
// =============================================
async function saveAttendance() {
    const form = document.getElementById('attendanceForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const employeeId = parseInt(document.getElementById('employeeId').value);
    const attendanceBy = document.querySelector('input[name="attendanceBy"]:checked').value;
    
    // Determine the date or date range
    let attendanceDate;
    if (attendanceBy === 'date') {
        attendanceDate = document.getElementById('attendanceDate').value;
    } else {
        // For month selection, we'll use the first day of the month
        const year = document.getElementById('attendanceYear').value;
        const month = document.getElementById('attendanceMonth').value;
        attendanceDate = `${year}-${month.padStart(2, '0')}-01`;
    }
    
    // Derive status from radio buttons - Single Source of Truth
    const status = deriveAttendanceStatus();
    const checkInTime = document.getElementById('checkInTime').value;
    const checkOutTime = document.getElementById('checkOutTime').value;
    
    // Validation: Present/Late require CheckOutTime
    if ((status === 'Present' || status === 'Late') && !checkOutTime) {
        utils.showAlert('Check Out time is required for Present/Late status', 'error');
        return;
    }

    const data = {
        employeeId: employeeId,
        attendanceDate: attendanceDate,
        status: status, // Derived status - will be stored in DB
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        checkInLocation: document.getElementById('checkInLocation').value || null,
        checkOutLocation: document.getElementById('checkOutLocation').value || null,
        workingFrom: document.getElementById('workingFrom').value || null,
        workingFromOut: document.getElementById('workingFromOut').value || null,
        overwrite: document.getElementById('attendanceOverwrite').checked,
        remarks: null
    };

    console.log('=== ATTENDANCE DATA ===');
    console.log('Status:', status);
    console.log('EmployeeId:', employeeId);
    console.log('Date:', attendanceDate);
    console.log('CheckIn:', checkInTime);
    console.log('CheckOut:', checkOutTime);
    console.log('Full Data:', JSON.stringify(data, null, 2));
    console.log('======================');

    try {
        await endpoints.attendance.create(data);
        utils.showAlert('Attendance marked successfully', 'success');
        closeModal();
        loadAttendanceGrid();
    } catch (error) {
        console.error('Error saving attendance:', error);
        const errorMessage = error.message || 'Failed to save attendance';
        utils.showAlert(errorMessage, 'error');
    }
}

// =============================================
// Close Modal
// =============================================
function closeModal() {
    document.getElementById('attendanceModal').classList.remove('active');
}

// =============================================
// Export Attendance
// =============================================
async function exportAttendance() {
    try {
        const { fromDate, toDate } = getMonthDateRange();
        const url = `http://localhost:5000/api/attendance/export?fromDate=${fromDate}&toDate=${toDate}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${auth.getToken()}` }
        });
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `attendance_${fromDate}_to_${toDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        utils.showAlert('Attendance exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting attendance:', error);
        utils.showAlert('Failed to export attendance', 'error');
    }
}

// =============================================
// Import Modal Functions
// =============================================
function openImportModal() {
    document.getElementById('importModal').classList.add('active');
    selectedFile = null;
    document.getElementById('csvFile').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('importBtn').disabled = true;
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        utils.showAlert('Please select a CSV file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        utils.showAlert('File size must be less than 5MB', 'error');
        return;
    }
    
    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').style.display = 'flex';
    document.getElementById('importBtn').disabled = false;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// =============================================
// Process Import
// =============================================
async function processImport() {
    if (!selectedFile) return;
    
    try {
        const text = await selectedFile.text();
        const attendanceData = parseCSV(text);
        
        if (attendanceData.length === 0) {
            utils.showAlert('No valid data found in CSV', 'error');
            return;
        }
        
        const response = await fetch(`http://localhost:5000/api/attendance/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getToken()}`
            },
            body: JSON.stringify({ attendanceData })
        });
        
        const result = await response.json();
        
        if (result.success) {
            utils.showAlert(`Successfully imported ${result.data.InsertedCount} records`, 'success');
            closeImportModal();
            loadAttendanceGrid();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error importing attendance:', error);
        utils.showAlert(error.message || 'Failed to import attendance', 'error');
    }
}

// =============================================
// Parse CSV
// =============================================
function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        // Find employee by code
        const employeeCode = values[0];
        const employee = employees.find(e => e.EmployeeCode === employeeCode);
        
        if (employee) {
            data.push({
                employeeId: employee.EmployeeId,
                attendanceDate: values[1],
                status: values[2],
                checkInTime: values[3] || null,
                checkOutTime: values[4] || null,
                remarks: values[5] || null
            });
        }
    }
    
    return data;
}

// =============================================
// Download Sample CSV
// =============================================
function downloadSampleCSV() {
    const csv = `EmployeeCode,Date,Status,CheckInTime,CheckOutTime,Remarks
EMP2026001,2026-01-22,Present,09:00,17:30,
EMP2026002,2026-01-22,Late,09:30,17:30,Traffic delay
EMP2026003,2026-01-22,Absent,,,Sick leave`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_sample.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// =============================================
// Show/Hide Loading
// =============================================
function showLoadingGrid(show) {
    if (currentView === 'grid') {
        document.getElementById('gridLoading').style.display = show ? 'block' : 'none';
        document.getElementById('attendanceGrid').style.display = show ? 'none' : 'table';
    } else {
        document.getElementById('listLoading').style.display = show ? 'block' : 'none';
        document.getElementById('attendanceListTable').style.display = show ? 'none' : 'table';
    }
}

// =============================================
// Drag and Drop for File Upload
// =============================================
const uploadArea = document.getElementById('uploadArea');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        document.getElementById('csvFile').files = files;
        handleFileSelect({ target: { files } });
    }
});

// Initialize on page load
init();

// =============================================
// View Switching
// =============================================
function switchView(view) {
    currentView = view;

    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');

    document.getElementById('gridViewContainer').style.display = view === 'grid' ? 'block' : 'none';
    document.getElementById('listViewContainer').style.display = view === 'list' ? 'block' : 'none';

    if (view === 'grid') {
        renderGrid();   // 👈 vertical grid
    } else {
        renderListView();
    }
}

// =============================================
// Render List View
// =============================================
function renderListView() {
    const listBody = document.getElementById('listBody');
    const listTable = document.getElementById('attendanceListTable');
    const listLoading = document.getElementById('listLoading');
    
    // Show loading
    listLoading.style.display = 'block';
    listTable.style.display = 'none';
    
    // Flatten attendance data into list format
    const attendanceList = [];
    
    Object.keys(attendanceMap).forEach(key => {
        const attendance = attendanceMap[key];
        const [employeeId, date] = key.split('_');
        const employee = employees.find(e => e.EmployeeId == employeeId);
        
        if (employee) {
            attendanceList.push({
                ...attendance,
                employeeName: `${employee.FirstName} ${employee.LastName}`,
                employeeCode: employee.EmployeeCode,
                employeeId: employeeId,
                date: date
            });
        }
    });
    
    // Sort by date descending
    attendanceList.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply filter
    const filteredList = attendanceList.filter(att => {
        if (activeFilter === 'all') return true;
        return att.status === activeFilter;
    });
    
    // Render rows
    if (filteredList.length === 0) {
        listBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                    <div>No attendance records found</div>
                </td>
            </tr>
        `;
    } else {
        listBody.innerHTML = filteredList.map(att => {
            const statusClass = att.status.toLowerCase().replace(' ', '-');
            const statusIcons = {
                'Present': '✓',
                'Absent': '✗',
                'Half Day': '◐',
                'Late': '⏰',
                'On Leave': '🏖️'
            };
            
            const attJson = JSON.stringify(att).replace(/"/g, '&quot;');
            
            return `
                <tr>
                    <td>
                        <div style="font-weight: 500;">${att.employeeName}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${att.employeeCode}</div>
                    </td>
                    <td>${utils.formatDate(att.date)}</td>
                    <td>
                        <span class="status-badge status-${statusClass}">
                            ${statusIcons[att.status] || ''} ${att.status}
                        </span>
                    </td>
                    <td>${att.checkInTime || '-'}</td>
                    <td>${att.checkInLocation || '-'}</td>
                    <td>${att.workingFrom || '-'}</td>
                    <td>${att.checkOutTime || '-'}</td>
                    <td>${att.checkOutLocation || '-'}</td>
                    <td>${att.workingFromOut || '-'}</td>
                    <td>
                        <button class="btn-icon" onclick="openCellModal(${att.employeeId}, '${att.date}', ${attJson})" title="Edit">
                            ✏️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Hide loading, show table
    listLoading.style.display = 'none';
    listTable.style.display = 'table';
}

// Expose functions to global scope
window.switchView = switchView;
window.openMarkAttendanceModal = openMarkAttendanceModal;
window.openCellModal = openCellModal;
window.saveAttendance = saveAttendance;
window.exportAttendance = exportAttendance;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.closeModal = closeModal;
window.toggleDateFields = toggleDateFields;
window.handleFileSelect = handleFileSelect;
window.processImport = processImport;
window.downloadSampleCSV = downloadSampleCSV;
window.navigateMonth = navigateMonth;
window.applyFilter = applyFilter;
window.filterEmployeesByDepartment = filterEmployeesByDepartment;
window.applyFilter = applyFilter;
window.navigateMonth = navigateMonth;

// Initialize on page load
init();
