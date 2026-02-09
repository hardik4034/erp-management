const sql = require('mssql');
const { getConnection } = require('./config/database');
const fs = require('fs').promises;
const path = require('path');

async function setupAllDatabases() {
    try {
        console.log('🚀 Starting Complete Database Setup...\n');

        const pool = await getConnection();
        console.log('✅ Database connection established\n');

        // Array of SQL files to execute in order
        const sqlFiles = [
            { name: 'Payroll Schema', path: '../database/payroll-schema.sql' },
            { name: 'Payroll Procedures', path: '../database/payroll-procedures.sql' },
            { name: 'Employee Salary Schema', path: '../database/employee-salary-schema.sql' },
            { name: 'Employee Salary Procedures', path: '../database/employee-salary-procedures.sql' }
        ];

        for (const file of sqlFiles) {
            try {
                console.log(`📄 Reading ${file.name}...`);
                const filePath = path.join(__dirname, file.path);
                const sqlContent = await fs.readFile(filePath, 'utf8');
                
                console.log(`⚙️  Executing ${file.name}...`);
                
                // Split by GO statements and execute each batch
                const batches = sqlContent.split(/\r?\nGO\r?\n/gi);
                for (const batch of batches) {
                    const trimmed = batch.trim();
                    if (trimmed && !trimmed.startsWith('--')) {
                        await pool.request().query(trimmed);
                    }
                }
                
                console.log(`✅ ${file.name} executed successfully\n`);
            } catch (error) {
                console.error(`❌ Error executing ${file.name}:`, error.message);
                // Continue with next file
            }
        }

        // Verify setup
        console.log('🔍 Verifying database setup...\n');
        
        // Check tables
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME IN ('Payroll', 'PayrollComponents', 'PayrollDetails', 'SalaryGroups', 'EmployeeSalary')
            ORDER BY TABLE_NAME
        `);
        
        console.log('📊 Created Tables:');
        tablesResult.recordset.forEach(row => {
            console.log(`   ✓ ${row.TABLE_NAME}`);
        });

        // Check stored procedures
        const proceduresResult = await pool.request().query(`
            SELECT ROUTINE_NAME 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_TYPE = 'PROCEDURE' 
            AND (ROUTINE_NAME LIKE 'sp_%Payroll%' OR ROUTINE_NAME LIKE 'sp_%Salary%')
            ORDER BY ROUTINE_NAME
        `);
        
        console.log(`\n⚙️  Created Stored Procedures (${proceduresResult.recordset.length}):`);
        proceduresResult.recordset.forEach(row => {
            console.log(`   ✓ ${row.ROUTINE_NAME}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ DATABASE SETUP COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('\n📝 Next Steps:');
        console.log('   1. Restart the backend server (it should auto-restart)');
        console.log('   2. Refresh your browser pages');
        console.log('   3. Start using Payroll and Employee Salary features!\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error setting up databases:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run setup
setupAllDatabases();
