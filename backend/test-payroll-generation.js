const sql = require('mssql');
const { getConnection } = require('./config/database');

async function testPayrollGeneration() {
    try {
        console.log('Testing Payroll Generation...\n');
        
        const pool = await getConnection();
        
        // 1. Check if sp_GeneratePayroll exists
        console.log('1. Checking if sp_GeneratePayroll exists...');
        const spCheck = await pool.request().query(`
            SELECT ROUTINE_NAME 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_TYPE = 'PROCEDURE' 
            AND ROUTINE_NAME = 'sp_GeneratePayroll'
        `);
        
        if (spCheck.recordset.length === 0) {
            console.log('   ❌ sp_GeneratePayroll NOT FOUND!');
            console.log('   You need to run the payroll-procedures.sql script');
            return;
        }
        console.log('   ✓ sp_GeneratePayroll exists');
        
        // 2. Check for employees with salary
        console.log('\n2. Checking for employees with salary...');
        const empCheck = await pool.request().query(`
            SELECT TOP 5 EmployeeId, FirstName, LastName, EmployeeCode, Salary 
            FROM Employees 
            WHERE Salary IS NOT NULL AND Salary > 0
        `);
        
        if (empCheck.recordset.length === 0) {
            console.log('   ❌ No employees with salary configured!');
            console.log('   You need to set salary for employees first');
            return;
        }
        
        console.log('   ✓ Found employees with salary:');
        empCheck.recordset.forEach(e => {
            console.log(`     - ${e.FirstName} ${e.LastName} (${e.EmployeeCode}): $${e.Salary}`);
        });
        
        // 3. Try to generate payroll for first employee
        const testEmployee = empCheck.recordset[0];
        console.log(`\n3. Testing payroll generation for ${testEmployee.FirstName} ${testEmployee.LastName}...`);
        
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        console.log(`   Pay Period: ${firstDay.toISOString().split('T')[0]} to ${lastDay.toISOString().split('T')[0]}`);
        
        try {
            const result = await pool.request()
                .input('EmployeeId', sql.Int, testEmployee.EmployeeId)
                .input('PayPeriodStart', sql.Date, firstDay)
                .input('PayPeriodEnd', sql.Date, lastDay)
                .input('PayDate', sql.Date, today)
                .input('IncludeExpenseClaims', sql.Bit, false)
                .input('AddTimerangeToSalary', sql.Bit, false)
                .input('UseAttendance', sql.Bit, true)
                .execute('sp_GeneratePayroll');
            
            console.log('   ✓ Payroll generated successfully!');
            console.log('   PayrollId:', result.recordset[0].PayrollId);
            
        } catch (spError) {
            console.log('   ❌ Error executing sp_GeneratePayroll:');
            console.log('   Error Name:', spError.name);
            console.log('   Error Message:', spError.message);
            console.log('   Error Number:', spError.number);
            console.log('   Procedure Name:', spError.procName);
            console.log('   Line Number:', spError.lineNumber);
            console.log('\n   Full Error:', spError);
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    } finally {
        process.exit();
    }
}

testPayrollGeneration();
