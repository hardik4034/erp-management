const sql = require('mssql');
const { getConnection } = require('./config/database');

async function diagnosePayrollIssue() {
    try {
        const pool = await getConnection();
        
        // Check PayrollComponents
        console.log('=== Checking PayrollComponents ===');
        const components = await pool.request().query(`
            SELECT ComponentId, ComponentName, ComponentType, CalculationType, DefaultValue, IsActive
            FROM PayrollComponents
            WHERE IsActive = 1
            ORDER BY ComponentType, ComponentName
        `);
        
        console.log(`Found ${components.recordset.length} active components:`);
        components.recordset.forEach(c => {
            console.log(`  - ${c.ComponentType}: ${c.ComponentName} (${c.CalculationType}, ${c.DefaultValue})`);
        });
        
        // Check if any employees have salary
        console.log('\n=== Checking Employees with Salary ===');
        const employees = await pool.request().query(`
            SELECT TOP 3 EmployeeId, FirstName, LastName, EmployeeCode, Salary
            FROM Employees
            WHERE Salary IS NOT NULL AND Salary > 0
        `);
        
        console.log(`Found ${employees.recordset.length} employees with salary:`);
        employees.recordset.forEach(e => {
            console.log(`  - ${e.FirstName} ${e.LastName} (${e.EmployeeCode}): $${e.Salary}`);
        });
        
        if (employees.recordset.length > 0) {
            const testEmp = employees.recordset[0];
            const baseSalary = testEmp.Salary;
            
            console.log(`\n=== Testing Component Calculation for ${testEmp.FirstName} ===`);
            console.log(`Base Salary: $${baseSalary}`);
            
            // Test the CASE statement logic
            const testCalc = await pool.request().query(`
                SELECT 
                    ComponentId,
                    ComponentName,
                    ComponentType,
                    CalculationType,
                    DefaultValue,
                    CASE 
                        WHEN CalculationType = 'Fixed' THEN DefaultValue
                        WHEN CalculationType = 'Percentage' THEN (${baseSalary} * DefaultValue / 100)
                        ELSE NULL
                    END AS CalculatedAmount
                FROM PayrollComponents
                WHERE ComponentType = 'Earning' AND IsActive = 1
            `);
            
            console.log('\nEarnings Calculation:');
            testCalc.recordset.forEach(c => {
                console.log(`  - ${c.ComponentName}: $${c.CalculatedAmount}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
    } finally {
        process.exit();
    }
}

diagnosePayrollIssue();
