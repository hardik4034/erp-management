document.addEventListener('DOMContentLoaded', () => {
    // Basic permissions check
    const roleManager = window.roleManager;
    
    // Default values
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const currentMonthStr = `${yyyy}-${mm}`;
    
    const firstDay = new Date(yyyy, now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(yyyy, now.getMonth() + 1, 0).toISOString().split('T')[0];
    document.getElementById('repLeaveFrom').value = firstDay;
    document.getElementById('repLeaveTo').value = lastDay;
    document.getElementById('repHolidayYear').value = yyyy;

    const downloadCSV = (csvContent, fileName) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const convertToCSV = (arr) => {
        if (!arr || arr.length === 0) return '';
        const keys = Object.keys(arr[0]);
        const csvRows = [];
        // Header
        csvRows.push(keys.join(','));
        // Rows
        for (const row of arr) {
            const values = keys.map(k => {
                let val = row[k];
                if (val === null || val === undefined) val = '';
                // Escape quotes and commas
                val = val.toString().replace(/"/g, '""');
                if (val.search(/("|,|\n)/g) >= 0) {
                    val = `"${val}"`;
                }
                return val;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    };

    window.generateLeaveReport = async () => {
        try {
            const from = document.getElementById('repLeaveFrom').value;
            const to = document.getElementById('repLeaveTo').value;
            if (!from || !to) return window.toast.show('Select date range', 'error');

            // Using existing endpoint setup format? Let's check api.js or use general pattern
            // Assumes standard pattern endpoints.leaves.getAll accepts dates or fetch natively
            const res = await endpoints.leaves.getAll({ fromDate: from, toDate: to });
            if (res.data && res.data.length > 0) {
                const reportData = res.data.map(l => ({
                    'Employee Name': `${l.FirstName} ${l.LastName}`,
                    'Leave Type': l.LeaveType || l.LeaveTypeName || '',
                    'From Date': new Date(l.FromDate).toLocaleDateString(),
                    'To Date': new Date(l.ToDate).toLocaleDateString(),
                    'Duration': l.Duration || '',
                    'Status': l.Status,
                    'Reason': l.Reason
                }));
                const csv = convertToCSV(reportData);
                downloadCSV(csv, `Leave_Report_${from}_to_${to}.csv`);
                window.toast.show('Report downloaded successfully', 'success');
            } else {
                window.toast.show('No data found for this period', 'info');
            }
        } catch (e) {
             window.toast.show('Failed to generate report', 'error');
        }
    };

    window.generateHolidayReport = async () => {
        try {
            const year = document.getElementById('repHolidayYear').value;
            if (!year) return window.toast.show('Enter year', 'error');

            const res = await api.get(`/holidays?year=${year}`);
            if (res.success && res.data && res.data.length > 0) {
                const reportData = res.data.map(h => ({
                    'Holiday Name': h.HolidayName,
                    'Date': new Date(h.HolidayDate).toLocaleDateString(),
                    'Description': h.Description || ''
                }));
                const csv = convertToCSV(reportData);
                downloadCSV(csv, `Holidays_${year}.csv`);
                window.toast.show('Report downloaded successfully', 'success');
            } else {
                 window.toast.show('No holidays found for this year', 'info');
            }
        } catch (e) {
             window.toast.show('Failed to generate report', 'error');
        }
    };

    // Role verification - block non HR/Admin
    window.addEventListener('roleChanged', () => {
        const role = roleManager.getCurrentRole();
        if (role !== 'admin' && role !== 'hr') {
            document.querySelector('.content-area').innerHTML = '<div style="padding:40px; text-align:center; color:red; font-size:1.2rem;">You do not have permission to view Reports.</div>';
        }
    });
});
