const fs = require('fs');
const file = '../frontend/pages/appreciations.html';
const content = fs.readFileSync(file, 'utf8');

const regex = /<script src="\.\.\/scripts\/api\.js"><\/script>\r?\n\s*<script src="\.\.\/scripts\/auth\.js"><\/script>\r?\n\s*auth\.initAuth\(\);\r?\n\s*<\/script>\r?\n\s*<script src="\.\.\/scripts\/api\.js"><\/script>/m;

const replacer = `<script src="../scripts/api.js"></script>\n    <script src="../scripts/auth.js"></script>`;

const newContent = content.replace(regex, replacer);
fs.writeFileSync(file, newContent);
console.log('Fixed appreciations.html successfully.');
