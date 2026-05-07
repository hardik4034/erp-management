require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Soleos@123',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'HRMS',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const recreateQueries = `
    -- Drop existing SPs first
    IF OBJECT_ID('sp_CreateCalendarEvent', 'P') IS NOT NULL DROP PROCEDURE sp_CreateCalendarEvent;
    IF OBJECT_ID('sp_UpdateCalendarEvent', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateCalendarEvent;
    IF OBJECT_ID('sp_DeleteCalendarEvent', 'P') IS NOT NULL DROP PROCEDURE sp_DeleteCalendarEvent;

    -- Drop existing Table
    IF OBJECT_ID('CalendarEvents', 'U') IS NOT NULL DROP TABLE CalendarEvents;

    -- Recreate strictly to specifications
    CREATE TABLE CalendarEvents (
        id INT PRIMARY KEY IDENTITY(1,1),
        title VARCHAR(200) NOT NULL,
        description VARCHAR(1000) NULL,
        event_date DATE NOT NULL,
        event_time TIME NULL,
        event_type VARCHAR(50) NOT NULL,
        color VARCHAR(20) NULL,
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME NULL,
        FOREIGN KEY (created_by) REFERENCES Employees(EmployeeId)
    );

    -- Print success
    PRINT 'Table created';
`;

const spQueries = `
    CREATE PROCEDURE sp_CreateCalendarEvent
        @Title VARCHAR(200),
        @Description VARCHAR(1000),
        @EventDate DATE,
        @EventTime TIME,
        @EventType VARCHAR(50),
        @Color VARCHAR(20),
        @CreatedBy INT
    AS
    BEGIN
        INSERT INTO CalendarEvents (title, description, event_date, event_time, event_type, color, created_by)
        OUTPUT inserted.id AS EventId
        VALUES (@Title, @Description, @EventDate, @EventTime, @EventType, @Color, @CreatedBy);
    END;
`;

const spUpdate = `
    CREATE PROCEDURE sp_UpdateCalendarEvent
        @EventId INT,
        @Title VARCHAR(200),
        @Description VARCHAR(1000),
        @EventDate DATE,
        @EventTime TIME,
        @EventType VARCHAR(50),
        @Color VARCHAR(20)
    AS
    BEGIN
        UPDATE CalendarEvents
        SET title = @Title,
            description = @Description,
            event_date = @EventDate,
            event_time = @EventTime,
            event_type = @EventType,
            color = @Color,
            updated_at = GETDATE()
        WHERE id = @EventId;
    END;
`;

const spDelete = `
    CREATE PROCEDURE sp_DeleteCalendarEvent
        @EventId INT
    AS
    BEGIN
        DELETE FROM CalendarEvents WHERE id = @EventId;
    END;
`;

async function recreateSchema() {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().batch(recreateQueries);
        await pool.request().batch(spQueries);
        await pool.request().batch(spUpdate);
        await pool.request().batch(spDelete);
        console.log('✅ Successfully recreated CalendarEvents table and SPs.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to recreate schema:', err);
        process.exit(1);
    }
}

recreateSchema();
