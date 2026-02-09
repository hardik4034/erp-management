const { getConnection } = require('./config/database');

async function setupPayrollData() {
    try {
        console.log('🔍 Checking payroll setup...\n');
        const pool = await getConnection();

        // 1. Check if employees exist
        console.log('1️⃣ Checking employees...');
        const employeesResult = await pool.request().query(`
            SELECT 
                EmployeeId,
                EmployeeCode,
                FirstName,
                LastName,
                Email,
                Salary,
                SalaryType
            FROM Employees
        `);

        if (employeesResult.recordset.length === 0) {
            console.log('❌ No employees found in database!');
            console.log('   Please add employees first from the Employees page.');
            process.exit(1);
        }

        console.log(`✅ Found ${employeesResult.recordset.length} employees`);
        
        // Show employees with/without salary
        const withSalary = employeesResult.recordset.filter(e => e.Salary && e.Salary > 0);
        const withoutSalary = employeesResult.recordset.filter(e => !e.Salary || e.Salary === 0);
        
        console.log(`   - ${withSalary.length} with salary configured`);
        console.log(`   - ${withoutSalary.length} without salary\n`);

        if (withSalary.length > 0) {
            console.log('Employees with salary:');
            withSalary.forEach(e => {
                console.log(`   • ${e.FirstName} ${e.LastName} (${e.EmployeeCode}): $${e.Salary} ${e.SalaryType || 'Monthly'}`);
            });
            console.log('');
        }

        if (withoutSalary.length > 0) {
            console.log('⚠️  Employees WITHOUT salary (need to configure):');
            withoutSalary.forEach(e => {
                console.log(`   • ${e.FirstName} ${e.LastName} (${e.EmployeeCode})`);
            });
            console.log('');
        }

        // 2. Check payroll components
        console.log('2️⃣ Checking payroll components...');
        const componentsResult = await pool.request().query(`
            SELECT ComponentType, COUNT(*) as Count
            FROM PayrollComponents
            WHERE IsActive = 1
            GROUP BY ComponentType
        `);

        if (componentsResult.recordset.length === 0) {
            console.log('❌ No payroll components found!');
            console.log('   Running setup to create default components...\n');
            
            // Insert default components
            await pool.request().query(`
                INSERT INTO PayrollComponents (ComponentName, ComponentType, CalculationType, DefaultValue, Description) VALUES 
                -- Earnings
                ('Basic Salary', 'Earning', 'Fixed', 0, 'Base salary amount'),
                ('HRA (House Rent Allowance)', 'Earning', 'Percentage', 40, '40% of Basic Salary'),
                ('Transport Allowance', 'Earning', 'Fixed', 1600, 'Fixed transport allowance'),
                ('Medical Allowance', 'Earning', 'Fixed', 1250, 'Fixed medical allowance'),
                ('Special Allowance', 'Earning', 'Percentage', 10, '10% of Basic Salary'),
                ('Performance Bonus', 'Earning', 'Fixed', 0, 'Performance-based bonus'),
                ('Overtime Pay', 'Earning', 'Fixed', 0, 'Overtime compensation'),
                
                -- Deductions
                ('Provident Fund (PF)', 'Deduction', 'Percentage', 12, '12% of Basic Salary'),
                ('Professional Tax', 'Deduction', 'Fixed', 200, 'Professional tax deduction'),
                ('Income Tax (TDS)', 'Deduction', 'Percentage', 10, 'Tax deducted at source'),
                ('Insurance Premium', 'Deduction', 'Fixed', 500, 'Health insurance premium'),
                ('Loan Repayment', 'Deduction', 'Fixed', 0, 'Employee loan repayment'),
                ('Other Deductions', 'Deduction', 'Fixed', 0, 'Miscellaneous deductions')
            `);
            console.log('✅ Created default payroll components\n');
        } else {
            console.log('✅ Payroll components configured:');
            componentsResult.recordset.forEach(c => {
                console.log(`   - ${c.ComponentType}s: ${c.Count}`);
            });
            console.log('');
        }

        // 3. Check existing payroll records
        console.log('3️⃣ Checking existing payroll records...');
        const payrollResult = await pool.request().query(`
            SELECT COUNT(*) as Count FROM Payroll
        `);

        console.log(`✅ Found ${payrollResult.recordset[0].Count} existing payroll records\n`);

        // 4. Offer to generate sample payroll
        if (withSalary.length > 0) {
            console.log('4️⃣ Generating sample payroll for January 2026...');
            
            let successCount = 0;
            let errorCount = 0;

            for (const employee of withSalary) {
                try {
                    await pool.request()
                        .input('EmployeeId', employee.EmployeeId)
                        .input('PayPeriodStart', '2026-01-01')
                        .input('PayPeriodEnd', '2026-01-31')
                        .input('PayDate', '2026-01-31')
                        .input('IncludeExpenseClaims', false)
                        .input('AddSewerageToSalary', false)
                        .input('UseAttendance', false)
                        .execute('sp_GeneratePayroll');
                    
                    successCount++;
                    console.log(`   ✅ Generated payroll for ${employee.FirstName} ${employee.LastName}`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log(`   ⚠️  Payroll already exists for ${employee.FirstName} ${employee.LastName}`);
                    } else {
                        errorCount++;
                        console.log(`   ❌ Error for ${employee.FirstName} ${employee.LastName}: ${error.message}`);
                    }
                }
            }

            console.log(`\n✅ Payroll generation complete!`);
            console.log(`   - Success: ${successCount}`);
            if (errorCount > 0) {
                console.log(`   - Errors: ${errorCount}`);
            }
        } else {
            console.log('⚠️  Cannot generate payroll - no employees with salary configured');
            console.log('\n📝 To fix this:');
            console.log('   1. Go to Employee Salary page');
            console.log('   2. Configure salary for your employees');
            console.log('   3. Then come back to Payroll page and generate payroll');
        }

        // 5. Show final summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        
        const finalPayrollCount = await pool.request().query(`
            SELECT COUNT(*) as Count FROM Payroll
        `);
        
        const finalEmployeesWithPayroll = await pool.request().query(`
            SELECT COUNT(DISTINCT EmployeeId) as Count FROM Payroll
        `);

        console.log(`Total Employees: ${employeesResult.recordset.length}`);
        console.log(`Employees with Salary: ${withSalary.length}`);
        console.log(`Total Payroll Records: ${finalPayrollCount.recordset[0].Count}`);
        console.log(`Employees with Payroll: ${finalEmployeesWithPayroll.recordset[0].Count}`);
        console.log('='.repeat(60));

        console.log('\n✅ Setup complete!');
        console.log('🌐 Refresh your browser to see the payroll data');
        console.log('   URL: http://localhost:8080/pages/payroll.html\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

setupPayrollData();
