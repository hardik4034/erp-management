const { getConnection } = require('../config/database');
const sql = require('mssql');

const calendarController = {
    // Get all calendar events
    getEvents: async (req, res) => {
        try {
            const { startDate, endDate, employeeId, role } = req.query;
            const pool = await getConnection();

            // 1. Fetch user-created events
            const result = await pool.request()
                .input('StartDate', sql.Date, startDate)
                .input('EndDate', sql.Date, endDate)
                .query(`
                    SELECT 
                        id, title, description, event_date, event_time, 
                        event_type, color, created_by, created_at
                    FROM CalendarEvents
                    WHERE event_date BETWEEN @StartDate AND @EndDate
                `);
            const events = result.recordset.map(e => ({
                id: `evt_${e.id}`,
                title: e.title,
                start: e.event_time ? `${e.event_date.toISOString().split('T')[0]}T${e.event_time.toISOString().split('T')[1].substring(0,8)}` : e.event_date.toISOString().split('T')[0],
                description: e.description,
                type: e.event_type,
                backgroundColor: e.color || '#3788d8', // default FullCalendar blue
                extendedProps: {
                    eventId: e.id,
                    createdBy: e.created_by,
                    eventType: e.event_type
                }
            }));

            // 2. Fetch Holidays
            const holidaysResult = await pool.request()
                .input('StartDate', sql.Date, startDate)
                .input('EndDate', sql.Date, endDate)
                .query(`
                    SELECT HolidayId, HolidayName, HolidayDate, Description
                    FROM Holidays
                    WHERE IsDeleted = 0 
                    AND (HolidayDate BETWEEN @StartDate AND @EndDate)
                `);
            const holidays = holidaysResult.recordset.map(h => ({
                id: `hol_${h.HolidayId}`,
                title: h.HolidayName,
                start: h.HolidayDate.toISOString().split('T')[0],
                description: h.Description,
                type: 'Holiday',
                backgroundColor: '#e74c3c', // red
                extendedProps: { eventType: 'Holiday', description: h.Description }
            }));

            // 3. Fetch Approved Leaves
            const leavesResult = await pool.request()
                .input('StartDate', sql.Date, startDate)
                .input('EndDate', sql.Date, endDate)
                .query(`
                    SELECT l.LeaveId, l.FromDate, l.ToDate, e.FirstName, e.LastName, lt.TypeName
                    FROM Leaves l
                    JOIN Employees e ON l.EmployeeId = e.EmployeeId
                    JOIN LeaveTypes lt ON l.LeaveTypeId = lt.LeaveTypeId
                    WHERE l.Status = 'Approved'
                    AND (l.FromDate <= @EndDate AND l.ToDate >= @StartDate)
                `);
            const leaves = leavesResult.recordset.map(l => {
                // ToDate needs to be exclusive for FullCalendar if all-day, so we format it carefully.
                // We will add 1 day to the end date for FullCalendar 'end' property
                const toDateObj = new Date(l.ToDate);
                toDateObj.setDate(toDateObj.getDate() + 1);
                return {
                    id: `lv_${l.LeaveId}`,
                    title: `${l.FirstName} ${l.LastName} - ${l.TypeName} Leave`,
                    start: l.FromDate.toISOString().split('T')[0],
                    end: toDateObj.toISOString().split('T')[0],
                    type: 'Leave',
                    backgroundColor: '#f39c12', // orange
                    extendedProps: { eventType: 'Leave' }
                };
            });

            // 4. Fetch Birthdays and Anniversaries
            const staffResult = await pool.request()
                .query(`
                    SELECT EmployeeId, FirstName, LastName, DateOfBirth, DateOfJoining
                    FROM Employees
                    WHERE Status = 'Active'
                `);
            
            const staffEvents = [];
            const startYear = new Date(startDate).getFullYear();
            const endYear = new Date(endDate).getFullYear();
            
            staffResult.recordset.forEach(emp => {
                const addAnnualEvent = (origDate, titleTemplate, type, bgColor) => {
                    if (!origDate) return;
                    for (let y = startYear; y <= endYear; y++) {
                        const evtDate = new Date(origDate);
                        evtDate.setFullYear(y);
                        
                        // Check if evtDate is within [startDate, endDate]
                        const evtDateStr = evtDate.toISOString().split('T')[0];
                        if (evtDateStr >= startDate && evtDateStr <= endDate) {
                            staffEvents.push({
                                id: `${type.toLowerCase().substring(0,3)}_${emp.EmployeeId}_${y}`,
                                title: titleTemplate.replace('{name}', `${emp.FirstName} ${emp.LastName}`),
                                start: evtDateStr,
                                type: type,
                                backgroundColor: bgColor,
                                extendedProps: { eventType: type }
                            });
                        }
                    }
                };
                
                addAnnualEvent(emp.DateOfBirth, "{name}'s Birthday", 'Birthday', '#9b59b6'); // purple
                addAnnualEvent(emp.DateOfJoining, "{name}'s Work Anniversary", 'Anniversary', '#1abc9c'); // teal
            });

            const allEvents = [...events, ...holidays, ...leaves, ...staffEvents];
            res.json({ success: true, count: allEvents.length, data: allEvents });

        } catch (error) {
            console.error('Error fetching calendar events:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch calendar events' });
        }
    },

    // Create a new event
    createEvent: async (req, res) => {
        try {
            const { title, description, eventDate, eventTime, eventType, color, createdBy } = req.body;
            const pool = await getConnection();

            const request = pool.request()
                .input('Title', sql.NVarChar(200), title)
                .input('Description', sql.VarChar(1000), description)
                .input('EventDate', sql.Date, eventDate)
                .input('EventTime', sql.Time, eventTime ? new Date(`1970-01-01T${eventTime}Z`) : null)
                .input('EventType', sql.NVarChar(50), eventType)
                .input('Color', sql.NVarChar(20), color)
                .input('CreatedBy', sql.Int, createdBy || 1);

            const result = await request.execute('sp_CreateCalendarEvent');

            res.status(201).json({
                success: true,
                message: 'Event created successfully',
                eventId: result.recordset[0].EventId
            });
        } catch (error) {
            console.error('Error creating calendar event:', error);
            res.status(500).json({ success: false, error: 'Failed to create event' });
        }
    },

    // Update an event
    updateEvent: async (req, res) => {
        try {
            const eventId = req.params.id;
            const { title, description, eventDate, eventTime, eventType, color } = req.body;
            const pool = await getConnection();

            const request = pool.request()
                .input('EventId', sql.Int, eventId)
                .input('Title', sql.NVarChar(200), title)
                .input('Description', sql.VarChar(1000), description)
                .input('EventDate', sql.Date, eventDate)
                .input('EventTime', sql.Time, eventTime ? new Date(`1970-01-01T${eventTime}Z`) : null)
                .input('EventType', sql.NVarChar(50), eventType)
                .input('Color', sql.NVarChar(20), color);

            await request.execute('sp_UpdateCalendarEvent');

            res.json({ success: true, message: 'Event updated successfully' });
        } catch (error) {
            console.error('Error updating calendar event:', error);
            res.status(500).json({ success: false, error: 'Failed to update event' });
        }
    },

    // Delete an event
    deleteEvent: async (req, res) => {
        try {
            const eventId = req.params.id;
            console.log(`[DEBUG] Attempting to delete calendar event with ID: ${eventId}`);
            
            const pool = await getConnection();

            const result = await pool.request()
                .input('EventId', sql.Int, eventId)
                .execute('sp_DeleteCalendarEvent');

            console.log(`[DEBUG] Delete result for ID ${eventId}:`, result.rowsAffected);

            if (result.rowsAffected[0] === 0) {
                console.warn(`[DEBUG] No rows were deleted for ID: ${eventId}`);
                return res.status(404).json({ 
                    success: false, 
                    error: 'Event not found or already deleted' 
                });
            }

            res.json({ success: true, message: 'Event deleted successfully' });
        } catch (error) {
            console.error('Error deleting calendar event:', error);
            res.status(500).json({ success: false, error: 'Failed to delete event' });
        }
    }
};

module.exports = calendarController;
