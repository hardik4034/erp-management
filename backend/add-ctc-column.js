const { getConnection } = require('./config/database');

async function addCTCColumn() {
    try {
        console.log('🔧 Adding CTC column to Payroll table...\n');
        const pool = await getConnection();

        // Check if column already exists
        const checkResult = await pool.request().query(`
            SELECT COUNT(*) as ColumnExists
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Payroll' AND COLUMN_NAME = 'CTC'
        `);

        if (checkResult.recordset[0].ColumnExists > 0) {
            console.log('✅ CTC column already exists!');
        } else {
            console.log('Adding CTC computed column...');
            
            await pool.request().query(`
                ALTER TABLE Payroll
                ADD CTC AS (BaseSalary + TotalEarnings) PERSISTED
            `);
            
            console.log('✅ CTC column added successfully!');
        }

        // Verify the column
        const verifyResult = await pool.request().query(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Payroll' AND COLUMN_NAME = 'CTC'
        `);

        if (verifyResult.recordset.length > 0) {
            console.log('\n📋 Column details:');
            console.log(`   Name: ${verifyResult.recordset[0].COLUMN_NAME}`);
            console.log(`   Type: ${verifyResult.recordset[0].DATA_TYPE}`);
            console.log(`   Computed: Yes (BaseSalary + TotalEarnings)`);
        }

        // Show sample data
        console.log('\n📊 Sample payroll data with CTC:');
        const sampleResult = await pool.request().query(`
            SELECT TOP 5
                p.PayrollId,
                e.FirstName + ' ' + e.LastName as EmployeeName,
                p.BaseSalary,
                p.TotalEarnings,
                p.CTC,
                p.NetSalary
            FROM Payroll p
            JOIN Employees e ON p.EmployeeId = e.EmployeeId
            ORDER BY p.PayrollId DESC
        `);

        if (sampleResult.recordset.length > 0) {
            sampleResult.recordset.forEach(r => {
                console.log(`\n   ${r.EmployeeName}:`);
                console.log(`   - Base Salary: $${parseFloat(r.BaseSalary).toFixed(2)}`);
                console.log(`   - Total Earnings: $${parseFloat(r.TotalEarnings).toFixed(2)}`);
                console.log(`   - CTC: $${parseFloat(r.CTC).toFixed(2)}`);
                console.log(`   - Net Salary: $${parseFloat(r.NetSalary).toFixed(2)}`);
            });
        } else {
            console.log('   No payroll records found yet.');
        }

        console.log('\n✅ Database schema updated!');
        console.log('🌐 Refresh your browser to see the changes\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

addCTCColumn();
