const { getConnection } = require('./config/database');

async function testStoredProcedures() {
    try {
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();
        
        console.log('\n📋 Testing sp_GetAllEmployees...');
        const employeesResult = await pool.request().execute('sp_GetAllEmployees');
        console.log(`✅ Found ${employeesResult.recordset.length} employees`);
        if (employeesResult.recordset.length > 0) {
            console.log('   Sample:', employeesResult.recordset[0].FirstName, employeesResult.recordset[0].LastName);
        }
        
        console.log('\n📋 Testing sp_GetAllNotes...');
        const notesResult = await pool.request()
            .input('EmployeeId', pool.sql.Int, null)
            .execute('sp_GetAllNotes');
        console.log(`✅ Found ${notesResult.recordset.length} notes`);
        
        console.log('\n✅ All stored procedures are working!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testStoredProcedures();
