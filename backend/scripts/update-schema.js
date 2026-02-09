const fs = require('fs');
const path = require('path');
const { getConnection, closeConnection } = require('../config/database');

const runUpdates = async () => {
    try {
        console.log('Connecting to database...');
        const pool = await getConnection();

        // Files to execute
        const files = [
            path.join(__dirname, '../../database/attendance-schema-update.sql'),
            path.join(__dirname, '../../database/stored-procedures.sql')
        ];

        for (const file of files) {
            console.log(`Reading file: ${file}`);
            const sqlContent = fs.readFileSync(file, 'utf8');
            
            // Split by GO command as node-mssql might not handle it or handle as batches
            // Actually node-mssql execute() usually executes a single batch. 
            // 'GO' is a SSMS separator, not T-SQL. We must split by 'GO'.
            const batches = sqlContent.split(/^\s*GO\s*$/m);

            console.log(`Found ${batches.length} batches in ${path.basename(file)}`);

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i].trim();
                if (batch) {
                    try {
                        await pool.request().query(batch);
                        console.log(`Batch ${i + 1} executed successfully.`);
                    } catch (err) {
                        console.error(`Error executing batch ${i + 1} in ${path.basename(file)}:`, err.message);
                        // Depending on error we might want to continue or stop. 
                        // For idempotent scripts (IF NOT EXISTS), errors usually mean syntax or permission.
                    }
                }
            }
        }

        console.log('All updates completed.');
    } catch (error) {
        console.error('Update failed:', error);
    } finally {
        await closeConnection();
    }
};

runUpdates();
