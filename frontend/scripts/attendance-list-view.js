// =============================================
// View Switching
// =============================================
function switchView(view) {
    currentView = view;
    
    // Update button states
    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    
    // Toggle containers
    document.getElementById('gridViewContainer').style.display = view === 'grid' ? 'block' : 'none';
    document.getElementById('listViewContainer').style.display = view === 'list' ? 'block' : 'none';
    
    // Render appropriate view
    if (view === 'list') {
        renderListView();
    }
}

// =============================================
// Helper: Format Time (HH:MM from various formats)
// =============================================
function formatTimeForList(timeStr) {
    if (!timeStr) return '-';
    
    // If it's already in HH:MM format, return it
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
    }
    
    // If it's in HH:MM:SS format, extract HH:MM
    if (/^\d{2}:\d{2}:\d{2}/.test(timeStr)) {
        return timeStr.substring(0, 5);
    }
    
    // If it's an ISO datetime string (e.g., 1970-01-01T02:30:00.000Z)
    try {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
            // Convert to IST (UTC+5:30) and extract time in 24-hour format
            const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
            const hours = istDate.getUTCHours().toString().padStart(2, '0');
            const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }
    } catch (e) {
        // If parsing fails, return the original string
    }
    
    return timeStr;
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
            
            return `
                <tr>
                    <td>
                        <div style="font-weight: 500; cursor: pointer; color: var(--primary-color);" 
                             onclick="window.utils.navigateToProfile(${att.employeeId})" 
                             title="View ${att.employeeName}'s profile">${att.employeeName}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${att.employeeCode}</div>
                    </td>
                    <td>${utils.formatDate(att.date)}</td>
                    <td>
                        <span class="status-badge status-${statusClass}">
                            ${statusIcons[att.status] || ''} ${att.status}
                        </span>
                    </td>
                    <td>${formatTimeForList(att.checkInTime)}</td>
                    <td>${att.checkInLocation || '-'}</td>
                    <td>${att.workingFrom || '-'}</td>
                    <td>${formatTimeForList(att.checkOutTime)}</td>
                    <td>${att.checkOutLocation || '-'}</td>
                    <td>${att.workingFromOut || '-'}</td>
                    <td>
                        <button class="btn-icon" onclick="openCellModal(${att.employeeId}, '${att.date}', ${JSON.stringify(att).replace(/"/g, '&quot;')})" title="Edit">
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

// Expose to global scope
window.switchView = switchView;
window.navigateMonth = navigateMonth;
window.applyFilter = applyFilter;
