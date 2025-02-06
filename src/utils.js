/**
 * Shared constants and utility functions
 */

// ======================
// Constants
// ======================
const FALLBACK_ICONS = {
    GLOBE: 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
            <path d="
                M20 50 h60
                M50 20 v60
                M25 30 A40 40 0 0 1 75 30
                M25 70 A40 40 0 0 0 75 70
            " stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none"/>
        </svg>
    `),
    SEARCH: 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path fill="rgba(255,255,255,0.3)" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
    `)
};

// ======================
// Storage Management
// ======================

/**
 * Safely retrieves and validates data from localStorage
 * Handles different data types and provides validation per key
 */
function safeGet(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        if (!value) return defaultValue;
        
        const parsed = JSON.parse(value);
        
        switch(key) {
            case 'bookmarks':
                return isValidBookmarksArray(parsed) ? parsed : defaultValue;
            case 'deletedDefaults':
                return Array.isArray(parsed) ? parsed.filter(url => typeof url === 'string') : defaultValue;
            case 'customSearchEngines':
                return typeof parsed === 'object' ? parsed : defaultValue;
            default:
                return parsed;
        }
    } catch (error) {
        console.error('LocalStorage read/validation error:', error);
        return defaultValue;
    }
}

/**
 * Safely writes data to localStorage with quota handling
 * Shows storage manager if quota is exceeded
 */
function safeSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('LocalStorage write error:', error);
        
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            const storageInfo = getStorageInfo();
            const message = `Storage is full (${storageInfo?.percentUsed} used).\n\n` +
                          'Would you like to open storage settings to clear some space?';
            
            if (confirm(message)) {
                showStorageManager();
            }
        } else {
            alert('Failed to save data: ' + error.message);
        }
        return false;
    }
}

/**
 * Safely removes data from localStorage
 */
function safeRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('LocalStorage remove error:', error);
        return false;
    }
}

/**
 * Calculates storage usage statistics for localStorage
 * Returns total size, per-item sizes, and percentage used
 */
function getStorageInfo() {
    let total = 0;
    let items = {};
    
    try {
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = localStorage[key].length * 2;
                total += size;
                items[key] = (size / 1024).toFixed(2) + ' KB';
            }
        }
        
        return {
            total: (total / 1024).toFixed(2) + ' KB',
            items: items,
            percentUsed: ((total / 5242880) * 100).toFixed(1) + '%'
        };
    } catch (error) {
        console.error('Error calculating storage:', error);
        return null;
    }
}

/**
 * Creates and displays the storage management dialog
 * Allows users to view and clear stored data
 */
function showStorageManager() {
    const existingDialog = document.querySelector('.storage-manager')?.closest('.edit-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('storageManagerTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    // Update content with storage info
    const storageInfo = getStorageInfo();
    dialog.querySelector('.storage-total').textContent = 
        `Total Used: ${storageInfo.total} (${storageInfo.percentUsed})`;
    
    const itemsContainer = dialog.querySelector('.storage-items');
    Object.entries(storageInfo.items).forEach(([key, size]) => {
        const item = document.createElement('div');
        item.className = 'storage-item';
        item.innerHTML = `
                            <span>${key}: ${size}</span>
                            <button class="clear-btn" data-key="${key}">Clear</button>
        `;
        itemsContainer.appendChild(item);
    });

    dialog.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            createConfirmDialog(`Clear ${key}?`, () => {
                localStorage.removeItem(key);
                showStorageManager();
            });
        });
    });
    
    dialog.querySelector('.clear-all-btn').addEventListener('click', () => {
        createConfirmDialog('Clear all data? This cannot be undone.', () => {
            localStorage.clear();
            location.reload();
        });
    });
    
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
    });
    
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    document.body.appendChild(dialog);
    return dialog;
}

// ======================
// Validation Functions
// ======================

/**
 * Validates a bookmark object has all required properties and correct types
 */
function isValidBookmark(bookmark) {
    try {
        return (
            bookmark &&
            typeof bookmark === 'object' &&
            typeof bookmark.name === 'string' &&
            typeof bookmark.url === 'string' &&
            bookmark.name.length > 0 &&
            bookmark.name.length < 100 &&
            (!bookmark.iconUrl || typeof bookmark.iconUrl === 'string') &&
            new URL(bookmark.url)
        );
    } catch {
        return false;
    }
}

/**
 * Validates an array of bookmarks against size limits and individual bookmark validity
 */
function isValidBookmarksArray(bookmarks) {
    return (
        Array.isArray(bookmarks) &&
        bookmarks.length <= 100 && 
        bookmarks.every(isValidBookmark)
    );
}

/**
 * Validates user input with configurable rules and security checks
 * @param {HTMLInputElement} input - Input element to validate
 * @param {Object} options - Validation options (maxLength, minLength, type, optional)
 * @returns {Object} Validation result with valid boolean and value/error
 */
function validateInput(input, options = {}) {
    const {
        maxLength = 100,
        minLength = 1,
        type = 'text',
        optional = false
    } = options;

    const value = input.value.trim();
    
    if (!value && optional) {
        return { valid: true, value: '' };
    }
    
    if (!value || typeof value !== 'string') {
        return {
            valid: false,
            error: 'Invalid input'
        };
    }

    // Prevent extremely long inputs
    if (value.length > maxLength) {
        return {
            valid: false,
            error: `Input must be less than ${maxLength} characters`
        };
    }

    if (value.length < minLength) {
        return {
            valid: false,
            error: `Input must be at least ${minLength} characters`
        };
    }

    // URL-specific validation
    if (type === 'url') {
        try {
            const url = new URL(value);
            
            // Allow file:// protocol if local URLs are enabled
            const allowedProtocols = ['http:', 'https:'];
            if (isLocalUrlAllowed()) {
                allowedProtocols.push('file:');
            }
            
            if (!allowedProtocols.includes(url.protocol)) {
                return {
                    valid: false,
                    error: `Only ${allowedProtocols.join(', ')} protocols are allowed`
                };
            }

            // Check for local URLs
            if (!isLocalUrlAllowed()) {
                const hostname = url.hostname.toLowerCase();
                if (hostname === 'localhost' || 
                    hostname.match(/^127\./) ||
                    hostname.match(/^192\.168\./) ||
                    hostname.match(/^10\./) ||
                    hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
                    hostname.endsWith('.local')) {
                    return {
                        valid: false,
                        error: 'Local addresses are not allowed. Enable local URLs in settings to use them.'
                    };
                }
            }

            return { valid: true, value: value };
        } catch {
            return {
                valid: false,
                error: 'Please enter a valid URL'
            };
        }
    }

    // Name-specific validation
    if (type === 'text') {
        // Prevent HTML-like content and potentially malicious characters
        if (value.includes('<') || value.includes('>') || /[<>{}()\[\]\\\/]/.test(value)) {
            return {
                valid: false,
                error: 'Name contains invalid characters'
            };
        }
    }

    return { valid: true, value: value };
}

/**
 * Checks if a string is a valid URL that a browser would accept
 * Handles both explicit and implicit protocols
 * @param {string} str - String to test
 * @returns {boolean} True if string is a valid URL
 */
function isValidBrowserUrl(str) {
    try {
        // Trim whitespace
        str = str.trim();
        
        // Handle localhost with port
        if (/^localhost(:\d+)?(\/.*)?$/.test(str)) {
            return true;
        }
        
        // If no protocol specified, try to detect if it's a valid domain pattern
        if (!str.includes('://')) {
            // Match common domain patterns like:
            // - www.example.com
            // - example.com
            // - sub.example.com
            // - example.com/path
            // - example.com:8080
            const domainPattern = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(:\d+)?(\/[^<>"]*)?$/;
            
            if (domainPattern.test(str)) {
                return true;
            }
            
            // If it doesn't match domain pattern, it's not a valid URL
            return false;
        }
        
        // For URLs with explicit protocols
        const url = new URL(str);
        
        // Check if it has a valid protocol
        const validProtocols = ['http:', 'https:', 'ftp:', 'file:'];
        if (!validProtocols.includes(url.protocol)) {
            return false;
        }
        
        // Check for invalid characters in the rest of the URL
        const urlWithoutProtocol = str.substring(url.protocol.length).trim();
        if (urlWithoutProtocol.includes(' ') || /[<>"]/.test(urlWithoutProtocol)) {
            return false;
        }
        
        return true;
    } catch {
        return false;
    }
}

// ======================
// Icon Management
// ======================

let alternativeIcons = null;
let alternativeIconsPromise = null;

/**
 * Fetches alternative icons from CDN
 */
async function fetchAlternativeIcons() {
    // Return cached result if available
    if (alternativeIcons !== null) return alternativeIcons;
    
    // Return existing promise if a fetch is already in progress
    if (alternativeIconsPromise !== null) return alternativeIconsPromise;
    
    try {
        // Store the promise so concurrent calls can use it
        alternativeIconsPromise = fetch('https://cdn.jsdelivr.net/gh/nazdridoy/nazhome@maintainAltIcons/alternativeIcons.json')
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch alternative icons');
                return response.json();
            })
            .then(data => {
                alternativeIcons = data;  // Cache the result
                alternativeIconsPromise = null;  // Clear the promise
                return data;
            })
            .catch(error => {
                console.error('Error fetching alternative icons:', error);
                alternativeIconsPromise = null;  // Clear the promise on error
                return {};
            });
        
        return alternativeIconsPromise;
    } catch (error) {
        console.error('Error fetching alternative icons:', error);
        alternativeIconsPromise = null;
        return {};
    }
}

/**
 * Multi-stage favicon resolution with fallbacks:
 * 1. User provided icon
 * 2. Alternative icons list
 * 3. DuckDuckGo favicon service
 * 4. Google favicon service
 */
async function resolveFavicon(url, userIcon = '') {
    // 1. Use user-provided icon if available
    if (userIcon) return userIcon;

    try {
        const urlObj = new URL(url);
        
        // Skip icon resolution for local URLs if no custom icon
        if (urlObj.protocol === 'file:' || 
            urlObj.hostname === 'localhost' || 
            urlObj.hostname.match(/^127\./) ||
            urlObj.hostname.match(/^192\.168\./) ||
            urlObj.hostname.match(/^10\./) ||
            urlObj.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
            urlObj.hostname.endsWith('.local')) {
            return FALLBACK_ICONS.GLOBE;  // Changed from DEFAULT_FALLBACK_ICON
        }

        const domain = urlObj.hostname;
        
        // 2. Check alternative icons list
        const alternatives = await fetchAlternativeIcons();
        if (alternatives[domain]) {
            return alternatives[domain];
        }

        // 3. Try DuckDuckGo's favicon service
        return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch (error) {
        console.error('Error resolving favicon:', error);
        // 4. Fallback to Google
        return `https://www.google.com/s2/favicons?domain=${url}&sz=32`;
    }
}

// ======================
// UI Utilities
// ======================

/**
 * Creates a confirmation dialog with customizable message and action
 */
function createConfirmDialog(message, onConfirm, confirmText = 'Delete') {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('confirmDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    dialog.querySelector('.confirm-message').textContent = message;
    const confirmBtn = dialog.querySelector('.confirm-btn');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `confirm-btn ${confirmText.toLowerCase()}-btn`;
    
    confirmBtn.addEventListener('click', () => {
        onConfirm();
        dialog.remove();
    });

    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    document.body.appendChild(dialog);
    return dialog;
}

/**
 * Shows a toast notification
 */
function showToast(message, type = 'error') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon;
    switch (type) {
        case 'error':
            icon = '⛔'; // or '❌'
            break;
        case 'warning':
            icon = '⚠️';
            break;
        case 'success':
            icon = '✅';
            break;
        default:
            icon = 'ℹ️';
    }
    
    toast.innerHTML = `
        <i>${icon}</i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger reflow for animation
    toast.offsetHeight;
    toast.classList.add('show');
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Sanitizes HTML string to prevent XSS
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ======================
// Security & Settings
// ======================

/**
 * Checks if local URLs are allowed in settings
 */
function isLocalUrlAllowed() {
    return safeGet('allowLocalUrls') || false;
}

// Export all utilities
export {
    // Constants
    FALLBACK_ICONS,
    // Storage Management
    safeGet,
    safeSet,
    safeRemove,
    getStorageInfo,
    showStorageManager,
    // Validation
    isValidBookmark,
    isValidBookmarksArray,
    validateInput,
    isValidBrowserUrl,
    // Icon Management
    fetchAlternativeIcons,
    resolveFavicon,
    // UI Utilities
    createConfirmDialog,
    showToast,
    sanitizeHTML,
    // Security & Settings
    isLocalUrlAllowed
};