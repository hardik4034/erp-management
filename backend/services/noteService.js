const noteRepository = require('../repositories/noteRepository');
const { errorResponse } = require('../utils/helpers');

class NoteService {
    
    // Validate if the role has permission to to perform an action
    _validateRolePermission(role, action) {
        const r = role.toLowerCase();

        if (r === 'employee') {
            throw errorResponse('Employees do not have permission to manage notes', 403);
        }
        
        if (action === 'delete' && r !== 'admin') {
            throw errorResponse('Only Admins can delete notes', 403);
        }
    }

    async createNote(data, requester) {
        // NoteTypeId instead of noteType
        if (!data.employeeId || !data.noteTypeId || !data.title || !data.description) {
            throw errorResponse('Missing required fields: employeeId, noteTypeId, title, description', 400);
        }

        this._validateRolePermission(requester.role, 'create');

        const noteData = {
            ...data,
            createdBy: requester.userId,
            createdByRole: requester.role
        };

        return await noteRepository.createNote(noteData);
    }

    async updateNote(id, data, requester) {
        if (!id || !data.noteTypeId || !data.title || !data.description) {
            throw errorResponse('Missing required fields', 400);
        }

        this._validateRolePermission(requester.role, 'update');

        const noteData = {
            ...data,
            updatedBy: requester.userId,
            updatedByRole: requester.role
        };

        const success = await noteRepository.updateNote(id, noteData);
        if (!success) {
            throw errorResponse('Note not found or update failed', 404);
        }
        return true;
    }
    
    async deleteNote(id, requester) {
        if (!id) {
            throw errorResponse('Missing note ID', 400);
        }

        this._validateRolePermission(requester.role, 'delete');

        const success = await noteRepository.deleteNote(id, requester);
        if (!success) {
            throw errorResponse('Note not found or delete failed', 404);
        }
        return true;
    }

    async getEmployeeNotes(employeeId, filters, requester) {
        const queryFilters = {
            ...filters,
            employeeId: employeeId || filters.employeeId
        };
        return await noteRepository.getNotes(queryFilters, requester);
    }
    
    async getNoteTypes() {
        return await noteRepository.getNoteTypes();
    }
}

module.exports = new NoteService();
