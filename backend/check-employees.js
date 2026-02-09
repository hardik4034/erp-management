const { getConnection } = require('./config/database');

async function checkEmployees() {
    try {
        const pool = await getConnection();
        
        // Get all employees
        const result = await pool.request().execute('sp_GetAllEmployees');
        
        console.log(JSON.stringify(result.recordset, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkEmployees();
