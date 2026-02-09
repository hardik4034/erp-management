// =============================================
// Attendance by Member JavaScript Module
// Individual employee attendance tracking
// FIXED: String-based date/time handling (no timezone bugs)
// =============================================

auth.requireAuth();
auth.initAuth();

// Global State
let currentEmployee = null;
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let attendanceData = [];
let holidays = [];

// =============================================
// Initialization
// =============================================
async function init() {
    initializeFilters();
    await loadEmployees();
    await loadHolidays();

    document.getElementById('employeeFilter').addEventListener('change', handleEmployeeChange);
    document.getElementById('monthFilter').addEventListener('change', handleFilterChange);
    document.getElementById('yearFilter').addEventListener('change', handleFilterChange);
    
    // Listen for role changes and reload employees
    window.addEventListener('roleChanged', (event) => {
        console.log(`🔄 Role changed to ${event.detail.role}, reloading employees...`);
        loadEmployees();
    });
}

// =============================================
// Initialize Filters
// =============================================
function initializeFilters() {
    document.getElementById('monthFilter').value = currentMonth;

    const yearSelect = document.getElementById('yearFilter');
    yearSelect.innerHTML = '';
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

// =============================================
// Load Employees
// =============================================
async function loadEmployees() {
    try {
        console.log('Loading employees...');
        const response = await endpoints.employees.getAll();
        console.log('Employee API response:', response);
        let allEmployees = response.data || [];
        console.log('Number of employees (before filtering):', allEmployees.length);

        // Apply role-based filtering
        const dataScope = window.roleManager.getDataScope();
        const currentEmployeeId = window.roleManager.getCurrentEmployeeId();
        
        console.log('🔍 Filtering Debug:', { 
            role: window.roleManager.getCurrentRole(),
            dataScope, 
            currentEmployeeId
        });

        let employees = [];
        if (dataScope === 'own' && currentEmployeeId) {
            // Employee role: show only their own data
            employees = allEmployees.filter(emp => emp.EmployeeId == currentEmployeeId);
            console.log(`📊 Filtered to own data: ${employees.length} employee(s)`);
        } else if (dataScope === 'team' && currentEmployeeId) {
            // Manager role: show their team (employees reporting to them) + themselves
            employees = allEmployees.filter(emp => 
                emp.ReportingTo == currentEmployeeId || emp.EmployeeId == currentEmployeeId
            );
            console.log(`📊 Filtered to team data: ${employees.length} employee(s)`);
        } else {
            // Admin/HR role: show all data
            employees = allEmployees;
            console.log(`📊 Showing all data: ${employees.length} employee(s)`);
        }

        const employeeSelect = document.getElementById('employeeFilter');
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';

        employees.forEach(emp => {
            const option = document.createElement('option');
            // Use PascalCase as per API response
            option.value = emp.EmployeeId;
            option.textContent = `${emp.FirstName} ${emp.LastName} (${emp.EmployeeCode})`;
            option.dataset.firstName = emp.FirstName;
            option.dataset.lastName = emp.LastName;
            option.dataset.profilePicture = emp.ProfilePicture || '';
            employeeSelect.appendChild(option);
        });
        
        // Auto-select if only one employee (Employee role)
        if (employees.length === 1 && dataScope === 'own') {
            employeeSelect.value = employees[0].EmployeeId;
            currentEmployee = employees[0].EmployeeId;
            loadAttendanceData();
            console.log('✅ Auto-selected employee for Employee role');
        }
        
        // Check for employeeId URL parameter (from profile page)
        const urlParams = new URLSearchParams(window.location.search);
        const urlEmployeeId = urlParams.get('employeeId');
        
        if (urlEmployeeId) {
            const employeeExists = employees.find(emp => emp.EmployeeId == urlEmployeeId);
            if (employeeExists) {
                employeeSelect.value = urlEmployeeId;
                currentEmployee = parseInt(urlEmployeeId);
                loadAttendanceData();
                
                // Hide the employee dropdown when coming from profile
                const employeeFilterContainer = employeeSelect.closest('.filter-group');
                if (employeeFilterContainer) {
                    employeeFilterContainer.style.display = 'none';
                }
                
                console.log('✅ Auto-selected employee from URL parameter:', urlEmployeeId);
            }
        }
        
        console.log('Employees loaded successfully');
    } catch (error) {
        console.error('Error loading employees:', error);
        console.error('Error details:', error.message);
        utils.showAlert('Failed to load employees: ' + error.message, 'error');
    }
}

// =============================================
// Load Holidays
// =============================================
async function loadHolidays() {
    try {
        const response = await endpoints.holidays.getAll({ year: currentYear });
        holidays = response.data || [];
    } catch (error) {
        console.error('Error loading holidays:', error);
        holidays = [];
    }
}

// =============================================
// Event Handlers
// =============================================
function handleEmployeeChange(e) {
    const employeeId = e.target.value;
    if (employeeId) {
        currentEmployee = parseInt(employeeId);
        loadAttendanceData();
    } else {
        currentEmployee = null;
        clearAttendanceTable();
        resetSummaryCards();
    }
}

function handleFilterChange() {
    currentMonth = parseInt(document.getElementById('monthFilter').value);
    currentYear = parseInt(document.getElementById('yearFilter').value);

    if (currentEmployee) {
        loadAttendanceData();
    }

    loadHolidays();
}

// =============================================
// Load Attendance Data
// =============================================
async function loadAttendanceData() {
    if (!currentEmployee) return;

    try {
        const fromDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const toDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

        const response = await endpoints.attendance.getAll({
            employeeId: currentEmployee,
            fromDate,
            toDate
        });

        attendanceData = response.data || [];

        renderAttendanceTable();
        updateSummaryCards();

    } catch (error) {
        console.error('Error loading attendance:', error);
        utils.showAlert('Failed to load attendance data', 'error');
    }
}

// =============================================
// Render Attendance Table
// =============================================
function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';

    if (!currentEmployee) {
        clearAttendanceTable();
        return;
    }

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const monthDays = [];

    // Create array of date strings (YYYY-MM-DD format)
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        monthDays.push(dateStr);
    }

    // Create attendance map using date strings directly
    // IMPORTANT: Use camelCase field names as returned by API
    const attendanceMap = {};
    attendanceData.forEach(record => {
        // Extract date string from AttendanceDate (handle both YYYY-MM-DD and ISO format)
        let dateKey = record.AttendanceDate || record.attendanceDate;
        if (dateKey && dateKey.includes('T')) {
            dateKey = dateKey.split('T')[0];
        }
        attendanceMap[dateKey] = record;
    });

    // Reverse to show most recent first
    monthDays.reverse().forEach(dateStr => {
        const attendance = attendanceMap[dateStr];
        const dayOfWeek = getDayOfWeek(dateStr);
        const dayName = getDayName(dateStr);
        // Only Sunday (0) is weekend
        const isWeekend = dayOfWeek === 0;
        const isHoliday = holidays.some(h => {
            let holidayDate = h.HolidayDate || h.holidayDate;
            if (holidayDate && holidayDate.includes('T')) {
                holidayDate = holidayDate.split('T')[0];
            }
            return holidayDate === dateStr;
        });

        const row = document.createElement('tr');

        // Date
        const dateCell = document.createElement('td');
        const dateParts = formatDateForDisplay(dateStr);
        dateCell.innerHTML = `
            <div class="date-cell">
                <span class="date-day">${dateParts.display}</span>
                <span class="date-weekday">${dayName}</span>
            </div>
        `;
        row.appendChild(dateCell);

        // Status
        const statusCell = document.createElement('td');
        if (isHoliday) {
            statusCell.innerHTML = '<span class="status-badge status-holiday">Holiday</span>';
        } else if (isWeekend) {
            statusCell.innerHTML = '<span class="empty-cell">Weekend</span>';
        } else if (attendance) {
            const status = attendance.Status || attendance.status;
            const statusClass = status
                .toLowerCase()
                .replace(/\s+/g, '-');

            statusCell.innerHTML = `<span class="status-badge status-${statusClass}">${status}</span>`;
        } else {
            statusCell.innerHTML = '<span class="empty-cell">-</span>';
        }
        row.appendChild(statusCell);

        // Clock In - Use same field names as List View (camelCase preferred, fallback to PascalCase)
        const clockInCell = document.createElement('td');
        clockInCell.className = 'time-cell';
        const checkInTime = attendance?.checkInTime || attendance?.CheckInTime;
        clockInCell.textContent = checkInTime ? formatTimeForDisplay(checkInTime) : '-';
        row.appendChild(clockInCell);

        // Clock Out - Use same field names as List View (camelCase preferred, fallback to PascalCase)
        const clockOutCell = document.createElement('td');
        clockOutCell.className = 'time-cell';
        const checkOutTime = attendance?.checkOutTime || attendance?.CheckOutTime;
        clockOutCell.textContent = checkOutTime ? formatTimeForDisplay(checkOutTime) : '-';
        row.appendChild(clockOutCell);

        // Total
        const totalCell = document.createElement('td');
        totalCell.className = 'time-cell';
        if (checkInTime && checkOutTime) {
            totalCell.textContent = calculateHours(checkInTime, checkOutTime);
        } else {
            totalCell.textContent = '-';
        }
        row.appendChild(totalCell);

        // Others
        const othersCell = document.createElement('td');
        othersCell.className = 'empty-cell';
        if (attendance) {
            const details = [];
            const workingFrom = attendance.WorkingFrom || attendance.workingFrom;
            const checkInLocation = attendance.CheckInLocation || attendance.checkInLocation;
            if (workingFrom) details.push(workingFrom);
            if (checkInLocation) details.push(checkInLocation);
            othersCell.textContent = details.length > 0 ? details.join(', ') : '-';
        } else {
            othersCell.textContent = '-';
        }
        row.appendChild(othersCell);

        tbody.appendChild(row);
    });
}

// =============================================
// Update Summary Cards
// =============================================
function updateSummaryCards() {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    let weekendCount = 0;
    let holidayCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = getDayOfWeek(dateStr);

        // Only count Sunday as weekend
        if (dayOfWeek === 0) {
            weekendCount++;
        }

        if (holidays.some(h => {
            let holidayDate = h.HolidayDate;
            if (holidayDate.includes('T')) {
                holidayDate = holidayDate.split('T')[0];
            }
            return holidayDate === dateStr;
        })) {
            holidayCount++;
        }
    }

    const workingDays = daysInMonth - weekendCount - holidayCount;

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;

    attendanceData.forEach(record => {
        switch (record.Status) {
            case 'Present':
                presentCount++;
                break;
            case 'Late':
                lateCount++;
                break;
            case 'Half Day':
                halfDayCount++;
                break;
            case 'Absent':
                absentCount++;
                break;
        }
    });

    document.getElementById('workingDaysCount').textContent = workingDays;
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('lateCount').textContent = lateCount;
    document.getElementById('halfDayCount').textContent = halfDayCount;
    document.getElementById('absentCount').textContent = absentCount;
    document.getElementById('holidaysCount').textContent = holidayCount;
}

// =============================================
// Reset Summary Cards
// =============================================
function resetSummaryCards() {
    document.getElementById('workingDaysCount').textContent = '0';
    document.getElementById('presentCount').textContent = '0';
    document.getElementById('lateCount').textContent = '0';
    document.getElementById('halfDayCount').textContent = '0';
    document.getElementById('absentCount').textContent = '0';
    document.getElementById('holidaysCount').textContent = '0';
}

// =============================================
// Clear Attendance Table
// =============================================
function clearAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center" style="padding: 2rem; color: #9ca3af;">
                Select an employee to view attendance records
            </td>
        </tr>
    `;
}

// =============================================
// Utility Functions - String-based (NO Date objects)
// =============================================

/**
 * Get days in month without using Date object
 */
function getDaysInMonth(year, month) {
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2) {
        // Leap year check
        if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
            return 29;
        }
    }
    return daysInMonths[month - 1];
}

/**
 * Get day of week (0=Sunday, 6=Saturday) from YYYY-MM-DD string
 * Uses Zeller's congruence algorithm
 */
function getDayOfWeek(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    let y = year;
    let m = month;
    
    if (m < 3) {
        m += 12;
        y -= 1;
    }
    
    const q = day;
    const k = y % 100;
    const j = Math.floor(y / 100);
    
    const h = (q + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7;
    
    // Convert to 0=Sunday format
    return (h + 6) % 7;
}

/**
 * Get day name from YYYY-MM-DD string
 */
function getDayName(dateStr) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[getDayOfWeek(dateStr)];
}

/**
 * Format date string for display
 * Input: YYYY-MM-DD
 * Output: { display: "31 Jan 2026" }
 */
function formatDateForDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return {
        display: `${day} ${monthNames[month - 1]} ${year}`
    };
}

/**
 * Format time for display - ALWAYS 24-hour format
 * Input: "HH:mm:ss" or "HH:mm" or "1970-01-01THH:mm:ss"
 * Output: "HH:mm"
 */
function formatTimeForDisplay(timeStr) {
    if (!timeStr) return '-';

    // Handle ISO format with date prefix
    if (typeof timeStr === 'string' && timeStr.includes('T')) {
        timeStr = timeStr.split('T')[1];
    }
    
    // Extract HH:mm
    if (typeof timeStr === 'string') {
        return timeStr.substring(0, 5);
    }
    
    return '-';
}

/**
 * Calculate hours between check-in and check-out
 * Supports night shifts (e.g., 20:00 to 04:00)
 * Input: "HH:mm" or "HH:mm:ss" strings
 * Output: "Xh Ym"
 */
function calculateHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return '-';

    try {
        // Extract HH:mm format
        const checkInTime = formatTimeForDisplay(checkIn);
        const checkOutTime = formatTimeForDisplay(checkOut);
        
        // Parse to minutes
        const [checkInHour, checkInMin] = checkInTime.split(':').map(Number);
        const [checkOutHour, checkOutMin] = checkOutTime.split(':').map(Number);
        
        let checkInMinutes = checkInHour * 60 + checkInMin;
        let checkOutMinutes = checkOutHour * 60 + checkOutMin;
        
        // Handle night shift: if checkout < checkin, add 24 hours to checkout
        if (checkOutMinutes < checkInMinutes) {
            checkOutMinutes += 24 * 60;
        }
        
        const diffMinutes = checkOutMinutes - checkInMinutes;
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        return `${hours}h ${minutes}m`;
    } catch (error) {
        console.error('Error calculating hours:', error);
        return '-';
    }
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Normalize time to 24-hour format (HH:mm)
 * Handles both 24-hour format and AM/PM format
 * CRITICAL: Backend validation requires HH:mm format (WITHOUT seconds)
 * 
 * Examples:
 *   "08:00" → "08:00"
 *   "08:00:00" → "08:00"
 *   "08:00 AM" → "08:00"
 *   "08:00 PM" → "20:00"
 *   "12:00 AM" → "00:00"
 *   "12:00 PM" → "12:00"
 *   "12:30 AM" → "00:30"
 *   "12:30 PM" → "12:30"
 */
function normalizeTimeTo24Hour(timeStr) {
    if (!timeStr) return null;
    
    const trimmed = String(timeStr).trim();
    
    // Check if it's already in 24-hour format (HH:mm or HH:mm:ss)
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
        // Already in 24-hour format, return HH:mm (strip seconds if present)
        return trimmed.substring(0, 5);
    }
    
    // Check if it's in AM/PM format
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1], 10);
        const minutes = ampmMatch[2];
        const period = ampmMatch[3].toUpperCase();
        
        // Convert to 24-hour format
        if (period === 'AM') {
            // 12:00 AM → 00:00, 12:30 AM → 00:30
            if (hours === 12) {
                hours = 0;
            }
        } else { // PM
            // 12:00 PM → 12:00, 12:30 PM → 12:30
            // 01:00 PM → 13:00, 08:00 PM → 20:00
            if (hours !== 12) {
                hours += 12;
            }
        }
        
        // Format as HH:mm (WITHOUT seconds)
        return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
    
    // If format is not recognized, try to extract HH:mm
    console.warn('Unrecognized time format:', timeStr);
    const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (hhmmMatch) {
        return `${String(hhmmMatch[1]).padStart(2, '0')}:${hhmmMatch[2]}`;
    }
    return null;
}

// =============================================
// Modal Functions
// =============================================
function openMarkAttendanceModal() {
    if (!currentEmployee) {
        utils.showAlert('Please select an employee first', 'warning');
        return;
    }

    const employeeSelect = document.getElementById('employeeFilter');
    const selectedOption = employeeSelect.options[employeeSelect.selectedIndex];
    const employeeName = selectedOption.textContent;

    document.getElementById('attendanceForm').reset();
    document.getElementById('attendanceId').value = '';
    document.getElementById('employeeId').value = currentEmployee;
    document.getElementById('employeeName').value = employeeName;

    // Use string-based date (no timezone conversion)
    document.getElementById('attendanceDate').value = getTodayDateString();

    document.getElementById('checkInTime').value = '08:00';
    document.getElementById('checkOutTime').value = '18:00';

    document.getElementById('attendanceModal').classList.add('active');
}

function closeModal() {
    document.getElementById('attendanceModal').classList.remove('active');
}

window.openMarkAttendanceModal = openMarkAttendanceModal;
window.closeModal = closeModal;
window.saveAttendance = saveAttendance;

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
    const attendanceDate = document.getElementById('attendanceDate').value; // Already YYYY-MM-DD
    const status = document.getElementById('attendanceStatus').value;
    const checkInTimeRaw = document.getElementById('checkInTime').value;
    const checkOutTimeRaw = document.getElementById('checkOutTime').value;

    if ((status === 'Present' || status === 'Late') && !checkOutTimeRaw) {
        utils.showAlert('Check Out time is required for Present/Late status', 'error');
        return;
    }

    // CRITICAL: Normalize times to 24-hour format (HH:mm) before sending to API
    const checkInTime = normalizeTimeTo24Hour(checkInTimeRaw);
    const checkOutTime = normalizeTimeTo24Hour(checkOutTimeRaw);

    console.log('🕐 Time Normalization:');
    console.log('  Check In:  ', checkInTimeRaw, '→', checkInTime);
    console.log('  Check Out: ', checkOutTimeRaw, '→', checkOutTime);

    const data = {
        employeeId,
        attendanceDate, // Send as-is (YYYY-MM-DD)
        status,
        checkInTime: checkInTime || null, // Normalized to HH:mm
        checkOutTime: checkOutTime || null, // Normalized to HH:mm
        checkInLocation: document.getElementById('checkInLocation').value || null,
        checkOutLocation: document.getElementById('checkOutLocation').value || null,
        workingFrom: document.getElementById('workingFrom').value || null,
        workingFromOut: document.getElementById('workingFromOut').value || null,
        overwrite: document.getElementById('attendanceOverwrite').checked,
        remarks: null
    };

    try {
        await endpoints.attendance.create(data);
        utils.showAlert('Attendance marked successfully', 'success');
        closeModal();
        await loadAttendanceData();
    } catch (error) {
        console.error('Error saving attendance:', error);
        
        // Check if it's a duplicate record error
        if (error.message && error.message.includes('already exists')) {
            // Highlight the overwrite checkbox
            const overwriteCheckbox = document.getElementById('attendanceOverwrite');
            const checkboxContainer = overwriteCheckbox.closest('.checkbox-label');
            
            // Add visual highlight
            if (checkboxContainer) {
                checkboxContainer.style.backgroundColor = '#fef3c7';
                checkboxContainer.style.padding = '0.75rem';
                checkboxContainer.style.borderRadius = '6px';
                checkboxContainer.style.border = '2px solid #f59e0b';
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                    checkboxContainer.style.backgroundColor = '';
                    checkboxContainer.style.padding = '';
                    checkboxContainer.style.borderRadius = '';
                    checkboxContainer.style.border = '';
                }, 3000);
            }
            
            // Show user-friendly error message
            utils.showAlert('⚠️ Attendance already exists for this date. Please check "Attendance Overwrite" below to update it.', 'warning');
        } else {
            // Show original error for other types of errors
            utils.showAlert(error.message || 'Failed to save attendance', 'error');
        }
    }
}

// =============================================
// Import/Export Functions
// =============================================
function importAttendance() {
    utils.showAlert('Import functionality coming soon', 'info');
}

function exportAttendance() {
    if (!currentEmployee) {
        utils.showAlert('Please select an employee first', 'warning');
        return;
    }

    utils.showAlert('Export functionality coming soon', 'info');
}

// =============================================
// Initialize on page load
// =============================================
document.addEventListener('DOMContentLoaded', init);

window.openMarkAttendanceModal = openMarkAttendanceModal;
window.closeModal = closeModal;
window.saveAttendance = saveAttendance;
window.importAttendance = importAttendance;
window.exportAttendance = exportAttendance;
console.log("attendance-by-member.js fully loaded (FIXED: String-based date/time)");
