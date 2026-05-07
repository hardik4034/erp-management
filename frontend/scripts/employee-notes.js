document.addEventListener('DOMContentLoaded', () => {
    // Initialize Role Manager
    if (window.roleManager) {
        window.roleManager.init();
    }

    let displayNotes = [];
    let noteTypesData = [];
    const currentRole = window.roleManager?.getCurrentRole() || 'employee';
    let editingNoteId = null; // Track if we are editing

    // DOM Elements
    const employeeSelect = document.getElementById('employeeSelect');
    const noteTypeSelect = document.getElementById('noteType');
    
    const tableBody = document.getElementById('notesTableBody');
    const gridView = document.getElementById('notesGridView');
    const tableViewBtn = document.getElementById('tableViewBtn');
    const cardViewBtn = document.getElementById('cardViewBtn');
    const tableViewContainer = document.getElementById('notesTableView');
    const searchFilter = document.getElementById('searchFilter');
    const typeFilter = document.getElementById('typeFilter');
    const dateStartFilter = document.getElementById('dateStartFilter');
    const dateEndFilter = document.getElementById('dateEndFilter');
    const roleFilter = document.getElementById('roleFilter');
    const emptyState = document.getElementById('emptyState');
    const addNoteForm = document.getElementById('addNoteForm');
    const resetFormBtn = document.getElementById('resetFormBtn');
    
    // Form specific elements
    const formTitle = document.querySelector('.note-form-title');
    const saveBtn = addNoteForm.querySelector('button[type="submit"]');

    // Initialize Page
    initPage();

    // Event Listeners
    tableViewBtn.addEventListener('click', () => switchView('table'));
    cardViewBtn.addEventListener('click', () => switchView('card'));
    
    // Text search filter debounce (optional, but calling fetch Notes directly could be heavy)
    // We fetch notes whenever filters change. But for text search, we can filter locally or let backend handle.
    // The backend doesn't have a text search parameter yet, so we'll filter locally for text search.
    searchFilter.addEventListener('input', applyLocalFilters);
    typeFilter.addEventListener('change', fetchNotes);
    dateStartFilter.addEventListener('change', fetchNotes);
    dateEndFilter.addEventListener('change', fetchNotes);
    roleFilter.addEventListener('change', applyLocalFilters);

    addNoteForm.addEventListener('submit', handleFormSubmit);
    resetFormBtn.addEventListener('click', () => {
        resetForm();
    });

    // --- Functions ---
    
    async function initPage() {
        showLoading(true);
        
        // Employee gets different View
        if (currentRole === 'employee') {
            const headerTitle = document.querySelector('.header-title h1');
            if (headerTitle) headerTitle.textContent = 'My Notes';
            // Also hide the Add Form column if possible
            const formCol = document.querySelector('.note-form-column');
            if (formCol) formCol.style.display = 'none';
            // Change layout to be full width
            const container = document.querySelector('.notes-container');
            if (container) container.style.gridTemplateColumns = '1fr';
        }

        try {
            await Promise.all([
                fetchNoteTypes(),
                populateEmployeeDropdown(),
            ]);
            // Now fetch notes after types are loaded
            await fetchNotes();
        } catch (error) {
            console.error('Initialization error:', error);
            if (window.toast) window.toast.show('Failed to load page data', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function fetchNoteTypes() {
        try {
            const res = await window.endpoints.notes.getTypes();
            noteTypesData = res.data || [];
            populateNoteTypeDropdowns();
        } catch (error) {
            console.error('Error fetching note types:', error);
        }
    }

    function populateNoteTypeDropdowns() {
        // Clear existing Options except first
        noteTypeSelect.innerHTML = '<option value="">Select Type</option>';
        typeFilter.innerHTML = '<option value="All">All Types</option>';
        
        noteTypesData.forEach(nt => {
            // Apply Manager restrictions
            if (currentRole === 'manager') {
                // Assuming Manager cannot see 'HR Internal Note' or 'Admin Remark'
                if (!nt.IsVisibleToEmployee && (nt.NoteTypeName.includes('HR') || nt.NoteTypeName.includes('Admin'))) {
                    return; // skip
                }
            }
            if (currentRole === 'employee') {
                // Employees can't add notes, so noteTypeSelect isn't shown, but we filter what they can see
                if (!nt.IsVisibleToEmployee) return;
            }

            const optionCreate = document.createElement('option');
            optionCreate.value = nt.NoteTypeId;
            optionCreate.textContent = nt.NoteTypeName;
            noteTypeSelect.appendChild(optionCreate);

            const optionFilter = document.createElement('option');
            optionFilter.value = nt.NoteTypeId;
            optionFilter.textContent = nt.NoteTypeName;
            typeFilter.appendChild(optionFilter);
        });
    }

    async function populateEmployeeDropdown() {
        try {
            const response = await window.endpoints.employees.getAll();
            const employees = response.data || [];
            
            while (employeeSelect.options.length > 1) {
                employeeSelect.remove(1);
            }
            
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.EmployeeId;
                option.textContent = `${emp.FirstName} ${emp.LastName} (${emp.EmployeeCode})`;
                employeeSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    }

    async function fetchNotes() {
        showLoading(true);
        try {
            const params = {
                noteTypeId: typeFilter.value !== 'All' ? typeFilter.value : null,
                startDate: dateStartFilter.value || null,
                endDate: dateEndFilter.value || null,
                showDeleted: document.getElementById('showDeletedToggle')?.checked || false
            };
            
            // Clean params
            Object.keys(params).forEach(key => {
                if (params[key] === null || params[key] === undefined || params[key] === '') {
                    delete params[key];
                }
            });

            // If employee, use employee ID. Else null for all
            const employeeIdParam = currentRole === 'employee' ? window.roleManager.getCurrentEmployeeId() : null;

            const response = await window.endpoints.notes.getByEmployee(employeeIdParam, params);
            displayNotes = response.data || [];
            populateRoleFilter(displayNotes);
            applyLocalFilters();
        } catch (error) {
            console.error('Error fetching notes:', error);
            if (window.toast) window.toast.show('Failed to fetch notes', 'error');
        } finally {
            showLoading(false);
        }
    }

    function applyLocalFilters() {
        const searchText = searchFilter.value.toLowerCase();
        
        let filteredNotes = displayNotes;
        if (searchText) {
            filteredNotes = displayNotes.filter(n => 
                (n.Title && n.Title.toLowerCase().includes(searchText)) ||
                (n.Description && n.Description.toLowerCase().includes(searchText)) ||
                (n.EmployeeName && n.EmployeeName.toLowerCase().includes(searchText)) ||
                (n.GivenBy && n.GivenBy.toLowerCase().includes(searchText))
            );
        }

        const roleVal = roleFilter.value;
        if (roleVal !== 'All') {
            filteredNotes = filteredNotes.filter(n => n.EmployeeRole === roleVal);
        }
        
        renderNotes(filteredNotes);
    }

    function renderNotes(notes) {
        tableBody.innerHTML = '';
        gridView.innerHTML = '';

        if (notes.length === 0) {
            emptyState.classList.remove('hidden');
            tableViewContainer.classList.add('hidden');
            gridView.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        
        const isTableMode = tableViewBtn.classList.contains('active');
        if (isTableMode) {
            tableViewContainer.classList.remove('hidden');
            gridView.classList.add('hidden');
        } else {
            tableViewContainer.classList.add('hidden');
            gridView.classList.remove('hidden');
        }

        notes.forEach(note => {
            const tr = document.createElement('tr');
            
            // Check if current user can edit/delete
            // Admin: Edit, Delete
            // HR/Manager: Edit (Manager usually edits their own or team, handled by backend)
            // Employee: None
            const canEdit = ['admin', 'hr', 'manager'].includes(currentRole);
            const canDelete = currentRole === 'admin';
            
            let actionHtml = `
                    <div class="action-dropdown" style="display: flex; justify-content: center; position: relative;">
                        <button class="action-btn" onclick="toggleActionMenu(this)" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 0 0.5rem; color: #6b7280; font-weight: bold; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">⋮</button>
                        <div class="action-menu" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); z-index: 50; min-width: 120px; padding: 0.5rem 0;">
                            <div onclick="viewNoteDetails(${note.NoteId})" class="dropdown-item">
                                👁️ View
                            </div>
                            `;
                            if (canEdit) {
                                actionHtml += `
                                <div onclick="editNote(${note.NoteId})" class="dropdown-item">
                                    ✏️ Edit
                                </div>`;
                            }
                            if (canDelete) {
                                actionHtml += `
                                <div onclick="deleteNote(${note.NoteId})" class="dropdown-item" style="color: #dc2626;">
                                    🗑️ Delete
                                </div>`;
                            }
            actionHtml += `</div></div>`;

            if (currentRole === 'employee') {
                actionHtml = `<button class="btn btn-outline btn-sm" onclick="viewNoteDetails(${note.NoteId})">View</button>`;
            }

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 500;">${note.EmployeeName}</div>
                </td>
                <td>
                    <div style="font-size: 0.85rem; color: #4b5563;">${note.EmployeeRole || 'N/A'}</div>
                </td>
                <td>
                    <span class="badge ${getBadgeClass(note.NoteTypeName)}">${note.NoteTypeName}</span>
                </td>
                <td>
                    <div style="font-weight: 500; font-size: 0.9rem; margin-bottom: 2px;">${note.Title}</div>
                </td>
                <td>
                    <div style="max-width: 300px; white-space: normal; line-height: 1.4" class="truncate-2-lines" title="${note.Description}">
                        ${note.Description}
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.85rem;">${note.GivenBy || 'System'}</div>
                    <div style="font-size: 0.7rem; color: #6b7280; margin-top: 2px;">${note.CreatedByRole}</div>
                </td>
                <td>${formatDate(note.CreatedAt)}</td>
                <td>${actionHtml}</td>
            `;
            tableBody.appendChild(tr);

            // Grid card view
            const card = document.createElement('div');
            card.className = 'note-card';
            card.innerHTML = `
                <div class="note-card-header">
                    <div>
                        <span class="badge ${getBadgeClass(note.NoteTypeName)}">${note.NoteTypeName}</span>
                    </div>
                    <span style="font-size: 0.75rem; color: #9ca3af;">${formatDate(note.CreatedAt)}</span>
                </div>
                <div class="note-card-meta">
                    <span style="font-weight: 600; color: #374151;">${note.EmployeeName}</span>
                    <span style="font-size: 0.8rem; color: #4b5563; font-style: italic;">${note.EmployeeRole || 'N/A'}</span>
                    <span style="font-size: 0.8rem; color: #6b7280;">Given By: ${note.GivenBy || 'System'} (${note.CreatedByRole})</span>
                </div>
                <div style="font-weight: 600; margin-bottom: 0.5rem;">${note.Title}</div>
                <div class="note-content" style="max-height: 80px; overflow: hidden;">${note.Description}</div>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                     <button class="btn btn-outline btn-sm" style="padding: 0.2rem 0.5rem;" onclick="viewNoteDetails(${note.NoteId})">View</button>
                     ${canEdit ? `<button class="btn btn-outline btn-sm" style="padding: 0.2rem 0.5rem;" onclick="editNote(${note.NoteId})">Edit</button>` : ''}
                </div>
            `;
            gridView.appendChild(card);
        });
        
        // Add dropdown item styles programmatically since they are inside innerHTML
        document.querySelectorAll('.dropdown-item').forEach(el => {
            el.style.padding = '0.5rem 1rem';
            el.style.cursor = 'pointer';
            el.style.fontSize = '0.875rem';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.gap = '0.5rem';
            
            el.addEventListener('mouseenter', () => el.style.backgroundColor = '#f3f4f6');
            el.addEventListener('mouseleave', () => el.style.backgroundColor = 'transparent');
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
        
        if (displayNotes.length === 0) {
            tableViewContainer.classList.add('hidden');
            gridView.classList.add('hidden');
        }
    }

    function resetForm() {
        addNoteForm.reset();
        editingNoteId = null;
        formTitle.textContent = 'Add New Note';
        saveBtn.textContent = 'Save Note';
        employeeSelect.disabled = false;
        if(currentRole === 'employee') {
            employeeSelect.disabled = true; // Still false for employees conceptually, but they can't see the form
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const employeeId = document.getElementById('employeeSelect').value;
        const noteTypeId = document.getElementById('noteType').value;
        const title = document.getElementById('noteTitle').value;
        const description = document.getElementById('noteDescription').value;

        if (!employeeId || !noteTypeId || !title || !description) {
            if(window.toast) window.toast.show('Please fill all required fields', 'error');
            return;
        }

        const noteData = {
            employeeId: parseInt(employeeId),
            noteTypeId: parseInt(noteTypeId),
            title: title,
            description: description
        };

        showLoading(true);
        try {
            if (editingNoteId) {
                await window.endpoints.notes.update(editingNoteId, noteData);
                if (window.toast) window.toast.show('Note updated successfully', 'success');
            } else {
                await window.endpoints.notes.create(noteData);
                if (window.toast) window.toast.show('Note saved successfully', 'success');
            }
            
            resetForm();
            await fetchNotes();
        } catch (error) {
            console.error('Error saving note:', error);
            if (window.toast) window.toast.show(error.message || 'Failed to save note', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Assign to window for global access from HTML onclick
    window.editNote = (id) => {
        closeAllActionMenus();
        const note = displayNotes.find(n => n.NoteId === id);
        if (note) {
            editingNoteId = id;
            formTitle.textContent = 'Edit Note';
            saveBtn.textContent = 'Update Note';
            
            employeeSelect.value = note.EmployeeId;
            employeeSelect.disabled = true; // Don't allow changing employee during edit
            
            noteTypeSelect.value = note.NoteTypeId;
            document.getElementById('noteTitle').value = note.Title;
            document.getElementById('noteDescription').value = note.Description;
            
            // Scroll to form
            document.querySelector('.note-form-card').scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.deleteNote = async (id) => {
        closeAllActionMenus();
        if (confirm('Are you sure you want to delete this note? This action can be viewed in history.')) {
            showLoading(true);
            try {
                await window.endpoints.notes.delete(id);
                if (window.toast) window.toast.show('Note deleted successfully', 'success');
                await fetchNotes();
            } catch (error) {
                console.error('Error deleting note:', error);
                if (window.toast) window.toast.show(error.message || 'Failed to delete note', 'error');
            } finally {
                showLoading(false);
            }
        }
    };

    window.viewNoteDetails = (id) => {
        closeAllActionMenus();
        const note = displayNotes.find(n => n.NoteId === id);
        if (note) {
            alert(`Note Details:\n\nEmployee: ${note.EmployeeName}\nType: ${note.NoteTypeName}\nTitle: ${note.Title}\nGiven By: ${note.GivenBy || 'System'} (${note.CreatedByRole})\nDate: ${formatDate(note.CreatedAt)}\n\nDescription:\n${note.Description}`);
        }
    };

    window.toggleActionMenu = (btn) => {
        closeAllActionMenus();
        const menu = btn.nextElementSibling;
        if (menu) {
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
    };

    function closeAllActionMenus() {
        document.querySelectorAll('.action-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.matches('.action-btn')) {
            closeAllActionMenus();
        }
    });

    function getBadgeClass(typeName) {
        if (!typeName) return 'badge-general';
        const type = typeName.toLowerCase();
        if (type.includes('warning') || type.includes('disciplinary')) return 'badge-warning';
        if (type.includes('appreciation') || type.includes('reward')) return 'badge-appreciation';
        if (type.includes('performance')) return 'badge-performance';
        if (type.includes('salary')) return 'badge-salary';
        if (type.includes('admin') || type.includes('hr')) return 'badge-disciplinary'; // HR/Admin red
        return 'badge-general';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        if (window.utils && window.utils.formatDate) {
            return window.utils.formatDate(dateStr);
        }
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString('en-US', options);
    }

    function showLoading(show) {
        if (window.utils && window.utils.showLoading) {
            window.utils.showLoading(show);
        }
    }

    function populateRoleFilter(notes) {
        const currentVal = roleFilter.value;
        const roles = [...new Set(notes.map(n => n.EmployeeRole).filter(r => r))];
        
        roleFilter.innerHTML = '<option value="All">All Roles</option>';
        roles.sort().forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role;
            roleFilter.appendChild(option);
        });
        
        if (roles.includes(currentVal)) {
            roleFilter.value = currentVal;
        }
    }
});
