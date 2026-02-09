const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'pages');
const excludeFiles = ['employees.html']; // Already updated manually

function updateFile(filePath, isRoot = false) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Add sidebar overlay if missing
    if (!content.includes('id="sidebarOverlay"')) {
        content = content.replace('<div class="app-container">', '<div class="app-container">\n        <!-- Sidebar Overlay -->\n        <div class="sidebar-overlay" id="sidebarOverlay"></div>\n');
    }

    // 2. Add sidebar ID and Close Button if missing
    if (!content.includes('id="sidebarClose"')) {
        // Find existing sidebar header content
        content = content.replace(/<div class="sidebar-header">\s*<img src="([^"]+)" alt="Soleos Logo" class="sidebar-logo">\s*<\/div>/, (match, imgSrc) => {
            return `<div class="sidebar-header">\n                <img src="${imgSrc}" alt="Soleos Logo" class="sidebar-logo">\n                <button class="sidebar-close-btn" id="sidebarClose">&times;</button>\n            </div>`;
        });
        
        // Add id="sidebar" to aside if missing
        if (!content.includes('<aside class="sidebar" id="sidebar"')) {
             content = content.replace('<aside class="sidebar">', '<aside class="sidebar" id="sidebar">');
        }
    }

    // 3. Add Hamburger Button to Header if missing
    if (!content.includes('id="sidebarToggle"')) {
        // We need to wrap the title in header-left or just insert before title
        // Pattern: <header class="header"> ... <div class="header-title">
        
        const headerTitleRegex = /<header class="header">\s*<div class="header-title">/s;
        if (headerTitleRegex.test(content)) {
            content = content.replace(headerTitleRegex, `<header class="header">\n                <div class="header-left">\n                    <button class="hamburger-btn" id="sidebarToggle">\n                        ☰\n                    </button>\n                    <div class="header-title">`);
            
            // Close the header-left div after the header-title div closes
            // This is tricky with regex. Let's try to just find the closing div of header-title.
            // Assuming header-title contains an h1 and closes.
            content = content.replace(/(<h1>.*?<\/h1>\s*<\/div>)/s, '$1\n                </div>');
        } else {
             // Fallback for simpler pattern
             content = content.replace('<h1>', '<div class="header-left">\n                    <button class="hamburger-btn" id="sidebarToggle">\n                        ☰\n                    </button>\n                    <div class="header-title">\n                        <h1>');
             content = content.replace('</h1>', '</h1>\n                    </div>\n                </div>');
        }
    }

    // 4. Add Sidebar Script
    if (!content.includes('sidebar.js')) {
        const scriptPath = isRoot ? 'scripts/sidebar.js' : '../scripts/sidebar.js';
        const scriptTag = `<script src="${scriptPath}"></script>`;
        
        // Insert before role-manager or at end of body
        if (content.includes('role-manager.js')) {
            content = content.replace(/<script src="[^"]*role-manager.js"><\/script>/, `${scriptTag}\n    $&`);
        } else {
            content = content.replace('</body>', `    ${scriptTag}\n</body>`);
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
}

// Process pages
fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.html') && !excludeFiles.includes(file)) {
        updateFile(path.join(pagesDir, file));
    }
});

// Update root index.html if needed (though we did it manually, checking doesn't hurt)
// updateFile(path.join(__dirname, 'index.html'), true);
