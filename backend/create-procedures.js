const { getConnection } = require('./config/database');

const procedures = [
    {
        name: 'sp_GetAllEmployees',
        sql: `
            IF OBJECT_ID('sp_GetAllEmployees', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllEmployees;
            EXEC('
            CREATE PROCEDURE sp_GetAllEmployees
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    e.EmployeeId, e.EmployeeCode, e.FirstName, e.LastName, e.Email, e.Phone,
                    e.DateOfJoining, e.DepartmentId, d.DepartmentName, e.DesignationId,
                    des.DesignationName AS Designation, e.ReportingTo,
                    CASE WHEN r.FirstName IS NOT NULL THEN r.FirstName + '' '' + r.LastName ELSE NULL END AS ReportingToName,
                    e.Status, e.ProfilePicture
                FROM Employees e
                LEFT JOIN Departments d ON e.DepartmentId = d.DepartmentId
                LEFT JOIN Designations des ON e.DesignationId = des.DesignationId
                LEFT JOIN Employees r ON e.ReportingTo = r.EmployeeId
                WHERE e.IsDeleted = 0
                ORDER BY e.FirstName, e.LastName;
            END');
        `
    },
    {
        name: 'sp_GetAllNotes',
        sql: `
            IF OBJECT_ID('sp_GetAllNotes', 'P') IS NOT NULL DROP PROCEDURE sp_GetAllNotes;
            EXEC('
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
            END');
        `
    },
    {
        name: 'sp_CreateNote',
        sql: `
            IF OBJECT_ID('sp_CreateNote', 'P') IS NOT NULL DROP PROCEDURE sp_CreateNote;
            EXEC('
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
            END');
        `
    },
    {
        name: 'sp_DeleteNote',
        sql: `
            IF OBJECT_ID('sp_DeleteNote', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteNote;
            EXEC('
            CREATE PROCEDURE sp_DeleteNote
                @NoteId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                DELETE FROM Notes WHERE NoteId = @NoteId;
                SELECT @@ROWCOUNT AS RowsAffected;
            END');
        `
    }
];

async function createProcedures() {
    try {
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();
        
        for (const proc of procedures) {
            console.log(`\n📝 Creating ${proc.name}...`);
            try {
                await pool.request().query(proc.sql);
                console.log(`✅ ${proc.name} created successfully`);
            } catch (err) {
                console.error(`❌ ${proc.name} failed:`, err.message);
            }
        }
        
        console.log('\n🎉 All procedures created!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

createProcedures();
