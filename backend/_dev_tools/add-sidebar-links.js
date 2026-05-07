const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');
const pagesDir = path.join(frontendDir, 'pages');

const newLinks = `
                <div class="nav-item">
                    <a href="/pages/calendar.html" class="nav-link">
                        <i>📆</i> Calendar
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/pages/timesheet.html" class="nav-link">
                        <i>⏱️</i> Timesheet
                    </a>
                </div>`;

function processHtmlFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if already added to avoid duplicates
        if (content.includes('calendar.html') && content.includes('timesheet.html')) {
            console.log(`Skipping ${path.basename(filePath)}, already has links.`);
            return;
        }

        // Insert after Holidays item in Time & Leave section
        const targetString = `                <div class="nav-item">
                    <a href="/pages/holidays.html" class="nav-link">
                        <i>🎉</i> Holidays
                    </a>
                </div>`;
                
        if (content.includes(targetString)) {
            content = content.replace(targetString, targetString + newLinks);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated sidebar in ${path.basename(filePath)}`);
        } else {
            console.log(`Could not find target string in ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error(`Error processing ${filePath}:`, e.message);
    }
}

// Process index.html
processHtmlFile(path.join(frontendDir, 'index.html'));

// Process all pages
const files = fs.readdirSync(pagesDir);
files.forEach(file => {
    if (file.endsWith('.html')) {
        processHtmlFile(path.join(pagesDir, file));
    }
});
