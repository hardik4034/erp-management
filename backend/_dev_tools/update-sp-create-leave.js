const sql = require('mssql');
const { getConnection } = require('../config/database');

async function updateSpCreateLeave() {
    try {
        console.log('🔄 Updating sp_CreateLeave stored procedure...');
        
        const pool = await getConnection();
        
        const sqlScript = `
CREATE OR ALTER PROCEDURE sp_CreateLeave
    @EmployeeId INT,
    @LeaveTypeId INT,
    @FromDate DATE,
    @ToDate DATE,
    @Reason NVARCHAR(500),
    @Status NVARCHAR(20) = 'Pending'
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO Leaves (
        EmployeeId, 
        LeaveTypeId, 
        FromDate, 
        ToDate, 
        Reason, 
        Status, 
        CreatedAt, 
        UpdatedAt
    )
    VALUES (
        @EmployeeId, 
        @LeaveTypeId, 
        @FromDate, 
        @ToDate, 
        @Reason, 
        @Status, 
        GETDATE(), 
        GETDATE()
    );
    
    SELECT * FROM Leaves WHERE LeaveId = SCOPE_IDENTITY();
END
`;

        await pool.request().query(sqlScript);
        
        console.log('✅ Stored procedure sp_CreateLeave updated successfully!');
        console.log('✅ Added @Status parameter with default value "Pending"');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating stored procedure:', error);
        process.exit(1);
    }
}

updateSpCreateLeave();
