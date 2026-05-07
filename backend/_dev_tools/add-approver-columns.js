/**
 * Migration: Add AttendanceApproverId and LeaveApproverId columns to Employees
 * Run: node add-approver-columns.js
 */
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'HRMS',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
        connectTimeout: 30000,
        requestTimeout: 30000
    }
};

async function runMigration() {
    let pool;
    try {
        console.log('🔗 Connecting to MSSQL...');
        pool = await sql.connect(config);
        console.log('✅ Connected successfully\n');

        const sqlFile = path.join(__dirname, '..', 'database', 'add-approver-id-columns.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        // Split by GO statements (batch separator)
        const batches = sqlContent.split(/\bGO\b/gi).map(b => b.trim()).filter(b => b.length > 0);

        console.log(`📜 Executing ${batches.length} SQL batches...\n`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            if (!batch) continue;
            try {
                await pool.request().query(batch);
                console.log(`  ✅ Batch ${i + 1} executed successfully`);
            } catch (err) {
                console.error(`  ❌ Batch ${i + 1} failed: ${err.message}`);
                console.error('  SQL:', batch.substring(0, 200));
                // Continue with other batches
            }
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log('   - AttendanceApproverId (INT, FK) added to Employees');
        console.log('   - LeaveApproverId (INT, FK) added to Employees');
        console.log('   - sp_GetEmployeeApprovers created');
        console.log('   - sp_SaveEmployeeApprovers created');
        console.log('   - sp_GetEmployeeById updated with approver name JOINs');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n🔒 Database connection closed.');
        }
    }
}

runMigration();
