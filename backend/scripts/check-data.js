const { getConnection, closeConnection } = require('../config/database');

const checkData = async () => {
    try {
        const pool = await getConnection();
        
        console.log('Checking Employees...');
        const empResult = await pool.request().query('SELECT COUNT(*) as count FROM Employees');
        console.log('Employee Count:', empResult.recordset[0].count);
        
        console.log('Checking Departments...');
        const deptResult = await pool.request().query('SELECT COUNT(*) as count FROM Departments');
        console.log('Department Count:', deptResult.recordset[0].count);

        if (empResult.recordset[0].count > 0) {
            const sample = await pool.request().query('SELECT TOP 1 * FROM Employees');
            console.log('Sample Employee Structure:', JSON.stringify(sample.recordset[0], null, 2));
        } else {
            console.log('No employees found in database.');
        }

        if (deptResult.recordset[0].count > 0) {
             const deptSample = await pool.request().query('SELECT TOP 1 * FROM Departments');
             console.log('Sample Department Structure:', JSON.stringify(deptSample.recordset[0], null, 2));
        } else {
            console.log('No departments found in database.');
        }

    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        await closeConnection();
    }
};

checkData();
