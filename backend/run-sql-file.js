const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { getConnection } = require('./config/database');

async function runSQLFile(filePath) {
    try {
        console.log(`Running SQL file: ${filePath}\n`);
        
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        const pool = await getConnection();
        
        // Split by GO statements and execute each batch
        const batches = sqlContent
            .split(/\r?\nGO\r?\n/gi)
            .filter(batch => batch.trim().length > 0);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                try {
                    const result = await pool.request().query(batch);
                    if (result.recordset && result.recordset.length > 0) {
                        console.log(result.recordset);
                    }
                } catch (batchError) {
                    console.error(`Error in batch ${i + 1}:`, batchError.message);
                }
            }
        }
        
        console.log('\n✅ SQL file executed successfully!');
        
    } catch (error) {
        console.error('❌ Error running SQL file:', error);
    } finally {
        process.exit();
    }
}

const sqlFilePath = path.join(__dirname, '..', 'database', 'fix-payroll-components.sql');
runSQLFile(sqlFilePath);
