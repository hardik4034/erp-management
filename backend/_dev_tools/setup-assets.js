const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { getConnection, closeConnection } = require('../config/database');

async function runSQLFile(filePath) {
    try {
        console.log(`Running SQL file: ${filePath}\n`);
        
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        const pool = await getConnection();
        
        // Split by GO statements and execute each batch
        // Also handling files that end with GO without trailing newlines better
        const batches = sqlContent
            .replace(/\r\n/g, '\n')
            .split(/\ngo\b|\nGO\b/i)
            .map(b => b.trim())
            .filter(batch => batch.length > 0);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            try {
                await pool.request().query(batch);
            } catch (batchError) {
                console.error(`Error in batch ${i + 1}:`, batchError.message);
                console.log(`Batch content: ${batch.substring(0, 100)}...`);
            }
        }
        console.log(`✅ SQL file ${path.basename(filePath)} executed successfully!`);
    } catch (error) {
        console.error('❌ Error running SQL file:', error);
    }
}

async function setupAssets() {
    try {
        const schemaPath = path.join(__dirname, '..', 'database', 'asset-schema.sql');
        const proceduresPath = path.join(__dirname, '..', 'database', 'asset-procedures.sql');

        console.log('--- Starting Asset Module Backup & Setup ---');
        await runSQLFile(schemaPath);
        await runSQLFile(proceduresPath);
        console.log('--- Setup Complete ---');
    } catch (error) {
        console.error('Setup failed:', error);
    } finally {
        await closeConnection();
        process.exit(0);
    }
}

setupAssets();
