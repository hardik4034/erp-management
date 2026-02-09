const sql = require('mssql');
const { getConnection } = require('./config/database');

async function checkPayrollSetup() {
    try {
        console.log('Checking payroll setup...\n');
        
        const pool = await getConnection();
        
        // Check if Payroll table exists
        const tableCheck = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME IN ('Payroll', 'PayrollDetails', 'PayrollComponents')
        `);
        
        console.log('Tables found:');
        tableCheck.recordset.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`));
        console.log('');
        
        // Check if stored procedures exist
        const spCheck = await pool.request().query(`
            SELECT ROUTINE_NAME 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_TYPE = 'PROCEDURE' 
            AND ROUTINE_NAME IN (
                'sp_GeneratePayroll',
                'sp_GetAllPayroll',
                'sp_GetPayrollById',
                'sp_CreatePayroll',
                'sp_CalculateAttendanceForPeriod'
            )
        `);
        
        console.log('Stored Procedures found:');
        spCheck.recordset.forEach(sp => console.log(`  ✓ ${sp.ROUTINE_NAME}`));
        console.log('');
        
        // Check if PayrollComponents have data
        const componentsCheck = await pool.request().query(`
            SELECT COUNT(*) as Count FROM PayrollComponents WHERE IsActive = 1
        `);
        
        console.log(`Active Payroll Components: ${componentsCheck.recordset[0].Count}`);
        
        // Check if any employees have salary configured
        const salaryCheck = await pool.request().query(`
            SELECT COUNT(*) as Count FROM Employees WHERE Salary IS NOT NULL AND Salary > 0
        `);
        
        console.log(`Employees with salary configured: ${salaryCheck.recordset[0].Count}`);
        console.log('');
        
        // Test a simple query
        console.log('Testing sp_GetAllPayroll...');
        const testResult = await pool.request()
            .input('EmployeeId', sql.Int, null)
            .input('Status', sql.NVarChar(20), null)
            .input('FromDate', sql.Date, null)
            .input('ToDate', sql.Date, null)
            .input('Year', sql.Int, null)
            .input('Month', sql.Int, null)
            .input('SalaryCycle', sql.NVarChar(20), null)
            .execute('sp_GetAllPayroll');
        
        console.log(`  ✓ sp_GetAllPayroll executed successfully (${testResult.recordset.length} records)`);
        
        console.log('\n✅ Payroll setup check complete!');
        
    } catch (error) {
        console.error('❌ Error during setup check:', error.message);
        console.error('Full error:', error);
    } finally {
        process.exit();
    }
}

checkPayrollSetup();
