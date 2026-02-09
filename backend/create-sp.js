const { getConnection, sql } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function executeSQLFile() {
    try {
        console.log('📝 Reading SQL file...');
        const sqlFile = path.join(__dirname, '..', 'database', 'create-notes-sp.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();
        
        // Split by GO and execute each batch
        const batches = sqlContent
            .split(/\bGO\b/gi)
            .map(b => b.trim())
            .filter(b => b.length > 0 && !b.startsWith('--'));
        
        console.log(`📦 Executing ${batches.length} SQL batches...`);
        
        for (let i = 0; i < batches.length; i++) {
            console.log(`  ⚙️  Batch ${i + 1}/${batches.length}...`);
            try {
                await pool.request().query(batches[i]);
                console.log(`  ✅ Batch ${i + 1} completed`);
            } catch (err) {
                console.error(`  ❌ Batch ${i + 1} failed:`, err.message);
            }
        }
        
        console.log('\n✅ SQL execution completed!');
        console.log('\n🧪 Testing stored procedures...');
        
        // Test sp_GetAllEmployees
        const empResult = await pool.request().execute('sp_GetAllEmployees');
        console.log(`✅ sp_GetAllEmployees: Found ${empResult.recordset.length} employees`);
        if (empResult.recordset.length > 0) {
            console.log(`   First employee: ${empResult.recordset[0].FirstName} ${empResult.recordset[0].LastName}`);
        }
        
        // Test sp_GetAllNotes
        const notesResult = await pool.request()
            .input('EmployeeId', sql.Int, null)
            .execute('sp_GetAllNotes');
        console.log(`✅ sp_GetAllNotes: Found ${notesResult.recordset.length} notes`);
        
        console.log('\n🎉 All stored procedures are working!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

executeSQLFile();
