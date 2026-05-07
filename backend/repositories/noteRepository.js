const sql = require('mssql');
const { getConnection } = require('../config/database');

class NoteRepository {
    async createNote(data) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('EmployeeId', sql.Int, data.employeeId)
            .input('NoteTypeId', sql.Int, data.noteTypeId)
            .input('Title', sql.VarChar(200), data.title)
            .input('Description', sql.VarChar(sql.MAX), data.description)
            .input('CreatedBy', sql.Int, data.createdBy)
            .input('CreatedByRole', sql.VarChar(50), data.createdByRole)
            .execute('sp_CreateEmployeeNote');
            
        return result.recordset[0].NoteId;
    }

    async updateNote(id, data) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('NoteId', sql.Int, id)
            .input('NoteTypeId', sql.Int, data.noteTypeId)
            .input('Title', sql.VarChar(200), data.title)
            .input('Description', sql.VarChar(sql.MAX), data.description)
            .input('UpdatedBy', sql.Int, data.updatedBy)
            .input('UpdatedByRole', sql.VarChar(50), data.updatedByRole)
            .execute('sp_UpdateEmployeeNote');

        return result.returnValue === 0 || result.rowsAffected[0] > 0;
    }

    async getNotes(filters, requester) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('RequesterRole', sql.VarChar(50), requester.role)
            .input('RequesterId', sql.Int, requester.userId)
            .input('EmployeeId', sql.Int, filters.employeeId || null)
            .input('NoteTypeId', sql.Int, filters.noteTypeId || null)
            .input('StartDate', sql.Date, filters.startDate || null)
            .input('EndDate', sql.Date, filters.endDate || null)
            .execute('sp_GetEmployeeNotes');

        return result.recordset;
    }

    async deleteNote(id, requester) {
        const pool = await getConnection();
        const result = await pool.request()
            .input('NoteId', sql.Int, id)
            .input('DeletedBy', sql.Int, requester.userId)
            .input('DeletedByRole', sql.VarChar(50), requester.role)
            .execute('sp_DeleteEmployeeNote');

        return result.returnValue === 0 || result.rowsAffected[0] > 0;
    }

    async getNoteTypes() {
        const pool = await getConnection();
        const result = await pool.request()
            .execute('sp_GetNoteTypes');
            
        return result.recordset;
    }
}

module.exports = new NoteRepository();
