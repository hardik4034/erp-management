const sql = require('mssql');
const { getConnection } = require('./config/database');

async function checkPayrollRecords() {
    try {
        const pool = await getConnection();
        
        console.log('=== Checking Payroll Records ===\n');
        
        // Check total payroll records
        const countResult = await pool.request().query(`
            SELECT COUNT(*) as TotalRecords FROM Payroll
        `);
        
        console.log(`Total Payroll Records: ${countResult.recordset[0].TotalRecords}`);
        
        if (countResult.recordset[0].TotalRecords > 0) {
            // Get sample records
            const records = await pool.request().query(`
                SELECT TOP 5
                    p.PayrollId,
                    p.EmployeeId,
                    e.FirstName,
                    e.LastName,
                    e.EmployeeCode,
                    p.PayPeriodStart,
                    p.PayPeriodEnd,
                    p.PayDate,
                    p.BaseSalary,
                    p.NetSalary,
                    p.Status
                FROM Payroll p
                JOIN Employees e ON p.EmployeeId = e.EmployeeId
                ORDER BY p.CreatedAt DESC
            `);
            
            console.log('\nSample Payroll Records:');
            records.recordset.forEach(r => {
                console.log(`  - ${r.FirstName} ${r.LastName} (${r.EmployeeCode})`);
                console.log(`    Period: ${r.PayPeriodStart.toISOString().split('T')[0]} to ${r.PayPeriodEnd.toISOString().split('T')[0]}`);
                console.log(`    Net Salary: $${r.NetSalary}, Status: ${r.Status}`);
                console.log('');
            });
            
            // Test the sp_GetAllPayroll procedure
            console.log('=== Testing sp_GetAllPayroll ===\n');
            const spResult = await pool.request()
                .input('EmployeeId', sql.Int, null)
                .input('Status', sql.NVarChar(20), null)
                .input('FromDate', sql.Date, null)
                .input('ToDate', sql.Date, null)
                .input('Year', sql.Int, null)
                .input('Month', sql.Int, null)
                .input('SalaryCycle', sql.NVarChar(20), null)
                .execute('sp_GetAllPayroll');
            
            console.log(`sp_GetAllPayroll returned ${spResult.recordset.length} records`);
            
            if (spResult.recordset.length > 0) {
                console.log('\nFirst record from sp_GetAllPayroll:');
                const first = spResult.recordset[0];
                console.log(JSON.stringify(first, null, 2));
            }
        } else {
            console.log('\nNo payroll records found in database.');
            console.log('You need to generate payroll first.');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
    } finally {
        process.exit();
    }
}

checkPayrollRecords();
