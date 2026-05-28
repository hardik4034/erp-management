const fs = require('fs');

const schema = fs.readFileSync('02-core-tables-schema.sql', 'utf8');
const procs = fs.readFileSync('03-core-procedures.sql', 'utf8');

// Extract all table names created
const tableMatches = [...schema.matchAll(/CREATE\s+TABLE\s+([a-zA-Z0-9_\[\]]+)/gi)];
const tables = tableMatches.map(m => m[1].replace(/[\[\]]/g, '').toLowerCase());

// Extract all INSERT/UPDATE/DELETE/JOIN target tables in procs to see if they exist
// A simplistic approach
const usedTablesMatches = [...procs.matchAll(/(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z0-9_\[\]]+)/gi)];
const usedTables = [...new Set(usedTablesMatches.map(m => m[1].replace(/[\[\]]/g, '').toLowerCase()))];

const missing = usedTables.filter(t => !tables.includes(t) && !['inserted', 'deleted', 'sys.tables', 'sys.columns', 'sys.databases', 'sys.objects'].includes(t) && !t.startsWith('@') && !t.startsWith('#'));

console.log('Tables created:', tables.length);
console.log('Tables referenced:', usedTables.length);
console.log('Potentially missing tables referenced in procs:', missing.join(', '));
