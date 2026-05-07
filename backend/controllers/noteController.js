const noteService = require('../services/noteService');
const { successResponse } = require('../utils/helpers');

// Create Note
const createNote = async (req, res, next) => {
    try {
        const requester = {
            userId: req.user.employeeId,
            role: req.user.role
        };

        if (!requester.userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: missing user ID' });
        }

        const noteId = await noteService.createNote(req.body, requester);
        res.status(201).json(successResponse({ noteId }, 'Note created successfully'));
    } catch (error) {
        next(error);
    }
};

// Update Note
const updateNote = async (req, res, next) => {
    try {
        const { id } = req.params;
        const requester = {
            userId: req.user.employeeId,
            role: req.user.role
        };

        if (!requester.userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await noteService.updateNote(id, req.body, requester);
        res.json(successResponse(null, 'Note updated successfully'));
    } catch (error) {
        next(error);
    }
};

// Delete Note
const deleteNote = async (req, res, next) => {
    try {
        const { id } = req.params;
        const requester = {
            userId: req.user.employeeId,
            role: req.user.role
        };

        if (!requester.userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await noteService.deleteNote(id, requester);
        res.json(successResponse(null, 'Note deleted successfully'));
    } catch (error) {
        next(error);
    }
};

// Get Employee Notes
const getEmployeeNotes = async (req, res, next) => {
    try {
        const { employeeId } = req.params;
        let { noteTypeId, startDate, endDate } = req.query;

        // Handle string "null"s and "0" from frontend
        const empId = (employeeId === 'null' || employeeId === '0' || !employeeId) ? null : parseInt(employeeId);
        
        if (startDate === 'null') startDate = null;
        if (endDate === 'null') endDate = null;
        
        // Handle noteTypeId
        let ntId = null;
        if (noteTypeId && noteTypeId !== 'null' && noteTypeId !== 'All' && noteTypeId !== '') {
            ntId = parseInt(noteTypeId);
            if (isNaN(ntId)) ntId = null; // Fallback for string names
        }

        const filters = { noteTypeId: ntId, startDate, endDate };
        const requester = {
            userId: req.user.employeeId,
            role: req.user.role
        };

        const notes = await noteService.getEmployeeNotes(empId, filters, requester);
        res.json(successResponse(notes));
    } catch (error) {
        next(error);
    }
};

// Get Note Types
const getNoteTypes = async (req, res, next) => {
    try {
        const noteTypes = await noteService.getNoteTypes();
        res.json(successResponse(noteTypes));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createNote,
    updateNote,
    deleteNote,
    getEmployeeNotes,
    getNoteTypes
};
