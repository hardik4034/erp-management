
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarClose');
    const overlay = document.querySelector('.sidebar-overlay');

    // Function to toggle sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        if (overlay) {
            overlay.classList.toggle('active');
        }
    }

    // Function to close sidebar
    function closeSidebar() {
        sidebar.classList.remove('active');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when clicking a nav link on mobile
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) {
                closeSidebar();
            }
        });
    });

    // Handle resize events to cleanup state
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }
    });
});
