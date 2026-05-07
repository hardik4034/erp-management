const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { getConnection } = require('../config/database');

async function runSQLFile(filePath) {
    try {
        console.log(`Running SQL file: ${filePath}\n`);
        
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        const pool = await getConnection();
        
        // Split by GO statements and execute each batch
        const batches = sqlContent
            .split(/\r?\nGO(\r?\n|$)/gi)
            .filter(batch => batch && batch.trim().length > 0 && batch.trim().toUpperCase() !== 'GO');
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                try {
                    await pool.request().query(batch);
                } catch (batchError) {
                    console.error(`Error in batch ${i + 1}:\n${batch.substring(0, 100)}...`, batchError.message);
                }
            }
        }
        
        console.log('\n✅ Calendar SQL file executed successfully!');
        
    } catch (error) {
        console.error('❌ Error running SQL file:', error);
    } finally {
        process.exit();
    }
}

const sqlFilePath = path.join(__dirname, '..', 'database', 'calendar-timesheet-schema.sql');
runSQLFile(sqlFilePath);
