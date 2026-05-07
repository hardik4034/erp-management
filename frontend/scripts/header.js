document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════════════════════════════════════════════════
    //  GLOBAL SEARCH LOGIC
    // ═══════════════════════════════════════════════════════════
    const searchInput = document.getElementById('globalSearchInput');
    const searchDropdown = document.getElementById('globalSearchDropdown');

    if (searchInput && searchDropdown) {
        const SEARCH_PAGES = [
            { title: 'Dashboard', file: 'index.html', isRoot: true, icon: '📊', keywords: ['home', 'main', 'dashboard'] },
            { title: 'My Profile', file: 'profile.html', icon: '👤', keywords: ['user', 'account', 'me', 'profile'] },
            { title: 'Employees', file: 'employees.html', icon: '👥', keywords: ['staff', 'team', 'people', 'users', 'employees'] },
            { title: 'Attendance', file: 'attendance.html', icon: '📅', keywords: ['time', 'clock', 'present', 'absent', 'attendance'] },
            { title: 'Leaves', file: 'leaves.html', icon: '🏖️', keywords: ['time off', 'vacation', 'sick', 'leaves'] },
            { title: 'Holidays', file: 'holidays.html', icon: '🎉', keywords: ['events', 'public', 'holidays'] },
            { title: 'Calendar', file: 'calendar.html', icon: '📆', keywords: ['schedule', 'dates', 'calendar'] },
            { title: 'Payroll', file: 'payroll.html', icon: '💰', keywords: ['salary', 'pay', 'money', 'wages', 'payroll'] },
            { title: 'Employee Salary', file: 'employee-salary.html', icon: '💵', keywords: ['salary', 'pay', 'compensation'] },
            { title: 'Departments', file: 'departments.html', icon: '🏢', keywords: ['teams', 'divisions', 'org', 'departments'] },
            { title: 'Designations', file: 'designations.html', icon: '💼', keywords: ['roles', 'titles', 'positions', 'designations'] },
            { title: 'Appreciations', file: 'appreciations.html', icon: '🏆', keywords: ['awards', 'kudos', 'recognition', 'appreciations'] },
            { title: 'Assets', file: 'assets.html', icon: '💻', keywords: ['laptops', 'equipment', 'devices', 'assets'] },
            { title: 'Notes', file: 'note.html', icon: '📝', keywords: ['memo', 'documents', 'text', 'notes'] },
            { title: 'Reports', file: 'reports.html', icon: '📈', keywords: ['analytics', 'data', 'export', 'reports'] },
            { title: 'Audit Logs', file: 'audit-logs.html', icon: '📜', keywords: ['history', 'tracking', 'changes', 'audit'] },
            { title: 'Biometric Settings', file: 'biometric-settings.html', icon: '🔐', keywords: ['fingerprint', 'device', 'biometric'] },
            { title: 'System Settings', file: 'users.html', icon: '⚙️', keywords: ['admin', 'config', 'setup', 'users', 'settings'] }
        ];

        // Role-based filtering logic
        function isPageAllowed(page) {
            if (!window.roleManager) return true; // Assume allowed if no role manager
            const role = window.roleManager.getCurrentRole();
            
            // Define restricted pages
            const hrOnly = ['assets.html', 'reports.html', 'biometric-settings.html'];
            const adminOnly = ['audit-logs.html', 'users.html'];
            
            if (hrOnly.includes(page.file) && !['admin', 'hr'].includes(role)) return false;
            if (adminOnly.includes(page.file) && role !== 'admin') return false;
            
            return true;
        }

        function getPageUrl(page) {
            const isSubpage = window.location.pathname.includes('/pages/');
            if (page.isRoot) {
                return isSubpage ? '../' + page.file : './' + page.file;
            } else {
                return isSubpage ? './' + page.file : './pages/' + page.file;
            }
        }

        function renderSuggestions(query) {
            searchDropdown.innerHTML = '';
            if (!query) {
                searchDropdown.classList.remove('open');
                return;
            }

            const lowerQuery = query.toLowerCase();
            const results = SEARCH_PAGES.filter(page => {
                if (!isPageAllowed(page)) return false;
                
                const titleMatch = page.title.toLowerCase().includes(lowerQuery);
                const keywordMatch = page.keywords.some(k => k.includes(lowerQuery));
                return titleMatch || keywordMatch;
            });

            if (results.length > 0) {
                results.forEach((result, index) => {
                    const item = document.createElement('div');
                    item.className = 'search-suggestion-item';
                    item.style.padding = '10px 15px';
                    item.style.cursor = 'pointer';
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.gap = '10px';
                    item.style.borderBottom = index < results.length - 1 ? '1px solid var(--border-color, #e2e8f0)' : 'none';
                    
                    item.innerHTML = `
                        <span style="font-size: 1.2rem;">${result.icon}</span>
                        <div>
                            <div style="font-weight: 500; color: var(--text-primary, #1e293b);">${result.title}</div>
                        </div>
                    `;

                    // Hover effects
                    item.addEventListener('mouseenter', () => {
                        item.style.backgroundColor = 'var(--bg-secondary, #f8fafc)';
                    });
                    item.addEventListener('mouseleave', () => {
                        item.style.backgroundColor = 'transparent';
                    });

                    item.addEventListener('click', () => {
                        window.location.href = getPageUrl(result);
                    });

                    searchDropdown.appendChild(item);
                });
                searchDropdown.classList.add('open');
                
                // Position dropdown correctly
                searchDropdown.style.position = 'absolute';
                searchDropdown.style.top = '100%';
                searchDropdown.style.left = '0';
                searchDropdown.style.right = '0';
                searchDropdown.style.backgroundColor = 'var(--bg-primary, #ffffff)';
                searchDropdown.style.border = '1px solid var(--border-color, #e2e8f0)';
                searchDropdown.style.borderRadius = '0.5rem';
                searchDropdown.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                searchDropdown.style.zIndex = '50';
                searchDropdown.style.maxHeight = '300px';
                searchDropdown.style.overflowY = 'auto';
                searchDropdown.style.marginTop = '0.5rem';
            } else {
                const noResult = document.createElement('div');
                noResult.style.padding = '15px';
                noResult.style.textAlign = 'center';
                noResult.style.color = 'var(--text-secondary, #64748b)';
                noResult.textContent = 'No pages found';
                searchDropdown.appendChild(noResult);
                searchDropdown.classList.add('open');
            }
        }

        searchInput.addEventListener('input', (e) => {
            renderSuggestions(e.target.value.trim());
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove('open');
            }
        });

        // Handle keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchDropdown.classList.remove('open');
                searchInput.blur();
            } else if (e.key === 'Enter') {
                const firstResult = searchDropdown.querySelector('.search-suggestion-item');
                if (firstResult) {
                    firstResult.click();
                }
            }
        });
    }
});
