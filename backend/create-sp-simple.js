const { getConnection } = require('./config/database');

async function createProceduresSimple() {
    try {
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();
        
        console.log('\n1️⃣ Creating sp_GetAllEmployees...');
        await pool.request().batch(`
            IF OBJECT_ID('sp_GetAllEmployees', 'P') IS NOT NULL 
                DROP PROCEDURE sp_GetAllEmployees
            
            CREATE PROCEDURE sp_GetAllEmployees
            AS
            BEGIN
                SET NOCOUNT ON
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
                ORDER BY e.FirstName, e.LastName
            END
        `);
        console.log('✅ sp_GetAllEmployees created');
        
        console.log('\n2️⃣ Creating sp_GetAllNotes...');
        await pool.request().batch(`
            IF OBJECT_ID('sp_GetAllNotes', 'P') IS NOT NULL 
                DROP PROCEDURE sp_GetAllNotes
            
            CREATE PROCEDURE sp_GetAllNotes
                @EmployeeId INT = NULL
            AS
            BEGIN
                SET NOCOUNT ON
                SELECT 
                    n.NoteId, n.EmployeeId, n.Title, n.Description, n.CreatedAt,
                    e.FirstName, e.LastName, des.DesignationName AS Designation
                FROM Notes n
                INNER JOIN Employees e ON n.EmployeeId = e.EmployeeId
                LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
                WHERE (@EmployeeId IS NULL OR n.EmployeeId = @EmployeeId)
                ORDER BY n.CreatedAt DESC
            END
        `);
        console.log('✅ sp_GetAllNotes created');
        
        console.log('\n3️⃣ Creating sp_CreateNote...');
        await pool.request().batch(`
            IF OBJECT_ID('sp_CreateNote', 'P') IS NOT NULL 
                DROP PROCEDURE sp_CreateNote
            
            CREATE PROCEDURE sp_CreateNote
                @EmployeeId INT,
                @Title NVARCHAR(100),
                @Description NVARCHAR(MAX) = NULL
            AS
            BEGIN
                SET NOCOUNT ON
                INSERT INTO Notes (EmployeeId, Title, Description, CreatedAt)
                VALUES (@EmployeeId, @Title, @Description, GETDATE())
                SELECT SCOPE_IDENTITY() AS NoteId
            END
        `);
        console.log('✅ sp_CreateNote created');
        
        console.log('\n4️⃣ Creating sp_DeleteNote...');
        await pool.request().batch(`
            IF OBJECT_ID('sp_DeleteNote', 'P') IS NOT NULL 
                DROP PROCEDURE sp_DeleteNote
            
            CREATE PROCEDURE sp_DeleteNote
                @NoteId INT
            AS
            BEGIN
                SET NOCOUNT ON
                DELETE FROM Notes WHERE NoteId = @NoteId
                SELECT @@ROWCOUNT AS RowsAffected
            END
        `);
        console.log('✅ sp_DeleteNote created');
        
        console.log('\n🎉 All procedures created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

createProceduresSimple();
