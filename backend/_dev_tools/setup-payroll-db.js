const sql = require('mssql');
const { getConnection } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

async function setupPayrollDatabase() {
    try {
        console.log('🚀 Starting Payroll Database Setup...\n');

        const pool = await getConnection();
        console.log('✅ Database connection established\n');

        // Read and execute schema file
        console.log('📄 Reading payroll schema file...');
        const schemaPath = path.join(__dirname, '../database/payroll-schema.sql');
        const schemaSQL = await fs.readFile(schemaPath, 'utf8');
        
        console.log('⚙️  Executing payroll schema...');
        // Split by GO statements and execute each batch
        const schemaBatches = schemaSQL.split(/\r?\nGO\r?\n/gi);
        for (const batch of schemaBatches) {
            const trimmed = batch.trim();
            if (trimmed && !trimmed.startsWith('--')) {
                await pool.request().query(trimmed);
            }
        }
        console.log('✅ Payroll schema created successfully\n');

        // Read and execute procedures file
        console.log('📄 Reading payroll procedures file...');
        const proceduresPath = path.join(__dirname, '../database/payroll-procedures.sql');
        const proceduresSQL = await fs.readFile(proceduresPath, 'utf8');
        
        console.log('⚙️  Executing payroll stored procedures...');
        const procedureBatches = proceduresSQL.split(/\r?\nGO\r?\n/gi);
        for (const batch of procedureBatches) {
            const trimmed = batch.trim();
            if (trimmed && !trimmed.startsWith('--')) {
                await pool.request().query(trimmed);
            }
        }
        console.log('✅ Payroll stored procedures created successfully\n');

        // Verify setup
        console.log('🔍 Verifying payroll setup...');
        
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME IN ('Payroll', 'PayrollComponents', 'PayrollDetails')
            ORDER BY TABLE_NAME
        `);
        
        console.log('\n📊 Created Tables:');
        tablesResult.recordset.forEach(row => {
            console.log(`   ✓ ${row.TABLE_NAME}`);
        });

        const componentsResult = await pool.request().query(`
            SELECT COUNT(*) as Count FROM PayrollComponents WHERE IsActive = 1
        `);
        console.log(`\n💼 Payroll Components: ${componentsResult.recordset[0].Count} active components`);

        const proceduresResult = await pool.request().query(`
            SELECT ROUTINE_NAME 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_TYPE = 'PROCEDURE' 
            AND ROUTINE_NAME LIKE 'sp_%Payroll%'
            ORDER BY ROUTINE_NAME
        `);
        
        console.log('\n⚙️  Created Stored Procedures:');
        proceduresResult.recordset.forEach(row => {
            console.log(`   ✓ ${row.ROUTINE_NAME}`);
        });

        console.log('\n' + '='.repeat(50));
        console.log('✅ PAYROLL DATABASE SETUP COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(50));
        console.log('\n📝 Next Steps:');
        console.log('   1. Restart the backend server (npm run dev)');
        console.log('   2. Navigate to http://localhost:8080/pages/payroll.html');
        console.log('   3. Generate payroll for employees\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error setting up payroll database:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run setup
setupPayrollDatabase();
