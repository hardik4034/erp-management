# Toast Notification System - Implementation Guide

## Overview

A modern, beautiful toast notification system has been implemented across your entire HR Management System. Toast notifications provide non-intrusive feedback to users for various actions.

## Features

✅ **Multiple Types**: Success, Error, Warning, and Info notifications
✅ **Auto-dismiss**: Notifications automatically disappear after 4 seconds (customizable)
✅ **Manual Close**: Users can close notifications manually
✅ **Smooth Animations**: Slide-in and slide-out animations
✅ **Responsive Design**: Works perfectly on mobile and desktop
✅ **Dark Mode Support**: Automatically adapts to dark mode preferences
✅ **Promise Support**: Built-in support for async operations
✅ **Custom Messages**: Fully customizable titles and messages

## Usage Examples

### Basic Usage

```javascript
// Success notification
toast.success("Employee created successfully");

// Error notification
toast.error("Failed to save data");

// Warning notification
toast.warning("Please fill all required fields");

// Info notification
toast.info("Processing your request...");
```

### Custom Duration

```javascript
// Show for 6 seconds instead of default 4
toast.success("Operation completed", 6000);

// Show indefinitely (until manually closed)
toast.success("Important message", 0);
```

### Custom Title and Message

```javascript
toast.custom("Custom Title", "Your custom message here", "success", 4000);
```

### Promise-based Toast (for async operations)

```javascript
// Automatically shows loading, then success or error
await toast.promise(endpoints.employees.create(data), {
  loading: "Creating employee...",
  success: "Employee created successfully!",
  error: "Failed to create employee",
});
```

### Using with Existing Code

The toast system is already integrated with the existing `utils.showAlert()` function, so all your existing code will automatically use toasts:

```javascript
utils.showAlert("Employee saved", "success");
// This will now show a beautiful toast notification!
```

## Files Added

1. **`/frontend/scripts/toast.js`** - Toast notification JavaScript library
2. **`/frontend/styles/toast.css`** - Toast notification styles

## Files Modified

1. **`/frontend/scripts/api.js`** - Updated `showAlert()` to use toast notifications
2. **`/frontend/index.html`** - Added toast CSS and JS
3. **`/frontend/pages/appreciations.html`** - Added toast CSS and JS
4. **`/frontend/pages/employees.html`** - Added toast CSS and JS

## Integration Steps for Remaining Pages

To add toast notifications to other pages, add these two lines:

### In the `<head>` section:

```html
<link rel="stylesheet" href="../styles/toast.css" />
```

### Before other `<script>` tags:

```html
<script src="../scripts/toast.js"></script>
```

## API Reference

### Methods

#### `toast.show(message, type, duration)`

- **message** (string): The message to display
- **type** (string): 'success', 'error', 'warning', or 'info'
- **duration** (number): Duration in milliseconds (0 = indefinite)

#### `toast.success(message, duration)`

Shows a success notification

#### `toast.error(message, duration)`

Shows an error notification

#### `toast.warning(message, duration)`

Shows a warning notification

#### `toast.info(message, duration)`

Shows an info notification

#### `toast.custom(title, message, type, duration)`

Shows a custom notification with a custom title

#### `toast.promise(promise, messages)`

Shows loading, then success or error based on promise result

- **promise**: The promise to track
- **messages**: Object with `loading`, `success`, and `error` messages

#### `toast.clearAll()`

Removes all active toast notifications

## Styling Customization

Toast notifications can be customized by modifying `/frontend/styles/toast.css`:

- **Colors**: Modify the color variables for each type
- **Position**: Change `.toast-container` position (currently top-right)
- **Size**: Adjust `min-width` and `max-width` in `.toast`
- **Animation**: Modify `transition` properties for different effects

## Browser Compatibility

✅ Chrome (latest)
✅ Firefox (latest)
✅ Safari (latest)
✅ Edge (latest)
✅ Mobile browsers

## Examples in Your Code

### Employee Creation

```javascript
async function saveEmployee() {
  try {
    await endpoints.employees.create(data);
    toast.success("Employee created successfully");
    closeModal();
    loadEmployees();
  } catch (error) {
    toast.error(error.message || "Failed to save employee");
  }
}
```

### Appreciation Creation

```javascript
async function saveAppreciation() {
  try {
    await endpoints.appreciations.create(formData);
    toast.success("Appreciation created successfully");
    closeModal();
    loadAppreciations();
  } catch (error) {
    toast.error("Failed to save appreciation");
  }
}
```

### Delete Confirmation

```javascript
async function deleteEmployee(id) {
  if (!confirm("Are you sure?")) return;

  try {
    await endpoints.employees.delete(id);
    toast.success("Employee deleted successfully");
    loadEmployees();
  } catch (error) {
    toast.error("Failed to delete employee");
  }
}
```

## Tips

1. **Keep messages concise**: Short, clear messages work best
2. **Use appropriate types**: Match the notification type to the action
3. **Don't overuse**: Too many notifications can be annoying
4. **Test on mobile**: Ensure notifications look good on small screens
5. **Consider timing**: Adjust duration based on message importance

## Support

For issues or questions about the toast notification system, refer to this documentation or check the implementation in `/frontend/scripts/toast.js`.
