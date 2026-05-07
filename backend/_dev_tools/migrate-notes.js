require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getConnection } = require('../config/database');

async function runMigration() {
    try {
        console.log('Connecting to database...');
        const pool = await getConnection();
        
        const sqlFilePath = path.join(__dirname, '../database/employee-notes-schema.sql');
        console.log(`Reading SQL file: ${sqlFilePath}`);
        
        let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Split by GO statements since mssql npm package doesn't support GO batches directly
        const batches = sqlContent.split(/\bGO\b/i).filter(b => b.trim().length > 0);
        
        console.log(`Found ${batches.length} execution batches. Running...`);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                try {
                    await pool.request().query(batch);
                    console.log(`✓ Batch ${i + 1} executed successfully.`);
                } catch (err) {
                    console.error(`✗ Error in Batch ${i + 1}:`, err.message);
                    console.error('Batch Content:', batch.substring(0, 100) + '...');
                    throw err; // Stop on first error
                }
            }
        }
        
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
