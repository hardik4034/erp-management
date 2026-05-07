
document.addEventListener('DOMContentLoaded', () => {
    const sidebar  = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn  = document.getElementById('sidebarClose');
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const overlay  = document.querySelector('.sidebar-overlay');
    const mainContent = document.querySelector('.main-content');

    // ── Mobile toggle ──────────────────────────────────────────
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    }
    function closeSidebar() {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    if (toggleBtn) toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(); });
    if (closeBtn)  closeBtn.addEventListener('click', closeSidebar);
    if (overlay)   overlay.addEventListener('click', closeSidebar);

    // ── Desktop collapse ───────────────────────────────────────
    const COLLAPSE_KEY = 'hrms_sidebar_collapsed';

    function applySidebarCollapse(collapsed) {
        sidebar.classList.toggle('collapsed', collapsed);
        localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    }

    // Restore saved state
    if (window.innerWidth > 992) {
        applySidebarCollapse(localStorage.getItem(COLLAPSE_KEY) === '1');
    }

    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.contains('collapsed');
            applySidebarCollapse(!isCollapsed);
        });
    }

    // ── Active link highlighting ───────────────────────────────
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        link.classList.remove('active');
        try {
            const linkPath = new URL(link.href).pathname;
            if (currentPath === linkPath || (currentPath === '/' && linkPath === '/index.html')) {
                link.classList.add('active');
            }
        } catch(e) {}

        // Mobile close on nav click
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) closeSidebar();
        });
    });

    // ── Resize cleanup ─────────────────────────────────────────
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }
    });
});
