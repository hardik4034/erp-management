const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { extractUserContext } = require('../middleware/roleMiddleware');

// Apply user context to all routes (extracts headers)
router.use(extractUserContext);

// Get Note Types (Put before /:id paths to avoid matching issues if any)
router.get('/types', noteController.getNoteTypes);

// Create Note
router.post('/create', noteController.createNote);
// Keep standard REST create
router.post('/', noteController.createNote);

// Update Note
router.put('/update/:id', noteController.updateNote);
router.put('/:id', noteController.updateNote);

// Delete Note
router.delete('/delete/:id', noteController.deleteNote);
router.delete('/:id', noteController.deleteNote);

// Get specific employee's notes (or all if ID is null and auth scopes allow)
router.get('/employee/:employeeId', noteController.getEmployeeNotes);

// Keep standard route for general query
router.get('/', (req, res, next) => {
    req.params.employeeId = req.query.employeeId || null;
    noteController.getEmployeeNotes(req, res, next);
});

module.exports = router;
