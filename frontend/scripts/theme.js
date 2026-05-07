document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('darkModeBtn');
    const DARK_KEY = 'hrms_dark_mode';
    
    function applyTheme(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        if (btn) {
            btn.textContent = dark ? '☀️' : '🌙';
        }
    }
    
    // Initial load
    const savedTheme = localStorage.getItem(DARK_KEY);
    // Default to light if not set, or you could do system preference:
    // const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme === '1');
    
    if (btn) {
        btn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            localStorage.setItem(DARK_KEY, isDark ? '0' : '1');
            applyTheme(!isDark);
        });
    }
});
