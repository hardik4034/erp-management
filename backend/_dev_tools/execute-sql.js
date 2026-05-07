const { getConnection } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function executeSQLFile() {
    try {
        console.log('📝 Reading SQL file...');
        const sqlFile = path.join(__dirname, '..', 'database', 'add-sp-employees-notes.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();
        
        // Split by GO statements and execute each batch
        const batches = sqlContent
            .split(/\r?\nGO\r?\n/gi)
            .filter(batch => batch.trim().length > 0);
        
        console.log(`📦 Executing ${batches.length} SQL batches...`);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch && !batch.startsWith('--') && !batch.startsWith('PRINT')) {
                console.log(`  ⚙️  Batch ${i + 1}/${batches.length}...`);
                await pool.request().query(batch);
            }
        }
        
        console.log('✅ All stored procedures created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error executing SQL:', error.message);
        console.error(error);
        process.exit(1);
    }
}

executeSQLFile();
