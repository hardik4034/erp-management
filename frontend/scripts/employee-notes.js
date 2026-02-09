document.addEventListener('DOMContentLoaded', () => {
    // Initialize Role Manager
    if (window.roleManager) {
        window.roleManager.init();
    }

    // Mock Data
    const mockEmployees = [
        { id: 1, name: 'Alice Bajpai', department: 'IT' },
        { id: 2, name: 'Bob Sharma', department: 'HR' },
        { id: 3, name: 'Charlie Gupta', department: 'Sales' },
        { id: 4, name: 'David Singh', department: 'Marketing' },
        { id: 5, name: 'Eve Verma', department: 'IT' }
    ];

    let displayNotes = [
        {
            id: 1,
            employeeId: 1,
            employeeName: 'Alice Bajpai',
            type: 'Performance',
            visibility: 'HR Only',
            description: 'Exceptional performance in the Q4 project delivery. Client was very happy.',
            date: '2025-01-15'
        },
        {
            id: 2,
            employeeId: 3,
            employeeName: 'Charlie Gupta',
            type: 'Warning',
            visibility: 'HR + Manager',
            description: 'Late arrival for three consecutive days without prior notice.',
            date: '2025-01-20'
        },
        {
            id: 3,
            employeeId: 2,
            employeeName: 'Bob Sharma',
            type: 'Appreciation',
            visibility: 'Manager Only',
            description: 'Great team spirit shown during the team offsite.',
            date: '2025-01-22'
        },
        {
            id: 4,
            employeeId: 4,
            employeeName: 'David Singh',
            type: 'Salary Discussion',
            visibility: 'HR Only',
            description: 'Discussed potential hike for next appraisal cycle based on target achievements.',
            date: '2025-01-25'
        }
    ];

    // DOM Elements
    const employeeSelect = document.getElementById('employeeSelect');
    const tableBody = document.getElementById('notesTableBody');
    const gridView = document.getElementById('notesGridView');
    const tableViewBtn = document.getElementById('tableViewBtn');
    const cardViewBtn = document.getElementById('cardViewBtn');
    const tableViewContainer = document.getElementById('notesTableView');
    const searchFilter = document.getElementById('searchFilter');
    const typeFilter = document.getElementById('typeFilter');
    const dateStartFilter = document.getElementById('dateStartFilter');
    const dateEndFilter = document.getElementById('dateEndFilter');
    const emptyState = document.getElementById('emptyState');
    const addNoteForm = document.getElementById('addNoteForm');
    const resetFormBtn = document.getElementById('resetFormBtn');

    // Initialize Page
    populateEmployeeDropdown();
    renderNotes(displayNotes);

    // Event Listeners
    tableViewBtn.addEventListener('click', () => switchView('table'));
    cardViewBtn.addEventListener('click', () => switchView('card'));
    
    searchFilter.addEventListener('input', filterNotes);
    typeFilter.addEventListener('change', filterNotes);
    dateStartFilter.addEventListener('change', filterNotes);
    dateEndFilter.addEventListener('change', filterNotes);

    addNoteForm.addEventListener('submit', handleFormSubmit);
    resetFormBtn.addEventListener('click', () => {
        addNoteForm.reset();
    });


    // --- Functions ---

    function populateEmployeeDropdown() {
        // Clear existing options except first
        while (employeeSelect.options.length > 1) {
            employeeSelect.remove(1);
        }
        
        // In a real app, this would be an API call: await api.employees.getAll()
        // For now, use mock data
        mockEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id; // Using ID as value
            option.textContent = emp.name;
            option.dataset.name = emp.name; // Store name for easy access
            employeeSelect.appendChild(option);
        });
    }

    function renderNotes(notes) {
        // Clear current content
        tableBody.innerHTML = '';
        gridView.innerHTML = '';

        if (notes.length === 0) {
            emptyState.classList.remove('hidden');
            tableViewContainer.classList.add('hidden');
            gridView.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        
        // Check current view mode (simple check based on button active state)
        const isTableMode = tableViewBtn.classList.contains('active');
        if (isTableMode) {
            tableViewContainer.classList.remove('hidden');
            gridView.classList.add('hidden');
        } else {
            tableViewContainer.classList.add('hidden');
            gridView.classList.remove('hidden');
        }

        // Render Table Rows
        notes.forEach(note => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 500;">${note.employeeName}</div>
                </td>
                <td>
                    <span class="badge ${getBadgeClass(note.type)}">${note.type}</span>
                </td>
                <td>
                    <div style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${note.description}">
                        ${note.description}
                    </div>
                </td>
                <td><span style="font-size: 0.8rem; color: #6b7280;">${note.visibility}</span></td>
                <td>${formatDate(note.date)}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="alert('View details for ${note.id}')">View</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Render Grid Cards
        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.innerHTML = `
                <div class="note-card-header">
                    <span class="badge ${getBadgeClass(note.type)}">${note.type}</span>
                    <span style="font-size: 0.75rem; color: #9ca3af;">${formatDate(note.date)}</span>
                </div>
                <div class="note-card-meta">
                    <span style="font-weight: 600; color: #374151;">${note.employeeName}</span>
                    <span>👁 ${note.visibility}</span>
                </div>
                <div class="note-content">${note.description}</div>
            `;
            gridView.appendChild(card);
        });
    }

    function switchView(view) {
        if (view === 'table') {
            tableViewBtn.classList.add('active');
            cardViewBtn.classList.remove('active');
            tableViewContainer.classList.remove('hidden');
            gridView.classList.add('hidden');
        } else {
            cardViewBtn.classList.add('active');
            tableViewBtn.classList.remove('active');
            gridView.classList.remove('hidden');
            tableViewContainer.classList.add('hidden');
        }
        // Re-check empty state visibility logic if needed, but renderNotes handles content visibility
        if (displayNotes.length === 0) {
            tableViewContainer.classList.add('hidden');
            gridView.classList.add('hidden');
        }
    }

    function filterNotes() {
        const searchTerm = searchFilter.value.toLowerCase();
        const typeTerm = typeFilter.value;
        const startDate = dateStartFilter.value;
        const endDate = dateEndFilter.value;

        const filtered = displayNotes.filter(note => {
            const matchesSearch = note.employeeName.toLowerCase().includes(searchTerm) || 
                                  note.description.toLowerCase().includes(searchTerm);
            const matchesType = typeTerm === 'All' || note.type === typeTerm;
            
            let matchesDate = true;
            if (startDate) {
                matchesDate = matchesDate && (note.date >= startDate);
            }
            if (endDate) {
                matchesDate = matchesDate && (note.date <= endDate);
            }
            
            return matchesSearch && matchesType && matchesDate;
        });

        renderNotes(filtered);
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        // 1. Get Values
        const employeeId = document.getElementById('employeeSelect').value;
        const employeeName = document.getElementById('employeeSelect').options[document.getElementById('employeeSelect').selectedIndex].text;
        const type = document.getElementById('noteType').value;
        const visibility = document.getElementById('visibility').value;
        const description = document.getElementById('noteDescription').value;

        // 2. Simple Validation (HTML 'required' attribute handles most)
        if (!employeeId || !type || !visibility || !description) {
            if(window.toast) window.toast.show('Please fill all required fields', 'error');
            return;
        }

        // 3. Create Note Object
        const newNote = {
            id: Date.now(), // Fake ID
            employeeId: employeeId,
            employeeName: employeeName,
            type: type,
            visibility: visibility,
            description: description,
            date: new Date().toISOString().split('T')[0]
        };

        // 4. Add to List (Mock Save)
        displayNotes.unshift(newNote); // Add to top

        // 5. Refresh UI
        filterNotes(); // Re-render with current filters
        addNoteForm.reset();

        // 6. Show Success Message
        if (window.toast) {
            window.toast.show('Note saved successfully', 'success');
        } else {
            alert('Note saved successfully');
        }
    }

    // Helper: Get Badge Class
    function getBadgeClass(type) {
        switch (type) {
            case 'General': return 'badge-general';
            case 'Warning': return 'badge-warning';
            case 'Appreciation': return 'badge-appreciation';
            case 'Performance': return 'badge-performance';
            case 'Salary Discussion': return 'badge-salary';
            case 'Disciplinary Action': return 'badge-disciplinary';
            default: return 'badge-general';
        }
    }

    // Helper: Format Date
    function formatDate(dateStr) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString('en-US', options);
    }
});
