// Toast Notification System
class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Get icon based on type
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${this.getTitle(type)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        this.container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('toast-show'), 10);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('toast-show');
                toast.classList.add('toast-hide');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    }

    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    getTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || titles.info;
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    // Custom toast with custom title
    custom(title, message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        this.container.appendChild(toast);
        setTimeout(() => toast.classList.add('toast-show'), 10);

        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('toast-show');
                toast.classList.add('toast-hide');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    }

    // Promise-based toast for async operations
    async promise(promise, messages = {}) {
        const defaultMessages = {
            loading: 'Processing...',
            success: 'Operation completed successfully',
            error: 'Operation failed'
        };

        const msgs = { ...defaultMessages, ...messages };
        
        // Show loading toast
        const loadingToast = this.custom('Loading', msgs.loading, 'info', 0);
        
        try {
            const result = await promise;
            loadingToast.remove();
            this.success(msgs.success);
            return result;
        } catch (error) {
            loadingToast.remove();
            this.error(msgs.error || error.message);
            throw error;
        }
    }

    // Clear all toasts
    clearAll() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Initialize toast system
const toast = new ToastNotification();

// Export to window
window.toast = toast;
