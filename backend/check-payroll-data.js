const { getConnection } = require('./config/database');

async function checkPayrollData() {
    try {
        const pool = await getConnection();

        console.log('\n📊 CURRENT PAYROLL DATA\n');
        console.log('='.repeat(80));

        // Get payroll records with employee details
        const result = await pool.request().query(`
            SELECT TOP 10
                p.PayrollId,
                e.EmployeeCode,
                e.FirstName,
                e.LastName,
                p.BaseSalary,
                p.TotalEarnings,
                p.TotalDeductions,
                p.NetSalary,
                p.CTC,
                p.PayPeriodStart,
                p.PayPeriodEnd,
                p.PayDate,
                p.Status
            FROM Payroll p
            JOIN Employees e ON p.EmployeeId = e.EmployeeId
            ORDER BY p.PayrollId DESC
        `);

        if (result.recordset.length === 0) {
            console.log('❌ No payroll records found!\n');
            console.log('To create payroll data:');
            console.log('1. Make sure employees have salary configured (Employee Salary page)');
            console.log('2. Use the "Generate Payroll" section on the Payroll page');
            console.log('3. Or run: node setup-payroll-data.js\n');
        } else {
            console.log(`✅ Found ${result.recordset.length} payroll records:\n`);
            
            result.recordset.forEach((p, index) => {
                console.log(`${index + 1}. ${p.FirstName} ${p.LastName} (${p.EmployeeCode})`);
                console.log(`   Period: ${p.PayPeriodStart.toISOString().split('T')[0]} to ${p.PayPeriodEnd.toISOString().split('T')[0]}`);
                console.log(`   Base Salary: $${parseFloat(p.BaseSalary).toFixed(2)}`);
                console.log(`   Total Earnings: $${parseFloat(p.TotalEarnings).toFixed(2)}`);
                console.log(`   Total Deductions: $${parseFloat(p.TotalDeductions).toFixed(2)}`);
                console.log(`   Net Salary: $${parseFloat(p.NetSalary).toFixed(2)}`);
                console.log(`   CTC: $${p.CTC ? parseFloat(p.CTC).toFixed(2) : 'N/A'}`);
                console.log(`   Status: ${p.Status}`);
                console.log('');
            });
        }

        console.log('='.repeat(80));
        console.log('\n✅ Check complete!');
        console.log('🌐 Open: http://localhost:8080/pages/payroll.html\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkPayrollData();
