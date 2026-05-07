const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'pages');
const indexHtmlPaths = [
    path.join(__dirname, 'frontend', 'index.html')
];

const getFiles = (dir) => fs.readdirSync(dir).map(f => path.join(dir, f));
const htmlFiles = getFiles(pagesDir).filter(f => f.endsWith('.html')).concat(indexHtmlPaths);

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');

    if (!content.includes('http://localhost:3000/app/admin/users')) {
        const adminLinks = `
                <div class="nav-section-label admin-only">Admin Settings</div>
                <div class="nav-item admin-only"><a href="http://localhost:3000/app/admin/users" target="_blank" class="nav-link"><i>🧑‍💻</i> User Management</a></div>
                <div class="nav-item admin-only"><a href="http://localhost:3000/app/admin/permissions" target="_blank" class="nav-link"><i>🔑</i> Permissions</a></div>
`;
        // Insert right before </nav>
        content = content.replace('</nav>', adminLinks + '            </nav>');
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
    } else {
        // Ensure "Permissions" link is there if User Management was there
        if (!content.includes('http://localhost:3000/app/admin/permissions')) {
             const permissionsLink = `\n                <div class="nav-item admin-only"><a href="http://localhost:3000/app/admin/permissions" target="_blank" class="nav-link"><i>🔑</i> Permissions</a></div>\n`;
             content = content.replace(/(<a href="http:\/\/localhost:3000\/app\/admin\/users"[^>]*>.*?<\/a><\/div>)/, '$1' + permissionsLink);
             fs.writeFileSync(file, content, 'utf8');
             console.log('Updated with Permissions', file);
        }
    }
}
