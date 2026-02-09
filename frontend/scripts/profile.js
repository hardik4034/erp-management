// Profile Page Script
(function() {
    'use strict';

    // Initialize Auth
    auth.initAuth();

    // Get employee ID from URL parameters (support both 'id' and 'employeeId')
    const urlParams = new URLSearchParams(window.location.search);
    const employeeId = urlParams.get('employeeId') || urlParams.get('id');

    if (!employeeId) {
        showError('No employee ID provided');
        return;
    }

    // Load employee profile
    loadEmployeeProfile(employeeId);

    async function loadEmployeeProfile(id) {
        try {
            showLoading();
            
            // Role-based access control: Employees can only view their own profile
            if (window.roleManager && window.roleManager.isRole('employee')) {
                const currentEmployeeId = window.roleManager.getCurrentEmployeeId();
                
                // If employee tries to view another employee's profile, redirect to their own
                if (currentEmployeeId && parseInt(id) !== parseInt(currentEmployeeId)) {
                    console.warn(`Access denied: Employee ${currentEmployeeId} tried to access profile ${id}`);
                    
                    // Show error message
                    showError('You do not have permission to view this profile. Redirecting to your profile...');
                    
                    // Redirect to their own profile after a short delay
                    setTimeout(() => {
                        window.location.href = `profile.html?employeeId=${currentEmployeeId}`;
                    }, 2000);
                    return;
                }
            }
            
            const response = await endpoints.employees.getById(id);
            const employee = response.data;

            if (!employee) {
                showError('Employee not found');
                return;
            }

            // Also fetch all employees to get reporting manager name
            const allEmployeesResponse = await endpoints.employees.getAll();
            const allEmployees = allEmployeesResponse.data || [];

            displayProfile(employee, allEmployees);
            hideLoading();
        } catch (error) {
            console.error('Error loading employee profile:', error);
            showError('Failed to load employee profile');
        }
    }

    function displayProfile(employee, allEmployees) {
        // Update avatar
        const initials = `${employee.FirstName.charAt(0)}${employee.LastName.charAt(0)}`;
        document.getElementById('profileAvatar').textContent = initials;

        // Update header
        document.getElementById('profileName').textContent = `${employee.Salutation || ''} ${employee.FirstName} ${employee.LastName}`.trim();
        document.getElementById('profileDesignation').textContent = employee.DesignationName || 'No Designation';
        document.getElementById('profileEmployeeCode').textContent = employee.EmployeeCode || '-';
        document.getElementById('profileStatus').textContent = employee.Status || 'Active';

        // Personal Information
        document.getElementById('infoFullName').textContent = `${employee.Salutation || ''} ${employee.FirstName} ${employee.LastName}`.trim();
        document.getElementById('infoEmail').textContent = employee.Email || '-';
        document.getElementById('infoPhone').textContent = employee.Phone || '-';
        document.getElementById('infoGender').textContent = employee.Gender || '-';
        document.getElementById('infoDOB').textContent = formatDate(employee.DateOfBirth);
        document.getElementById('infoMaritalStatus').textContent = employee.MaritalStatus || '-';

        // Employment Information
        document.getElementById('infoEmployeeCode').textContent = employee.EmployeeCode || '-';
        document.getElementById('infoDepartment').textContent = employee.DepartmentName || '-';
        document.getElementById('infoDesignation').textContent = employee.DesignationName || '-';
        
        // Find reporting manager
        let reportingToName = '-';
        if (employee.ReportingTo) {
            const manager = allEmployees.find(emp => emp.EmployeeId == employee.ReportingTo);
            if (manager) {
                reportingToName = `${manager.FirstName} ${manager.LastName}`;
            }
        }
        document.getElementById('infoReportingTo').textContent = reportingToName;
        
        document.getElementById('infoDOJ').textContent = formatDate(employee.DateOfJoining);
        document.getElementById('infoEmploymentType').textContent = employee.EmploymentType || '-';

        // Contact & Location
        document.getElementById('infoCountry').textContent = employee.Country || '-';
        document.getElementById('infoAddress').textContent = employee.Address || '-';
        document.getElementById('infoBusinessAddress').textContent = employee.BusinessAddress || '-';
        document.getElementById('infoLanguage').textContent = employee.Language || '-';

        // Additional Information
        document.getElementById('infoUserRole').textContent = employee.UserRole || 'Employee';
        document.getElementById('infoSkills').textContent = employee.Skills || '-';
        document.getElementById('infoLoginAllowed').textContent = employee.LoginAllowed !== false ? 'Yes' : 'No';
        document.getElementById('infoEmailNotifications').textContent = employee.ReceiveEmailNotifications !== false ? 'Yes' : 'No';

        // Set salary iframe src with employee ID
        const salaryIframe = document.getElementById('salaryIframe');
        if (salaryIframe && employeeId) {
            salaryIframe.setAttribute('src', `employee-salary.html?employeeId=${employeeId}`);
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch (error) {
            return dateString;
        }
    }

    function showLoading() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('profileContent').style.display = 'none';
    }

    function hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('profileContent').style.display = 'block';
    }

    function showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('errorState').querySelector('p').textContent = message;
    }

    // Tab Switching Functionality
    function initTabs() {
        const tabLinks = document.querySelectorAll('.tab-nav-link');
        
        tabLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetTab = this.getAttribute('data-tab');
                
                // Remove active class from all tabs and content
                document.querySelectorAll('.tab-nav-link').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                this.classList.add('active');
                const targetContent = document.getElementById(`tab-${targetTab}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    
                    // Update iframe src with employee ID for specific tabs
                    const iframe = targetContent.querySelector('iframe');
                    if (iframe && employeeId) {
                        const currentSrc = iframe.getAttribute('src');
                        // Only update if not already set with employee ID
                        if (!currentSrc.includes('employeeId=')) {
                            const separator = currentSrc.includes('?') ? '&' : '?';
                            iframe.setAttribute('src', `${currentSrc}${separator}employeeId=${employeeId}`);
                        }
                    }
                }
            });
        });
    }

    // Initialize tabs after profile loads
    window.addEventListener('DOMContentLoaded', () => {
        initTabs();
    });

    // Load Leave Quota Data
    async function loadLeaveQuota() {
        try {
            // Mock data for now - replace with actual API call
            const leaveQuotaData = {
                totalLeaves: 24,
                leavesTaken: 8,
                remainingLeaves: 16,
                quotaDetails: [
                    {
                        leaveType: 'Casual Leave',
                        typeClass: 'casual',
                        allocated: 12,
                        used: 4,
                        remaining: 8
                    },
                    {
                        leaveType: 'Sick Leave',
                        typeClass: 'sick',
                        allocated: 8,
                        used: 3,
                        remaining: 5
                    },
                    {
                        leaveType: 'Earned Leave',
                        typeClass: 'earned',
                        allocated: 4,
                        used: 1,
                        remaining: 3
                    }
                ]
            };

            // Update summary cards
            document.getElementById('totalLeaves').textContent = leaveQuotaData.totalLeaves;
            document.getElementById('leavesTaken').textContent = leaveQuotaData.leavesTaken;
            document.getElementById('remainingLeaves').textContent = leaveQuotaData.remainingLeaves;

            // Update quota table
            const tbody = document.getElementById('quotaTableBody');
            tbody.innerHTML = leaveQuotaData.quotaDetails.map(quota => {
                const percentage = (quota.remaining / quota.allocated) * 100;
                let statusClass = 'good';
                let statusText = 'Good';
                
                if (percentage <= 25) {
                    statusClass = 'critical';
                    statusText = 'Critical';
                } else if (percentage <= 50) {
                    statusClass = 'warning';
                    statusText = 'Low';
                }

                return `
                    <tr>
                        <td>
                            <div class="leave-type-badge">
                                <span class="leave-type-dot ${quota.typeClass}"></span>
                                ${quota.leaveType}
                            </div>
                        </td>
                        <td><strong>${quota.allocated}</strong></td>
                        <td>${quota.used}</td>
                        <td><strong>${quota.remaining}</strong></td>
                        <td>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading leave quota:', error);
            document.getElementById('quotaTableBody').innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: #ef4444;">
                        Failed to load leave quota data
                    </td>
                </tr>
            `;
        }
    }

    // Load leave quota when tab is clicked
    document.addEventListener('DOMContentLoaded', () => {
        const leaveQuotaTab = document.querySelector('[data-tab="leave-quota"]');
        if (leaveQuotaTab) {
            leaveQuotaTab.addEventListener('click', () => {
                loadLeaveQuota();
            });
        }
    });
})();
