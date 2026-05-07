const fs = require('fs');
const file = '../frontend/pages/appreciations.html';
const content = fs.readFileSync(file, 'utf8');

const targetStr = `    <script src="../scripts/auth.js"></script>
    <script>
        auth.initAuth();
    </script>
    <script src="../scripts/api.js"></script>`;

const replacer = `    <script src="../scripts/api.js"></script>
    <script src="../scripts/auth.js"></script>`;

let newContent = content.replace(targetStr, replacer);
// If it fails because of different line endings, try regex
if (newContent === content) {
    const rx = /<script src="\.\.\/scripts\/auth\.js"><\/script>\s*<script>\s*auth\.initAuth\(\);\s*<\/script>\s*<script src="\.\.\/scripts\/api\.js"><\/script>/m;
    newContent = content.replace(rx, replacer);
}

fs.writeFileSync(file, newContent);
console.log('Fixed appreciations.html');
