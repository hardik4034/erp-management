const { getConnection } = require('../config/database');

async function setupEmployeeExitDetails() {
    try {
        console.log('🔌 Connecting to database...');
        const pool = await getConnection();

        // 1. Create EmployeeExitDetails table
        const tableSql = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EmployeeExitDetails' AND xtype='U')
            BEGIN
                CREATE TABLE EmployeeExitDetails (
                    EmployeeId INT PRIMARY KEY FOREIGN KEY REFERENCES Employees(EmployeeId),
                    ResignationLetterDate DATE NULL,
                    RelievingDate DATE NULL,
                    ExitInterviewDate DATE NULL,
                    LeaveEncased NVARCHAR(50) NULL,
                    NewWorkplace NVARCHAR(255) NULL,
                    ReasonForLeaving NVARCHAR(MAX) NULL,
                    Feedback NVARCHAR(MAX) NULL,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    UpdatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT '✅ EmployeeExitDetails table created'
            END
            ELSE
            BEGIN
                PRINT 'ℹ️ EmployeeExitDetails table already exists'
            END
        `;
        await pool.request().query(tableSql);

        // 2. Create sp_GetEmployeeExitDetails
        const getSpSql = `
            IF OBJECT_ID('sp_GetEmployeeExitDetails', 'P') IS NOT NULL 
                DROP PROCEDURE sp_GetEmployeeExitDetails;
            
            EXEC('
                CREATE PROCEDURE sp_GetEmployeeExitDetails
                    @EmployeeId INT
                AS
                BEGIN
                    SET NOCOUNT ON;
                    SELECT * FROM EmployeeExitDetails WHERE EmployeeId = @EmployeeId;
                END
            ');
        `;
        await pool.request().query(getSpSql);
        console.log('✅ sp_GetEmployeeExitDetails created');

        // 3. Create sp_SaveEmployeeExitDetails
        const saveSpSql = `
            IF OBJECT_ID('sp_SaveEmployeeExitDetails', 'P') IS NOT NULL 
                DROP PROCEDURE sp_SaveEmployeeExitDetails;
            
            EXEC('
                CREATE PROCEDURE sp_SaveEmployeeExitDetails
                    @EmployeeId INT,
                    @ResignationLetterDate DATE = NULL,
                    @RelievingDate DATE = NULL,
                    @ExitInterviewDate DATE = NULL,
                    @LeaveEncased NVARCHAR(50) = NULL,
                    @NewWorkplace NVARCHAR(255) = NULL,
                    @ReasonForLeaving NVARCHAR(MAX) = NULL,
                    @Feedback NVARCHAR(MAX) = NULL
                AS
                BEGIN
                    SET NOCOUNT ON;
                    
                    IF EXISTS (SELECT 1 FROM EmployeeExitDetails WHERE EmployeeId = @EmployeeId)
                    BEGIN
                        UPDATE EmployeeExitDetails
                        SET ResignationLetterDate = @ResignationLetterDate,
                            RelievingDate = @RelievingDate,
                            ExitInterviewDate = @ExitInterviewDate,
                            LeaveEncased = @LeaveEncased,
                            NewWorkplace = @NewWorkplace,
                            ReasonForLeaving = @ReasonForLeaving,
                            Feedback = @Feedback,
                            UpdatedAt = GETDATE()
                        WHERE EmployeeId = @EmployeeId;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO EmployeeExitDetails (
                            EmployeeId, ResignationLetterDate, RelievingDate, ExitInterviewDate,
                            LeaveEncased, NewWorkplace, ReasonForLeaving, Feedback
                        ) VALUES (
                            @EmployeeId, @ResignationLetterDate, @RelievingDate, @ExitInterviewDate,
                            @LeaveEncased, @NewWorkplace, @ReasonForLeaving, @Feedback
                        );
                    END
                    
                    SELECT * FROM EmployeeExitDetails WHERE EmployeeId = @EmployeeId;
                END
            ');
        `;
        await pool.request().query(saveSpSql);
        console.log('✅ sp_SaveEmployeeExitDetails created');

        console.log('\n🎉 Employee Exit Details schema configured successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up Employee Exit Details:', error.message);
        process.exit(1);
    }
}

setupEmployeeExitDetails();
