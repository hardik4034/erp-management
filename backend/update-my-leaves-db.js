const sql = require('mssql');
const { getConnection } = require('./config/database');

async function updateDatabase() {
    try {
        console.log('Connecting to database...');
        const pool = await getConnection();
        
        // Add MonthlyLimit column if it doesn't exist
        console.log('Adding MonthlyLimit column to LeaveTypes table...');
        try {
            await pool.request().query(`
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('LeaveTypes') 
                    AND name = 'MonthlyLimit'
                )
                BEGIN
                    ALTER TABLE LeaveTypes ADD MonthlyLimit INT NULL;
                    PRINT 'MonthlyLimit column added successfully';
                END
                ELSE
                BEGIN
                    PRINT 'MonthlyLimit column already exists';
                END
            `);
            console.log('✓ MonthlyLimit column check complete');
        } catch (err) {
            if (err.message.includes('already exists')) {
                console.log('✓ MonthlyLimit column already exists');
            } else {
                throw err;
            }
        }
        
        // Update stored procedure
        console.log('Updating sp_GetLeaveBalance stored procedure...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE sp_GetLeaveBalance
                @EmployeeId INT
            AS
            BEGIN
                SELECT 
                    lt.LeaveTypeId,
                    lt.TypeName,
                    lt.MaxDaysPerYear,
                    lt.MonthlyLimit,
                    ISNULL(SUM(CASE 
                        WHEN l.Status = 'Approved' 
                        THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                        ELSE 0 
                    END), 0) AS TotalTaken,
                    lt.MaxDaysPerYear - ISNULL(SUM(CASE 
                        WHEN l.Status = 'Approved' 
                        THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                        ELSE 0 
                    END), 0) AS RemainingDays,
                    CASE 
                        WHEN ISNULL(SUM(CASE 
                            WHEN l.Status = 'Approved' 
                            THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                            ELSE 0 
                        END), 0) > lt.MaxDaysPerYear 
                        THEN ISNULL(SUM(CASE 
                            WHEN l.Status = 'Approved' 
                            THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                            ELSE 0 
                        END), 0) - lt.MaxDaysPerYear
                        ELSE 0 
                    END AS OverUtilized,
                    CASE 
                        WHEN lt.MaxDaysPerYear - ISNULL(SUM(CASE 
                            WHEN l.Status = 'Approved' 
                            THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                            ELSE 0 
                        END), 0) > 0 
                        THEN lt.MaxDaysPerYear - ISNULL(SUM(CASE 
                            WHEN l.Status = 'Approved' 
                            THEN DATEDIFF(DAY, l.FromDate, l.ToDate) + 1 
                            ELSE 0 
                        END), 0)
                        ELSE 0 
                    END AS UnusedLeaves
                FROM LeaveTypes lt
                LEFT JOIN Leaves l ON lt.LeaveTypeId = l.LeaveTypeId 
                    AND l.EmployeeId = @EmployeeId 
                    AND l.Status = 'Approved'
                    AND YEAR(l.FromDate) = YEAR(GETDATE())
                WHERE lt.Status = 'Active'
                GROUP BY lt.LeaveTypeId, lt.TypeName, lt.MaxDaysPerYear, lt.MonthlyLimit;
            END
        `);
        console.log('✓ Stored procedure updated successfully');
        
        console.log('\n✅ Database update completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating database:', error.message);
        process.exit(1);
    }
}

updateDatabase();
