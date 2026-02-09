const { getConnection } = require('./config/database');

async function testEmployeeData() {
    try {
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();
        
        console.log('\n📋 Testing sp_GetAllEmployees...');
        const result = await pool.request().execute('sp_GetAllEmployees');
        
        console.log(`✅ Found ${result.recordset.length} employees\n`);
        
        result.recordset.forEach(emp => {
            console.log(`Employee ID: ${emp.EmployeeId}`);
            console.log(`  Name: ${emp.FirstName} ${emp.LastName}`);
            console.log(`  Email: ${emp.Email}`);
            console.log(`  Designation: ${emp.Designation}`);
            console.log(`  DesignationName: ${emp.DesignationName}`);
            console.log(`  DepartmentName: ${emp.DepartmentName}`);
            console.log('---');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testEmployeeData();
