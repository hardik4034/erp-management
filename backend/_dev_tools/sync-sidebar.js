const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');
const pagesDir = path.join(frontendDir, 'pages');

const STANDARD_SIDEBAR = `        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <a href="/index.html"><img src="/assets/soleos.png" alt="Soleos Logo" class="sidebar-logo"></a>
                <button class="sidebar-close-btn" id="sidebarClose">&#x2715;</button>
            </div>
            <nav class="sidebar-nav">
                <div class="nav-section-label">Main</div>
                <div class="nav-item"><a href="/index.html" class="nav-link"><i>📊</i> Dashboard</a></div>
                <div class="nav-item"><a href="/pages/employees.html" class="nav-link"><i>👥</i> Employees</a></div>
                
                <div class="nav-section-label">Time & Leave</div>
                <div class="nav-item"><a href="/pages/attendance.html" class="nav-link"><i>📅</i> Attendance</a></div>
                <div class="nav-item"><a href="/pages/leaves.html" class="nav-link"><i>🏖️</i> Leaves</a></div>
                <div class="nav-item"><a href="/pages/holidays.html" class="nav-link"><i>🎉</i> Holidays</a></div>
                <div class="nav-item"><a href="/pages/calendar.html" class="nav-link"><i>📆</i> Calendar</a></div>
                <div class="nav-item"><a href="/pages/timesheet.html" class="nav-link"><i>⏱️</i> Timesheet</a></div>

                <div class="nav-section-label">Payroll</div>
                <div class="nav-item"><a href="/pages/payroll.html" class="nav-link"><i>💰</i> Payroll</a></div>
                <div class="nav-item"><a href="/pages/employee-salary.html" class="nav-link"><i>💵</i> Employee Salary</a></div>

                <div class="nav-section-label">Organisation</div>
                <div class="nav-item"><a href="/pages/departments.html" class="nav-link"><i>🏢</i> Departments</a></div>
                <div class="nav-item"><a href="/pages/designations.html" class="nav-link"><i>💼</i> Designations</a></div>
                <div class="nav-item"><a href="/pages/appreciations.html" class="nav-link"><i>🏆</i> Appreciations</a></div>
                <div class="nav-item"><a href="/pages/note.html" class="nav-link"><i>📝</i> Notes</a></div>

                <div class="nav-section-label">Reports</div>
                <div class="nav-item"><a href="/pages/reports.html" class="nav-link hr-only"><i>📈</i> Reports</a></div>

                <div class="nav-section-label">Settings</div>
                <div class="nav-item"><a href="/pages/biometric-settings.html" class="nav-link hr-only"><i>🔐</i> Biometric Settings</a></div>
            </nav>
        </aside>`;

const SIDEBAR_REGEX = /<aside class="sidebar"[\s\S]*?<\/aside>/;

function syncSidebar(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (SIDEBAR_REGEX.test(content)) {
            let replacedContent = content.replace(SIDEBAR_REGEX, STANDARD_SIDEBAR);
            
            // Auto inject overlay if missing
            if (!replacedContent.includes('id="sidebarOverlay"')) {
                replacedContent = replacedContent.replace('<div class="app-container">', '<div class="app-container">\n        <!-- Sidebar Overlay -->\n        <div class="sidebar-overlay" id="sidebarOverlay"></div>\n');
            }

            fs.writeFileSync(filePath, replacedContent, 'utf8');
            console.log(`Synced sidebar in ${path.basename(filePath)}`);
        } else {
            console.log(`No sidebar found in ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error(`Error processing ${filePath}:`, e.message);
    }
}

// Process index.html
syncSidebar(path.join(frontendDir, 'index.html'));

// Process all pages
const files = fs.readdirSync(pagesDir);
files.forEach(file => {
    if (file.endsWith('.html')) {
        syncSidebar(path.join(pagesDir, file));
    }
});
