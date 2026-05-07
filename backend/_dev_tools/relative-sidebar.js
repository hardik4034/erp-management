const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');
const pagesDir = path.join(frontendDir, 'pages');

const SIDEBAR_REGEX = /<aside class="sidebar" id="sidebar">[\s\S]*?<\/aside>/;

function getSidebarHtml(depth) {
    // If depth is 0 (index.html), relative root is '.'
    // If depth is 1 (pages/*.html), relative root is '..'
    const prefix = depth === 0 ? '.' : '..';
    const pagesPrefix = depth === 0 ? './pages' : '.';

    return `        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <a href="${prefix}/index.html"><img src="${prefix}/assets/soleos.png" alt="Soleos Logo" class="sidebar-logo"></a>
                <button class="sidebar-close-btn" id="sidebarClose">&#x2715;</button>
            </div>
            <nav class="sidebar-nav">
                <div class="nav-section-label">Main</div>
                <div class="nav-item"><a href="${prefix}/index.html" class="nav-link"><i>📊</i> Dashboard</a></div>
                <div class="nav-item"><a href="${pagesPrefix}/employees.html" class="nav-link"><i>👥</i> Employees</a></div>
                
                <div class="nav-section-label">Time & Leave</div>
                <div class="nav-item"><a href="${pagesPrefix}/attendance.html" class="nav-link"><i>📅</i> Attendance</a></div>
                <div class="nav-item"><a href="${pagesPrefix}/leaves.html" class="nav-link"><i>🏖️</i> Leaves</a></div>
                <div class="nav-item"><a href="${pagesPrefix}/holidays.html" class="nav-link"><i>🎉</i> Holidays</a></div>
                <div class="nav-item"><a href="${pagesPrefix}/calendar.html" class="nav-link"><i>📆</i> Calendar</a></div>

                <div class="nav-section-label">Payroll</div>
                <div class="nav-item"><a href="${pagesPrefix}/payroll.html" class="nav-link"><i>💰</i> Payroll</a></div>
                <div class="nav-item"><a href="${pagesPrefix}/employee-salary.html" class="nav-link"><i>💵</i> Employee Salary</a></div>

                <div class="nav-section-label">Organisation</div>
                <div class="nav-item"><a href="${pagesPrefix}/departments.html" class="nav-link"><i>🏢</i> Departments</a></div>
                <div class="nav-item"><a href="${pagesPrefix}/designations.html" class="nav-link"><i>💼</i> Designations</a></div>
                <div class="nav-item"><a href="${pagesPrefix}/appreciations.html" class="nav-link"><i>🏆</i> Appreciations</a></div>
                <div class="nav-item"><a href="${pagesPrefix}/note.html" class="nav-link"><i>📝</i> Notes</a></div>

                <div class="nav-section-label">Reports</div>
                <div class="nav-item"><a href="${pagesPrefix}/reports.html" class="nav-link hr-only"><i>📈</i> Reports</a></div>

                <div class="nav-section-label">Settings</div>
                <div class="nav-item"><a href="${pagesPrefix}/biometric-settings.html" class="nav-link hr-only"><i>🔐</i> Biometric Settings</a></div>
            </nav>
        </aside>`;
}

function processFile(filePath, depth) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (SIDEBAR_REGEX.test(content)) {
            let replacedContent = content.replace(SIDEBAR_REGEX, getSidebarHtml(depth).trim());
            fs.writeFileSync(filePath, replacedContent, 'utf8');
            console.log(`Updated relative sidebar paths in ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error(`Error processing ${filePath}:`, e.message);
    }
}

// Process index.html (depth 0)
processFile(path.join(frontendDir, 'index.html'), 0);

// Process all pages (depth 1)
const files = fs.readdirSync(pagesDir);
files.forEach(file => {
    if (file.endsWith('.html')) {
        processFile(path.join(pagesDir, file), 1);
    }
});
