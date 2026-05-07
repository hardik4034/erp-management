const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');
const pagesDir = path.join(frontendDir, 'pages');

const SIDEBAR_REGEX = /<aside class="sidebar"[\s\S]*?<\/aside>/;

function removeTimesheetFromSidebar(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (SIDEBAR_REGEX.test(content)) {
            // Remove the Timesheet nav item
            let replacedContent = content.replace(/<div class="nav-item">\s*<a href="\/pages\/timesheet\.html" class="nav-link(?: active)?">\s*<i>⏱️<\/i> Timesheet\s*<\/a>\s*<\/div>\s*/g, '');
            fs.writeFileSync(filePath, replacedContent, 'utf8');
            console.log(`Updated sidebar in ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error(`Error processing ${filePath}:`, e.message);
    }
}

// Process index.html
removeTimesheetFromSidebar(path.join(frontendDir, 'index.html'));

// Process all pages
const files = fs.readdirSync(pagesDir);
files.forEach(file => {
    if (file.endsWith('.html')) {
        removeTimesheetFromSidebar(path.join(pagesDir, file));
    }
});
