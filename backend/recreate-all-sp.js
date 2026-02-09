const { getConnection } = require('./config/database');

async function recreateAllProcedures() {
    try {
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();
        
        // List all stored procedures first
        console.log('\n📋 Checking existing procedures...');
        const existing = await pool.request().query(`
            SELECT name FROM sys.procedures WHERE name LIKE 'sp_%'
        `);
        console.log('Existing procedures:', existing.recordset.map(p => p.name).join(', ') || 'None');
        
        // Create each procedure separately
        const procedures = [
            {
                name: 'sp_GetAllEmployees',
                drop: `IF OBJECT_ID('sp_GetAllEmployees', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllEmployees;`,
                create: `
                    CREATE PROCEDURE sp_GetAllEmployees
                    AS
                    BEGIN
                        SET NOCOUNT ON;
                        SELECT 
                            e.EmployeeId, e.EmployeeCode, e.FirstName, e.LastName, e.Email, e.Phone,
                            e.DateOfJoining, e.DepartmentId, d.DepartmentName, e.DesignationId,
                            des.DesignationName AS Designation, e.ReportingTo,
                            CASE WHEN r.FirstName IS NOT NULL THEN r.FirstName + ' ' + r.LastName ELSE NULL END AS ReportingToName,
                            e.Status, e.ProfilePicture
                        FROM Employees e
                        LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
                        LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
                        LEFT JOIN Employees r ON e.ReportingTo = r.EmployeeId
                        WHERE e.IsDeleted = 0
                        ORDER BY e.FirstName, e.LastName;
                    END
                `
            },
            {
                name: 'sp_GetAllNotes',
                drop: `IF OBJECT_ID('sp_GetAllNotes', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllNotes;`,
                create: `
                    CREATE PROCEDURE sp_GetAllNotes
                        @EmployeeId INT = NULL
                    AS
                    BEGIN
                        SET NOCOUNT ON;
                        SELECT 
                            n.NoteId, n.EmployeeId, n.Title, n.Description, n.CreatedAt,
                            e.FirstName, e.LastName, des.DesignationName AS Designation
                        FROM Notes n
                        INNER JOIN Employees e ON n.EmployeeId = e.EmployeeId
                        LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
                        WHERE (@EmployeeId IS NULL OR n.EmployeeId = @EmployeeId)
                        ORDER BY n.CreatedAt DESC;
                    END
                `
            },
            {
                name: 'sp_CreateNote',
                drop: `IF OBJECT_ID('sp_CreateNote', 'P') IS NOT NULL DROP PROCEDURE sp_CreateNote;`,
                create: `
                    CREATE PROCEDURE sp_CreateNote
                        @EmployeeId INT,
                        @Title NVARCHAR(100),
                        @Description NVARCHAR(MAX) = NULL
                    AS
                    BEGIN
                        SET NOCOUNT ON;
                        INSERT INTO Notes (EmployeeId, Title, Description, CreatedAt)
                        VALUES (@EmployeeId, @Title, @Description, GETDATE());
                        SELECT SCOPE_IDENTITY() AS NoteId;
                    END
                `
            },
            {
                name: 'sp_DeleteNote',
                drop: `IF OBJECT_ID('sp_DeleteNote', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteNote;`,
                create: `
                    CREATE PROCEDURE sp_DeleteNote
                        @NoteId INT
                    AS
                    BEGIN
                        SET NOCOUNT ON;
                        DELETE FROM Notes WHERE NoteId = @NoteId;
                        SELECT @@ROWCOUNT AS RowsAffected;
                    END
                `
            }
        ];
        
        for (const proc of procedures) {
            console.log(`\n📝 Creating ${proc.name}...`);
            try {
                // Drop if exists
                await pool.request().query(proc.drop);
                // Create new
                await pool.request().query(proc.create);
                console.log(`✅ ${proc.name} created successfully`);
            } catch (err) {
                console.error(`❌ ${proc.name} failed:`, err.message);
                throw err;
            }
        }
        
        console.log('\n🎉 All procedures created successfully!');
        
        // Verify
        console.log('\n🧪 Verifying procedures...');
        const final = await pool.request().query(`
            SELECT name FROM sys.procedures WHERE name LIKE 'sp_%' ORDER BY name
        `);
        console.log('Final procedures:', final.recordset.map(p => p.name).join(', '));
        
        // Test sp_GetAllEmployees
        console.log('\n📋 Testing sp_GetAllEmployees...');
        const empResult = await pool.request().execute('sp_GetAllEmployees');
        console.log(`✅ Found ${empResult.recordset.length} employees`);
        if (empResult.recordset.length > 0) {
            const emp = empResult.recordset[0];
            console.log(`   Sample: ${emp.FirstName} ${emp.LastName} - ${emp.Designation || 'No Designation'}`);
        }
        
        console.log('\n✅ Everything is working!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

recreateAllProcedures();
