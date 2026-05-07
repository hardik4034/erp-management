const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Admin@123',
    server: 'localhost',
    database: 'HRManagement',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function checkLeaves() {
    try {
        await sql.connect(config);
        console.log('Connected to database');
        
        const result = await sql.query`
            SELECT 
                l.LeaveId,
                l.EmployeeId,
                e.FirstName,
                e.LastName,
                l.FromDate,
                l.ToDate,
                l.Status,
                lt.TypeName as LeaveType
            FROM Leaves l
            LEFT JOIN Employees e ON l.EmployeeId = e.EmployeeId
            LEFT JOIN LeaveTypes lt ON l.LeaveTypeId = lt.LeaveTypeId
            ORDER BY l.LeaveId DESC
        `;
        
        console.log('\n=== ALL LEAVES IN DATABASE ===');
        console.log('Total leaves:', result.recordset.length);
        console.log('\nLeave Details:');
        result.recordset.forEach(leave => {
            console.log(`\nLeave ID: ${leave.LeaveId}`);
            console.log(`  Employee ID: ${leave.EmployeeId}`);
            console.log(`  Employee: ${leave.FirstName} ${leave.LastName}`);
            console.log(`  Type: ${leave.LeaveType}`);
            console.log(`  From: ${leave.FromDate}`);
            console.log(`  To: ${leave.ToDate}`);
            console.log(`  Status: ${leave.Status}`);
        });
        
        // Check specifically for Employee ID 2
        const empLeaves = result.recordset.filter(l => l.EmployeeId === 2);
        console.log(`\n=== LEAVES FOR EMPLOYEE ID 2 ===`);
        console.log(`Count: ${empLeaves.length}`);
        
        await sql.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkLeaves();
