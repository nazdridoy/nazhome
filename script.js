// Search engines configuration
const searchEngines = {
    google: 'https://www.google.com/search?q=',
    ddg: 'https://duckduckgo.com/?q=',
    brave: 'https://search.brave.com/search?q=',
    yandex: 'https://yandex.com/search/?text='
};

// Search functionality
document.getElementById('searchForm').onsubmit = function(e) {
    e.preventDefault();
    const query = document.querySelector('input[type="search"]').value.trim();
    if (!query) return;
    
    const engine = document.getElementById('searchEngine').dataset.engine;
    
    // Check if it's a custom engine
    const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
    if (customEngines[engine]) {
        const searchUrl = customEngines[engine].url.replace('{searchTerm}', encodeURIComponent(query));
        window.location.href = searchUrl;
    } else {
        window.location.href = searchEngines[engine] + encodeURIComponent(query);
    }
};

// Date/time display
function updateDateTime() {
    const now = new Date();
    
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    };
    const time = now.toLocaleTimeString('en-US', timeOptions);
    
    const dateOptions = { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric'
    };
    const date = now.toLocaleDateString('en-US', dateOptions);
    
    document.getElementById('datetime').innerHTML = `
        <span class="time">${time}</span>
        <span class="date">${date}</span>
    `;
}

setInterval(updateDateTime, 1000);
updateDateTime();

// Add these functions for background image management
function getBackgroundCache() {
    return JSON.parse(localStorage.getItem('backgroundCache') || '[]');
}

function setBackgroundCache(cache) {
    const cacheWithTimestamps = cache.map(item => {
        // If item is already in the new format, keep it as is
        if (typeof item === 'object' && item.image) {
            return item;
        }
        // Convert old format (just image string) to new format
        return {
            image: item,
            timestamp: Date.now()
        };
    });
    localStorage.setItem('backgroundCache', JSON.stringify(cacheWithTimestamps));
}

async function imageToBase64(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(new Error(`Failed to convert image: ${error}`));
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to convert image to base64:', error);
        // Return a default image or null instead of silently failing
        return null;
    }
}

async function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = reject;
        img.src = url;
    });
}

async function fetchNewBackgroundImage() {
    const timestamp = Date.now();
    const url = `https://picsum.photos/1920/1080?random=${timestamp}`;
    try {
        const base64Image = await imageToBase64(url);
        if (!base64Image) {
            // Handle the failure case by using a fallback or previous image
            console.warn('Failed to load new background image, using fallback');
            return null;
        }
        return base64Image;
    } catch (error) {
        console.error('Failed to load new background:', error);
        return null;
    }
}

async function updateBackgroundCache() {
    const cache = getBackgroundCache();
    const newImage = await fetchNewBackgroundImage();
    
    if (newImage) {
        // Keep the three most recent images
        cache.push(newImage);
        while (cache.length > 3) {  // Changed from 4 to 3
            cache.shift(); // Remove oldest image
        }
        setBackgroundCache(cache);
    }
}

// Add a function to rotate through cached backgrounds
function rotateBackground() {
    const cache = getBackgroundCache();
    if (cache.length <= 1) return; // Nothing to rotate if only one or no images
    
    // Sort by timestamp to ensure proper rotation
    const sortedCache = [...cache].sort((a, b) => a.timestamp - b.timestamp);
    const rotatedCache = [...sortedCache.slice(1), {
        ...sortedCache[0],
        timestamp: Date.now() // Update timestamp when rotated
    }];
    
    setBackgroundCache(rotatedCache);
    document.body.style.backgroundImage = `url('${rotatedCache[0].image}')`;
}

// Update loadBackground function to prioritize filling the cache
function loadBackground() {
    const cache = getBackgroundCache();
    
    if (cache.length > 0) {
        // Use the oldest cached image
        const oldestImage = cache[0].image;
        document.body.style.backgroundImage = `url('${oldestImage}')`;
        
        // After page loads, check if we need to fill cache or update
        window.addEventListener('load', () => {
            setTimeout(async () => {
                if (cache.length < 3) {
                    // Still filling up cache
                    const newImage = await fetchNewBackgroundImage();
                    if (newImage) {
                        setBackgroundCache([...cache, {
                            image: newImage,
                            timestamp: Date.now()
                        }]);
                    }
                } else {
                    // Find the oldest image by timestamp
                    const oldestTimestamp = Math.min(...cache.map(item => item.timestamp));
                    const newImage = await fetchNewBackgroundImage();
                    if (newImage) {
                        const newCache = cache
                            .filter(item => item.timestamp !== oldestTimestamp)
                            .concat({
                                image: newImage,
                                timestamp: Date.now()
                            });
                        setBackgroundCache(newCache);
                    } else {
                        rotateBackground();
                    }
                }
            }, 1000);
        });
    } else {
        // No cache, start fresh
        fetchNewBackgroundImage().then(base64Image => {
            if (base64Image) {
                document.body.style.backgroundImage = `url('${base64Image}')`;
                setBackgroundCache([{
                    image: base64Image,
                    timestamp: Date.now()
                }]);
                
                // Fill remaining cache slots
                setTimeout(async () => {
                    const cache = getBackgroundCache();
                    while (cache.length < 3) {
                        const nextImage = await fetchNewBackgroundImage();
                        if (nextImage) {
                            cache.push({
                                image: nextImage,
                                timestamp: Date.now()
                            });
                            setBackgroundCache(cache);
                        }
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }, 1000);
            }
        });
    }
}

// Update the initialization
function initializeBackground() {
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    loadBackground();
}

// Update getBestIcon function to use DuckDuckGo's favicon service
function getBestIcon(url) {
    try {
        const urlObj = new URL(url);
        
        // Return default icon for local/file URLs
        if (urlObj.protocol === 'file:' || 
            urlObj.hostname === 'localhost' || 
            urlObj.hostname.match(/^127\./) ||
            urlObj.hostname.match(/^192\.168\./) ||
            urlObj.hostname.match(/^10\./) ||
            urlObj.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
            urlObj.hostname.endsWith('.local')) {
            return DEFAULT_FALLBACK_ICON;
        }
        
        // Use DuckDuckGo's favicon service
        return `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`;
        
    } catch (error) {
        // Fallback to default icon
        return DEFAULT_FALLBACK_ICON;
    }
}

// Add this constant for the default fallback icon
const DEFAULT_FALLBACK_ICON = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="20" fill="#555"/>
        <text x="50" y="50" font-family="Arial" font-size="50" 
              text-anchor="middle" dy=".3em" fill="#fff">?</text>
    </svg>
`);

// Add these validation helpers
function isValidBookmark(bookmark) {
    try {
        return (
            bookmark &&
            typeof bookmark === 'object' &&
            typeof bookmark.name === 'string' &&
            typeof bookmark.url === 'string' &&
            bookmark.name.length > 0 &&
            bookmark.name.length < 100 && // reasonable length limit
            (!bookmark.iconUrl || typeof bookmark.iconUrl === 'string') && // optional icon URL
            new URL(bookmark.url) // validates URL format
        );
    } catch {
        return false;
    }
}

function isValidBookmarksArray(bookmarks) {
    return (
        Array.isArray(bookmarks) &&
        bookmarks.length <= 100 && // reasonable limit
        bookmarks.every(isValidBookmark)
    );
}

// Update safeGet to include validation
function safeGet(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        if (!value) return defaultValue;
        
        const parsed = JSON.parse(value);
        
        // Validate based on key type
        switch(key) {
            case 'bookmarks':
                return isValidBookmarksArray(parsed) ? parsed : defaultValue;
            case 'deletedDefaults':
                return Array.isArray(parsed) ? parsed.filter(url => typeof url === 'string') : defaultValue;
            case 'customSearchEngines':
                // Add validation for custom search engines if needed
                return typeof parsed === 'object' ? parsed : defaultValue;
            default:
                return parsed;
        }
    } catch (error) {
        console.error('LocalStorage read/validation error:', error);
        return defaultValue;
    }
}

// Add these storage management functions
function getStorageInfo() {
    let total = 0;
    let items = {};
    
    try {
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = localStorage[key].length * 2; // in bytes
                total += size;
                items[key] = (size / 1024).toFixed(2) + ' KB';
            }
        }
        
        return {
            total: (total / 1024).toFixed(2) + ' KB',
            items: items,
            percentUsed: ((total / 5242880) * 100).toFixed(1) + '%' // 5MB limit
        };
    } catch (error) {
        console.error('Error calculating storage:', error);
        return null;
    }
}

// Update safeSet with better error handling
function safeSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('LocalStorage write error:', error);
        
        // Check if it's a quota error
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

function safeRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('LocalStorage remove error:', error);
        return false;
    }
}

// Add this sanitization helper at the top
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Add these functions for drag and drop functionality
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const draggedItem = document.querySelector('.dragging');
    if (!draggedItem) return;

    const grid = document.getElementById('quickLinks');
    const siblings = [...grid.querySelectorAll('.quick-link:not(.dragging)')];
    
    // Get the closest sibling based on mouse position
    let closestSibling = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    
    siblings.forEach(sibling => {
        const box = sibling.getBoundingClientRect();
        const offset = e.clientX - box.left - box.width / 2;
        
        if (offset < 0 && offset > closestOffset) {
            closestOffset = offset;
            closestSibling = sibling;
        }
    });
    
    // If we found a closest sibling, insert before it
    if (closestSibling) {
        grid.insertBefore(draggedItem, closestSibling);
    } else {
        // If no closest sibling found, append to the end (before the add button)
        const addButton = grid.querySelector('.add-bookmark');
        grid.insertBefore(draggedItem, addButton);
    }
}

function handleDrop(e) {
    e.preventDefault();
    const draggedItem = document.querySelector('.dragging');
    if (!draggedItem) return;
    
    const grid = document.getElementById('quickLinks');
    const items = [...grid.querySelectorAll('.quick-link')];
    const newOrder = items.map(item => parseInt(item.dataset.index));
    
    // Get current bookmarks
    const bookmarks = safeGet('bookmarks') || [];
    
    // Create new array with reordered bookmarks
    const reorderedBookmarks = newOrder.map(index => bookmarks[index]).filter(Boolean);
    
    // Save and reload
    if (!safeSet('bookmarks', reorderedBookmarks)) return;
    loadBookmarks();
}

// Add these functions for bookmark UI settings
function getBookmarkSettings() {
    return {
        hideAddButton: safeGet('hideAddButton') || false
    };
}

function saveBookmarkSettings(settings) {
    return safeSet('hideAddButton', settings.hideAddButton);
}

// Update the loadBookmarks function to respect the hide setting
function loadBookmarks() {
    const bookmarks = safeGet('bookmarks') || [];
    const grid = document.getElementById('quickLinks');
    grid.innerHTML = '';

    // Add drag and drop event listeners to the grid
    grid.addEventListener('dragover', handleDragOver);
    grid.addEventListener('drop', handleDrop);

    bookmarks.forEach((bookmark, index) => {
        const link = document.createElement('a');
        link.href = bookmark.url;
        link.className = 'quick-link';
        link.draggable = true;
        link.dataset.index = index;
        
        // Add drag event listeners
        link.addEventListener('dragstart', handleDragStart);
        link.addEventListener('dragend', handleDragEnd);
        
        const hostname = new URL(bookmark.url).hostname;
        const faviconUrl = bookmark.iconUrl || getBestIcon(bookmark.url);
        
        // Sanitize user-provided content
        const sanitizedName = sanitizeHTML(bookmark.name);
        
        const content = `
            <div class="quick-link-menu">
                <div class="menu-items">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
                <span class="menu-dots">⋮</span>
            </div>
            <div class="icon-wrapper">
                <img src="${faviconUrl}" 
                     alt="${sanitizedName}"
                     onerror="if(this.src !== '${DEFAULT_FALLBACK_ICON}') this.src='https://www.google.com/s2/favicons?domain=${hostname}&sz=64'; else this.onerror=null;">
            </div>
            <span>${sanitizedName}</span>
        `;
        link.innerHTML = content;

        // Update menu click handling
        const menuDots = link.querySelector('.menu-dots');
        const menuItems = link.querySelector('.menu-items');
        
        menuDots.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Close all other open menus first
            document.querySelectorAll('.menu-items.active').forEach(menu => {
                if (menu !== menuItems) {
                    menu.classList.remove('active');
                }
            });
            
            // Toggle current menu
            menuItems.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuItems.contains(e.target) && !menuDots.contains(e.target)) {
                menuItems.classList.remove('active');
            }
        });

        // Edit button handler
        link.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.preventDefault();
            const dialog = createEditDialog(bookmark.name, bookmark.url, bookmark.iconUrl);
            
            const editForm = dialog.querySelector('#editForm');
            const nameInput = dialog.querySelector('#editName');
            const urlInput = dialog.querySelector('#editUrl');
            const iconInput = dialog.querySelector('#editIcon');
            
            // Handle form submission
            editForm.onsubmit = (e) => {
                e.preventDefault();
                const nameValidation = validateInput(nameInput, { maxLength: 50 });
                if (!nameValidation.valid) {
                    alert(nameValidation.error);
                    return;
                }

                const urlValidation = validateInput(urlInput, { type: 'url' });
                if (!urlValidation.valid) {
                    alert(urlValidation.error);
                    return;
                }

                const iconUrl = iconInput.value.trim();
                if (iconUrl && !validateInput(iconInput, { type: 'url', optional: true }).valid) {
                    alert('Please enter a valid icon URL or leave it empty');
                    return;
                }
                
                bookmarks[index] = {
                    name: sanitizeHTML(nameValidation.value),
                    url: urlValidation.value,
                    iconUrl: iconUrl || null
                };
                
                if (!safeSet('bookmarks', bookmarks)) return;
                loadBookmarks();
                dialog.remove();
            };

            // Handle cancel button
            dialog.querySelector('.cancel-btn').onclick = () => {
                dialog.remove();
            };

            // Close dialog when clicking outside
            dialog.onclick = (e) => {
                if (e.target === dialog) {
                    dialog.remove();
                }
            };

            // Focus the name input
            nameInput.focus();
        });

        // Delete button handler
        link.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.preventDefault();
            createConfirmDialog('Delete this bookmark?', () => {
                // Check if this is a default bookmark
                const defaultBookmarks = getDefaultBookmarks();
                const isDefault = defaultBookmarks.some(def => def.url === bookmark.url);
                
                if (isDefault) {
                    // Add to deleted defaults list
                    const deletedDefaults = getDeletedDefaults();
                    if (!deletedDefaults.includes(bookmark.url)) {
                        deletedDefaults.push(bookmark.url);
                        if (!safeSet('deletedDefaults', deletedDefaults)) return;
                    }
                }
                
                // Remove from current bookmarks
                bookmarks.splice(index, 1);
                if (!safeSet('bookmarks', bookmarks)) return;
                loadBookmarks();
            });
        });

        grid.appendChild(link);
    });

    // Add the "+" button (not draggable)
    const addButton = document.createElement('a');
    addButton.href = '#';
    addButton.className = 'add-bookmark';
    addButton.draggable = false;
    addButton.innerHTML = `
        <div class="add-button">
            <span class="plus-icon">+</span>
        </div>
        <span>Add Link</span>
    `;

    // Check if add button should be hidden
    const settings = getBookmarkSettings();
    if (!settings.hideAddButton) {
        grid.appendChild(addButton);
    }

    // Add handler for the "+" button
    addButton.addEventListener('click', (e) => {
        e.preventDefault();
        const dialog = createAddDialog();
        
        const addForm = dialog.querySelector('#addForm');
        const urlInput = dialog.querySelector('#addUrl');
        const nameInput = dialog.querySelector('#addName');
        const iconInput = dialog.querySelector('#addIcon');
        
        // Focus URL input
        urlInput.focus();
        
        // Handle URL input change to auto-fill name
        urlInput.addEventListener('change', () => {
            try {
                const url = new URL(urlInput.value);
                if (!nameInput.value) {
                    nameInput.value = url.hostname.replace('www.', '');
                }
            } catch (error) {
                // Invalid URL, skip auto-fill
                console.log('Invalid URL for auto-fill:', error);
            }
        });

        // Handle form submission
        addForm.onsubmit = (e) => {
            e.preventDefault();
            const nameValidation = validateInput(nameInput, { maxLength: 50 });
            if (!nameValidation.valid) {
                alert(nameValidation.error);
                return;
            }

            const urlValidation = validateInput(urlInput, { type: 'url' });
            if (!urlValidation.valid) {
                alert(urlValidation.error);
                return;
            }

            const iconUrl = iconInput.value.trim();
            if (iconUrl && !validateInput(iconInput, { type: 'url', optional: true }).valid) {
                alert('Please enter a valid icon URL or leave it empty');
                return;
            }
            
            const bookmarks = safeGet('bookmarks') || [];
            
            // Check total bookmarks limit
            if (bookmarks.length >= 100) {
                alert('Maximum number of bookmarks reached (100)');
                return;
            }

            // Check for duplicates
            const isDuplicate = bookmarks.some(bookmark => 
                bookmark.url === urlValidation.value || 
                bookmark.name === nameValidation.value
            );
            
            if (isDuplicate) {
                alert('This bookmark already exists!');
                return;
            }
            
            // Add sanitized values
            bookmarks.push({
                name: sanitizeHTML(nameValidation.value),
                url: urlValidation.value,
                iconUrl: iconUrl || null
            });
            
            if (!safeSet('bookmarks', bookmarks)) return;
            loadBookmarks();
            dialog.remove();
        };

        // Handle cancel button
        dialog.querySelector('.cancel-btn').onclick = () => {
            dialog.remove();
        };

        // Close dialog when clicking outside
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        };
    });
}

// Update the getDefaultBookmarks function
function getDefaultBookmarks() {
    return [
        { name: 'Google', url: 'https://www.google.com' },
        { name: 'YouTube', url: 'https://youtube.com' },
        { name: 'Discord', url: 'https://discord.com/channels/@me' }
    ];
}

// Add this function to track deleted default bookmarks
function getDeletedDefaults() {
    return safeGet('deletedDefaults') || [];
}

// Update the addDefaultBookmarks function
function addDefaultBookmarks() {
    const bookmarks = safeGet('bookmarks') || [];
    const deletedDefaults = safeGet('deletedDefaults') || [];
    
    if (bookmarks.length === 0) {
        if (!safeSet('bookmarks', getDefaultBookmarks())) return;
        loadBookmarks();
        return;
    }
    
    // Check if any default bookmarks are missing (but not deliberately deleted)
    const defaultBookmarks = getDefaultBookmarks();
    const missingDefaults = defaultBookmarks.filter(defaultBookmark => 
        !bookmarks.some(b => b.url === defaultBookmark.url) && 
        !deletedDefaults.includes(defaultBookmark.url)
    );
    
    if (missingDefaults.length > 0) {
        // Add missing defaults to the existing bookmarks
        const updatedBookmarks = [...bookmarks, ...missingDefaults];
        if (!safeSet('bookmarks', updatedBookmarks)) return;
        loadBookmarks();
    }
}

// Settings panel functionality
document.getElementById('settingsToggle').addEventListener('click', function() {
    const panel = document.querySelector('.settings-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

// Close settings panel when clicking outside
document.addEventListener('click', function(e) {
    const panel = document.querySelector('.settings-panel');
    const settingsToggle = document.getElementById('settingsToggle');
    
    if (!panel.contains(e.target) && !settingsToggle.contains(e.target)) {
        panel.style.display = 'none';
    }
});

// Search engine logo management
function updateSearchEngineLogo() {
    const button = document.getElementById('searchEngine');
    const engine = button.dataset.engine;
    
    // Check if it's a default engine
    const defaultIcons = {
        'google': 'https://www.google.com/favicon.ico',
        'ddg': 'https://duckduckgo.com/favicon.ico',
        'brave': 'https://brave.com/favicon.ico',
        'yandex': 'https://yandex.com/favicon.ico'
    };

    if (defaultIcons[engine]) {
        button.style.backgroundImage = `url('${defaultIcons[engine]}')`;
        return;
    }
    
    // Handle custom engines
    const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
    if (customEngines[engine]) {
        const engineData = customEngines[engine];
        if (engineData.icon) {
            button.style.backgroundImage = `url('${engineData.icon}')`;
        } else {
            const iconUrl = getDefaultSearchIcon(engineData.url);
            button.style.backgroundImage = `url('${iconUrl}')`;
        }
    }
}

// Initialize everything
loadBookmarks();
addDefaultBookmarks();
loadCustomEngines();
loadLastSelectedEngine();
initializeBackground();
updateDateTime();
document.querySelector('input[type="search"]').value = '';

// Add this function at the top of your script
function createEditDialog(name, url, iconUrl = '') {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('editDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    // Set initial values
    dialog.querySelector('#editName').value = name;
    dialog.querySelector('#editUrl').value = url;
    dialog.querySelector('#editIcon').value = iconUrl || '';
    
    document.body.appendChild(dialog);
    return dialog;
}

function createAddDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('addDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    document.body.appendChild(dialog);
    return dialog;
}

// Add this after your other initialization code
function checkFirstVisit() {
    if (!localStorage.getItem('hasVisited')) {
        document.getElementById('searchEngine').parentElement.classList.add('first-visit');
        localStorage.setItem('hasVisited', 'true');
        
        // Remove the class after animation
        setTimeout(() => {
            document.getElementById('searchEngine').parentElement.classList.remove('first-visit');
        }, 2000);
    }
}

checkFirstVisit();

// Add this function to handle custom search engines
function createSearchEngineDialog(isEdit = false, engineData = null) {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('searchEngineDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    // Update the title if editing
    if (isEdit) {
        dialog.querySelector('h3').textContent = 'Edit Search Engine';
        dialog.querySelector('.save-btn').textContent = 'Save';
    }
    
    // Set initial values
    if (engineData) {
        dialog.querySelector('#engineName').value = engineData.name;
        dialog.querySelector('#engineUrl').value = engineData.url;
        dialog.querySelector('#engineIcon').value = engineData.icon || '';
    }
    
    document.body.appendChild(dialog);
    return dialog;
}

// Add this function to save the last selected engine
function saveLastSelectedEngine(engineKey) {
    localStorage.setItem('lastSelectedEngine', engineKey);
}

// Add this function to load the last selected engine
function loadLastSelectedEngine() {
    const lastEngine = localStorage.getItem('lastSelectedEngine');
    if (lastEngine) {
        const button = document.getElementById('searchEngine');
        const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
        if (customEngines[lastEngine] || searchEngines[lastEngine]) {
            button.dataset.engine = lastEngine;
            updateSearchEngineLogo();
        }
    }
}

// Update the search engine selector handler
function createSearchEngineSelector() {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    // Clone the main template
    const template = document.getElementById('searchEngineSelectorTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
    const defaultEngines = [
        { key: 'google', name: 'Google', icon: 'https://www.google.com/favicon.ico' },
        { key: 'ddg', name: 'DuckDuckGo', icon: 'https://duckduckgo.com/favicon.ico' },
        { key: 'brave', name: 'Brave', icon: 'https://brave.com/favicon.ico' },
        { key: 'yandex', name: 'Yandex', icon: 'https://yandex.com/favicon.ico' }
    ];

    const grid = dialog.querySelector('.search-engine-grid');
    const defaultTemplate = document.getElementById('searchEngineItemTemplate');
    const customTemplate = document.getElementById('customSearchEngineItemTemplate');
    const addButton = grid.querySelector('.add-engine');
    
    // Add default engines
    defaultEngines.forEach(engine => {
        const item = defaultTemplate.content.cloneNode(true).querySelector('.search-engine-item');
        item.dataset.engine = engine.key;
        const img = item.querySelector('img');
        img.src = engine.icon;
        img.alt = engine.name;
        item.querySelector('span').textContent = engine.name;
        
        // Add click handler for selection
        item.addEventListener('click', () => {
            handleEngineSelection(engine.key);
            dialog.remove();
        });
        
        grid.insertBefore(item, addButton);
    });

    // Add custom engines
    Object.entries(customEngines).forEach(([key, engine]) => {
        const item = customTemplate.content.cloneNode(true).querySelector('.search-engine-item');
        item.dataset.engine = key;
        const img = item.querySelector('img');
        img.src = engine.icon || getDefaultSearchIcon(engine.url);
        img.alt = engine.name;
        img.onerror = () => img.src = getDefaultSearchIcon(engine.url);
        item.querySelector('span').textContent = engine.name;
        
        // Add menu dots handler
        const menuDots = item.querySelector('.menu-dots');
        const menuItems = item.querySelector('.menu-items');
        
            menuDots.addEventListener('click', (e) => {
                e.stopPropagation();
                menuItems.classList.toggle('active');
            });

        // Add edit handler
        item.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                dialog.remove();
            showEditEngineDialog(key, engine);
            });

        // Add delete handler
        item.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                createConfirmDialog('Delete this search engine?', () => {
                delete customEngines[key];
                    localStorage.setItem('customSearchEngines', JSON.stringify(customEngines));
                if (document.getElementById('searchEngine').dataset.engine === key) {
                        handleEngineSelection('google');
                    }
                dialog.remove();
                createSearchEngineSelector();
                });
            });

        // Add click handler for selection
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-items') && !e.target.closest('.menu-dots')) {
                handleEngineSelection(key);
                dialog.remove();
            }
        });
        
        grid.insertBefore(item, addButton);
    });

    // Add handler for the "Add Custom" button
    grid.querySelector('.add-engine').addEventListener('click', () => {
        dialog.remove();
        showAddEngineDialog();
    });

    // Close when clicking outside
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    // Close any open menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-items') && !e.target.closest('.menu-dots')) {
            dialog.querySelectorAll('.menu-items.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });

    document.body.appendChild(dialog);
    return dialog;
}

// Add function to show edit dialog
function showEditEngineDialog(engineKey, engineData) {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('searchEngineDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    // Update the title if editing
    dialog.querySelector('h3').textContent = 'Edit Search Engine';
    dialog.querySelector('.save-btn').textContent = 'Save';
    
    // Set initial values
    dialog.querySelector('#engineName').value = engineData.name;
    dialog.querySelector('#engineUrl').value = engineData.url;
    dialog.querySelector('#engineIcon').value = engineData.icon || '';

    document.body.appendChild(dialog);

    const form = dialog.querySelector('#searchEngineForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('engineName').value.trim();
        const url = document.getElementById('engineUrl').value.trim();
        const icon = document.getElementById('engineIcon').value.trim();

        const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
        customEngines[engineKey] = { name, url, icon };
        localStorage.setItem('customSearchEngines', JSON.stringify(customEngines));

        handleEngineSelection(engineKey);
        dialog.remove();
        createSearchEngineSelector();
    });

    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
        createSearchEngineSelector();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
            createSearchEngineSelector();
        }
    });
}

// Update the engine selection in the selector
function handleEngineSelection(engineKey) {
    const button = document.getElementById('searchEngine');
    button.dataset.engine = engineKey;
    updateSearchEngineLogo();
    saveLastSelectedEngine(engineKey);
}

// Update the getDefaultSearchIcon function to use URL
function getDefaultSearchIcon(url) {
    try {
        const hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch {
        // Fallback to a generic search icon
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
    }
}

// Update the search engine change handler to include menu options
function createSearchEngineOption(engine, name, isCustom = false) {
    const option = document.createElement('option');
    option.value = engine;
    option.textContent = name;
    if (isCustom) {
        option.dataset.custom = 'true';
    }
    return option;
}

// Add this function to load custom engines
function loadCustomEngines() {
    const button = document.getElementById('searchEngine');
    const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
    
    // If current engine is a custom one, update its icon
    const currentEngine = button.dataset.engine;
    if (customEngines[currentEngine]) {
        updateSearchEngineLogo();
    }
}

// Add context menu for custom engines
document.getElementById('searchEngine').addEventListener('contextmenu', function(e) {
    const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
    if (customEngines[this.value]) {
        e.preventDefault();
        
        // Remove existing menu if any
        document.querySelectorAll('.search-engine-menu').forEach(menu => menu.remove());
        
        // Create menu
        const menu = document.createElement('div');
        menu.className = 'search-engine-menu';
        menu.innerHTML = `
            <button class="edit-engine">Edit</button>
            <button class="delete-engine">Delete</button>
        `;
        
        // Position menu
        menu.style.position = 'absolute';
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        document.body.appendChild(menu);
        
        // Edit handler
        menu.querySelector('.edit-engine').onclick = () => {
            const engine = customEngines[this.value];
            const dialog = createSearchEngineDialog(true, engine);
            document.body.appendChild(dialog);
            
            const form = dialog.querySelector('#searchEngineForm');
            
            // Add cancel button handler
            dialog.querySelector('.cancel-btn').onclick = () => {
                dialog.remove();
            };

            // Add click outside handler
            dialog.onclick = (e) => {
                if (e.target === dialog) {
                    dialog.remove();
                }
            };

            form.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('engineName').value.trim();
                const url = document.getElementById('engineUrl').value.trim();
                const icon = document.getElementById('engineIcon').value.trim();
                
                const engineKey = this.value;
                customEngines[engineKey] = { name, url, icon };
                localStorage.setItem('customSearchEngines', JSON.stringify(customEngines));
                
                loadCustomEngines();
                updateSearchEngineLogo();
                dialog.remove();
            };
        };
        
        // Delete handler
        menu.querySelector('.delete-engine').onclick = () => {
            createConfirmDialog('Delete this search engine?', () => {
                delete customEngines[this.value];
                localStorage.setItem('customSearchEngines', JSON.stringify(customEngines));
                this.value = 'google';
                loadCustomEngines();
                updateSearchEngineLogo();
            });
        };
        
        // Close menu when clicking outside
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }
});

// Add this function to get a search engine's icon
function getSearchEngineIcon(engineUrl, engineName) {
    try {
        const url = new URL(engineUrl);
        const domain = url.hostname;
        return [
            `https://${domain}/favicon.ico`,                              // Try direct favicon
            `https://${domain}/assets/favicon.ico`,                       // Common favicon location
            `https://${domain}/assets/images/favicon.ico`,                // Another common location
            `https://www.google.com/s2/favicons?domain=${domain}&sz=128`, // Google's favicon service
            getDefaultSearchIcon(engineName)                              // Last resort default icon
        ];
    } catch {
        return [getDefaultSearchIcon(engineName)];
    }
}

// Helper function to try loading icons sequentially
function tryNextIcon(select, iconUrls, index = 0) {
    if (index >= iconUrls.length) return;
    
    const img = new Image();
    img.onload = () => {
        select.style.backgroundImage = `url('${iconUrls[index]}')`;
    };
    img.onerror = () => {
        tryNextIcon(select, iconUrls, index + 1);
    };
    img.src = iconUrls[index];
}

// Update the createConfirmDialog function to properly handle events
function createConfirmDialog(message, onConfirm, confirmText = 'Delete') {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('confirmDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    // Update content
    dialog.querySelector('.confirm-message').textContent = message;
    const confirmBtn = dialog.querySelector('.confirm-btn');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `confirm-btn ${confirmText.toLowerCase()}-btn`;
    
    // Add event handlers
    confirmBtn.addEventListener('click', () => {
        onConfirm();
        dialog.remove();
    });

    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
    });

    // Close dialog when clicking outside
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    document.body.appendChild(dialog);
    return dialog;
}

// Update the restore defaults call to use "Restore" as the button text
document.getElementById('restoreDefaults').onclick = () => {
    createConfirmDialog('Restore all default bookmarks?', restoreDefaultBookmarks, 'Restore');
};

// Add click handler for the search engine button
document.getElementById('searchEngine').addEventListener('click', function(e) {
    e.preventDefault();
    createSearchEngineSelector();
});

// Set default search engine if none is selected
if (!document.getElementById('searchEngine').dataset.engine) {
    document.getElementById('searchEngine').dataset.engine = 'google';
    updateSearchEngineLogo();
}

// Update the showAddEngineDialog function to properly handle form submission
function showAddEngineDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('searchEngineDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));

    document.body.appendChild(dialog);

    // Get form elements
    const form = dialog.querySelector('#searchEngineForm');
    const nameInput = dialog.querySelector('#engineName');
    const urlInput = dialog.querySelector('#engineUrl');
    const iconInput = dialog.querySelector('#engineIcon');
    const errorText = dialog.querySelector('.error-text');

    // Add URL validation on input
    urlInput.addEventListener('input', () => {
        const url = urlInput.value.trim();
        if (url) {
            const validation = validateSearchEngineUrl(url);
            if (!validation.valid) {
                errorText.textContent = validation.error;
                errorText.style.display = 'block';
            } else {
                errorText.style.display = 'none';
            }
        } else {
            errorText.style.display = 'none';
        }
    });

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        const icon = iconInput.value.trim();

        // Validate URL
        const validation = validateSearchEngineUrl(url);
        if (!validation.valid) {
            errorText.textContent = validation.error;
            errorText.style.display = 'block';
            return;
        }

        // Generate a unique key for the engine
        const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Save the new engine
        const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
        customEngines[key] = { name, url, icon };
        localStorage.setItem('customSearchEngines', JSON.stringify(customEngines));

        // Select the new engine
        handleEngineSelection(key);
        dialog.remove();
        createSearchEngineSelector();
    });

    // Handle cancel button
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
        createSearchEngineSelector();
    });

    // Close dialog when clicking outside
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
            createSearchEngineSelector();
        }
    });

    return dialog;
}

// Add function to validate search engine URL
function validateSearchEngineUrl(url) {
    try {
        // Check if it's a valid URL
        new URL(url);
        
        // Check if it contains the {searchTerm} placeholder
        if (!url.includes('{searchTerm}')) {
            throw new Error('URL must contain {searchTerm} placeholder');
        }
        
        // Check if it starts with http:// or https://
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            throw new Error('URL must start with http:// or https://');
        }
        
        return { valid: true };
    } catch (error) {
        return { 
            valid: false, 
            error: error.message || 'Please enter a valid URL'
        };
    }
}

// Update the settings panel close button handler
document.getElementById('closeSettings').addEventListener('click', function() {
    document.querySelector('.settings-panel').style.display = 'none';
});

// Add this function to restore default bookmarks
function restoreDefaultBookmarks() {
    // Clear deleted defaults
    safeRemove('deletedDefaults');
    
    // Get current custom bookmarks
    const currentBookmarks = safeGet('bookmarks') || [];
    const customBookmarks = currentBookmarks.filter(bookmark => 
        !getDefaultBookmarks().some(def => def.url === bookmark.url)
    );
    
    // Combine default and custom bookmarks
    const allBookmarks = [...getDefaultBookmarks(), ...customBookmarks];
    if (!safeSet('bookmarks', allBookmarks)) return;
    loadBookmarks();
}

// Add this function to manage local URL settings
function isLocalUrlAllowed() {
    return safeGet('allowLocalUrls') || false;
}

// Update the validateInput function
function validateInput(input, options = {}) {
    const {
        maxLength = 100,
        minLength = 1,
        type = 'text',
        maxBookmarks = 100
    } = options;

    const value = input.value.trim();
    
    // Basic security checks
    if (!value || typeof value !== 'string') {
        return {
            valid: false,
            error: 'Invalid input'
        };
    }

    // Prevent extremely long inputs that could cause DoS
    if (value.length > 2000) {
        return {
            valid: false,
            error: 'Input is too long'
        };
    }

    // Check length
    if (value.length < minLength || value.length > maxLength) {
        return {
            valid: false,
            error: `Length must be between ${minLength} and ${maxLength} characters`
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

            // Check for local URLs only if not allowed
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
        } catch {
            return {
                valid: false,
                error: 'Please enter a valid URL'
            };
        }
    }

    // Name-specific validation for bookmarks
    if (type === 'text') {
        // Prevent HTML-like content
        if (value.includes('<') || value.includes('>')) {
            return {
                valid: false,
                error: 'HTML tags are not allowed in names'
            };
        }

        // Prevent potentially malicious characters
        if (/[<>{}()\[\]\\\/]/.test(value)) {
            return {
                valid: false,
                error: 'Name contains invalid characters'
            };
        }
    }

    return { valid: true, value: value };
}

// Update the event listener for the local URLs toggle
document.getElementById('allowLocalUrls').addEventListener('change', function(e) {
    safeSet('allowLocalUrls', e.target.checked);
});

// Initialize the toggle state
document.getElementById('allowLocalUrls').checked = isLocalUrlAllowed();

// Update the showStorageManager function to properly handle events
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

    // Add event handlers
    dialog.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            createConfirmDialog(`Clear ${key}?`, () => {
                localStorage.removeItem(key);
                showStorageManager(); // Refresh the dialog
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
    
    // Close dialog when clicking outside
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    document.body.appendChild(dialog);
    return dialog;
}

// Add event listener for the manage storage button
document.getElementById('manageStorage').addEventListener('click', function() {
    showStorageManager();
});

// Add automatic background rotation every hour if offline
setInterval(async () => {
    const online = navigator.onLine;
    if (!online) {
        rotateBackground();
    } else {
        // Try to fetch new image if online
        const newImage = await fetchNewBackgroundImage();
        if (!newImage) {
            // If fetch fails, rotate through cache
            rotateBackground();
        }
    }
}, 3600000); // Every hour 

// Add these functions for data export/import
function exportUserData() {
    const data = {
        version: 1,  // for future compatibility
        timestamp: Date.now(),
        bookmarks: safeGet('bookmarks') || [],
        customSearchEngines: safeGet('customSearchEngines') || {},
        settings: {
            allowLocalUrls: safeGet('allowLocalUrls') || false,
            lastSelectedEngine: localStorage.getItem('lastSelectedEngine') || 'google',
            deletedDefaults: safeGet('deletedDefaults') || [],
            weather: {
                city: localStorage.getItem('weatherCity') || 'Dhaka',
                country: localStorage.getItem('weatherCountry') || 'BD'
            },
            widgets: {
                calculator: {
                    enabled: localStorage.getItem('calculatorWidget') === 'true',
                    mode: localStorage.getItem('calculatorMode') || 'basic'
                },
                calendar: {
                    enabled: localStorage.getItem('calendarWidget') === 'true'
                }
            }
        }
    };

    // Create and download the file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nazhome-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importUserData(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate the data structure
            if (!data.version || !data.timestamp) {
                throw new Error('Invalid backup file format');
            }

            // Show confirmation dialog with details
            const timestamp = new Date(data.timestamp).toLocaleString();
            const message = `Import data from ${timestamp}?\n\nThis will replace your current:\n` +
                          `- ${data.bookmarks.length} bookmarks\n` +
                          `- ${Object.keys(data.customSearchEngines).length} custom search engines\n` +
                          `- Weather settings (${data.settings.weather?.city || 'Default'}, ${data.settings.weather?.country || 'BD'})\n` +
                          `- Widget configurations\n` +
                          `\nExisting data will be backed up and can be restored.`;

            createConfirmDialog(message, () => {
                // Backup current data first
                const currentData = {
                    version: 1,
                    timestamp: Date.now(),
                    bookmarks: safeGet('bookmarks') || [],
                    customSearchEngines: safeGet('customSearchEngines') || {},
                    settings: {
                        allowLocalUrls: safeGet('allowLocalUrls') || false,
                        lastSelectedEngine: localStorage.getItem('lastSelectedEngine') || 'google',
                        deletedDefaults: safeGet('deletedDefaults') || [],
                        weather: {
                            city: localStorage.getItem('weatherCity') || 'Dhaka',
                            country: localStorage.getItem('weatherCountry') || 'BD'
                        },
                        widgets: {
                            calculator: {
                                enabled: localStorage.getItem('calculatorWidget') === 'true',
                                mode: localStorage.getItem('calculatorMode') || 'basic'
                            },
                            calendar: {
                                enabled: localStorage.getItem('calendarWidget') === 'true'
                            }
                        }
                    }
                };
                
                safeSet('dataBackup', currentData);

                // Import new data
                safeSet('bookmarks', data.bookmarks);
                safeSet('customSearchEngines', data.customSearchEngines);
                safeSet('allowLocalUrls', data.settings.allowLocalUrls);
                safeSet('deletedDefaults', data.settings.deletedDefaults);
                localStorage.setItem('lastSelectedEngine', data.settings.lastSelectedEngine);

                // Import weather settings
                if (data.settings.weather) {
                    localStorage.setItem('weatherCity', data.settings.weather.city);
                    localStorage.setItem('weatherCountry', data.settings.weather.country);
                }

                // Import widget settings
                if (data.settings.widgets) {
                    // Calculator widget settings
                    if (data.settings.widgets.calculator) {
                        localStorage.setItem('calculatorWidget', 
                            data.settings.widgets.calculator.enabled);
                        localStorage.setItem('calculatorMode', 
                            data.settings.widgets.calculator.mode || 'basic');
                    }

                    // Calendar widget settings
                    if (data.settings.widgets.calendar) {
                        localStorage.setItem('calendarWidget', 
                            data.settings.widgets.calendar.enabled);
                    }
                }

                // Refresh the UI
                loadBookmarks();
                loadCustomEngines();
                handleEngineSelection(data.settings.lastSelectedEngine);
                document.getElementById('allowLocalUrls').checked = data.settings.allowLocalUrls;
                
                // Update weather UI and refresh weather data
                if (data.settings.weather) {
                    document.getElementById('weatherCity').value = data.settings.weather.city;
                    document.getElementById('weatherCountry').value = data.settings.weather.country;
                    updateWeather();
                }

                // Update widget states
                if (data.settings.widgets) {
                    if (data.settings.widgets.calculator) {
                        const calcWidget = document.getElementById('calculatorWidget');
                        calcWidget.checked = data.settings.widgets.calculator.enabled;
                        document.getElementById('calculator-widget').style.display = 
                            calcWidget.checked ? 'block' : 'none';
                    }

                    if (data.settings.widgets.calendar) {
                        const calWidget = document.getElementById('calendarWidget');
                        calWidget.checked = data.settings.widgets.calendar.enabled;
                        document.getElementById('calendar-widget').style.display = 
                            calWidget.checked ? 'block' : 'none';
                    }
                }

                // Show success message
                createConfirmDialog('Data imported successfully! Reload the page to see all changes.', 
                    () => location.reload(), 
                    'Reload'
                );

            }, 'Import');

        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing data: ' + error.message);
        }
    };

    reader.readAsText(file);
}

// Add event listeners for the new buttons
document.getElementById('exportData').addEventListener('click', exportUserData);

document.getElementById('importData').addEventListener('click', function() {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        importUserData(e.target.files[0]);
    }
});

// Update the updateWeather function
async function updateWeather() {
    const weatherContainer = document.getElementById('weather');
    weatherContainer.style.opacity = '0';
    weatherContainer.style.display = 'none'; // Hide initially
    
    const location = loadWeatherLocation();
    
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${location.city},${location.country}&units=metric&appid=6d055e39ee237af35ca066f35474e9df`
        );
        
        if (!response.ok) {
            throw new Error('Weather data fetch failed');
        }

        const data = await response.json();
        
        const tempElement = document.querySelector('#weather .temp');
        const descElement = document.querySelector('#weather .description');
        const iconElement = document.querySelector('#weather .weather-icon');
        
        // Round temperature to nearest whole number
        const temp = Math.round(data.main.temp);
        tempElement.textContent = `${temp}°C`;
        descElement.textContent = data.weather[0].description;

        // Update weather icon
        const iconCode = data.weather[0].icon;
        iconElement.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        iconElement.alt = data.weather[0].description;

        // Show weather container with fade-in animation
        weatherContainer.style.display = 'block';
        // Trigger reflow to ensure the transition works
        weatherContainer.offsetHeight;
        weatherContainer.style.opacity = '1';

    } catch (error) {
        console.error('Weather update failed:', error);
        // Keep weather display hidden on error
        weatherContainer.style.display = 'none';
        weatherContainer.style.opacity = '0';
    }
}

// Update weather every 30 minutes
setInterval(updateWeather, 30 * 60 * 1000);

// Initial weather update
updateWeather();

// Function to save weather location
function saveWeatherLocation(city, country) {
    localStorage.setItem('weatherCity', city);
    localStorage.setItem('weatherCountry', country);
}

// Function to load weather location
function loadWeatherLocation() {
    return {
        city: localStorage.getItem('weatherCity') || 'Dhaka',
        country: localStorage.getItem('weatherCountry') || 'BD'
    };
}

// Add event listener for the update button
document.getElementById('updateWeatherLocation').addEventListener('click', function() {
    const city = document.getElementById('weatherCity').value.trim();
    const country = document.getElementById('weatherCountry').value;
    
    if (city) {
        saveWeatherLocation(city, country);
        updateWeather();
    }
});

// Add this to your initialization code
document.addEventListener('DOMContentLoaded', function() {
    const location = loadWeatherLocation();
    document.getElementById('weatherCity').value = location.city;
    populateCountryDropdown(); // Replace the static country selection with dynamic population
    initializeCalendar();
    initializeBookmarkSettings();
});

// Add this function to fetch countries
async function populateCountryDropdown() {
    const select = document.getElementById('weatherCountry');
    const savedCountry = localStorage.getItem('weatherCountry') || 'BD';
    
    try {
        const response = await fetch('https://restcountries.com/v3.1/all');
        if (!response.ok) throw new Error('Failed to fetch countries');
        
        const countries = await response.json();
        
        // Sort countries by name
        countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add countries to dropdown
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.cca2; // ISO 3166-1 alpha-2 code
            option.textContent = country.name.common;
            option.selected = country.cca2 === savedCountry;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching countries:', error);
        // Fallback to Bangladesh if fetch fails
        select.innerHTML = `<option value="BD">Bangladesh</option>`;
    }
}

// Calendar Widget functionality
let currentDate = new Date();

function initializeCalendar() {
    const savedState = localStorage.getItem('calendarWidget') === 'true';
    document.getElementById('calendarWidget').checked = savedState;
    document.getElementById('calendar-widget').style.display = savedState ? 'block' : 'none';
    
    if (savedState) {
        updateCalendar();
    }
}

function updateCalendar() {
    const calendarTitle = document.querySelector('.calendar-title');
    const calendarDays = document.querySelector('.calendar-days');
    const calendarDates = document.querySelector('.calendar-dates');
    
    // Set title
    calendarTitle.textContent = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // Set weekday names
    calendarDays.innerHTML = 'SMTWTFS'.split('').map(day => 
        `<div class="calendar-day">${day}</div>`
    ).join('');
    
    // Calculate dates
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const prevMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    
    let dates = [];
    
    // Previous month dates
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
        dates.push({
            date: prevMonthDays - i,
            class: 'other-month'
        });
    }
    
    // Current month dates
    const today = new Date();
    for (let i = 1; i <= lastDay.getDate(); i++) {
        dates.push({
            date: i,
            class: today.getDate() === i && 
                   today.getMonth() === currentDate.getMonth() && 
                   today.getFullYear() === currentDate.getFullYear() ? 'today' : ''
        });
    }
    
    // Next month dates
    const remainingDays = 42 - dates.length; // 6 rows × 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
        dates.push({
            date: i,
            class: 'other-month'
        });
    }
    
    // Render dates
    calendarDates.innerHTML = dates.map(({ date, class: className }) => 
        `<div class="calendar-date ${className}">${date}</div>`
    ).join('');
}

// Add event listeners
document.getElementById('calendarWidget').addEventListener('change', function(e) {
    const calendarWidget = document.getElementById('calendar-widget');
    calendarWidget.style.display = e.target.checked ? 'block' : 'none';
    localStorage.setItem('calendarWidget', e.target.checked);
    if (e.target.checked) {
        updateCalendar();
    }
});

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    updateCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    updateCalendar();
});

// Initialize calendar on page load
document.addEventListener('DOMContentLoaded', initializeCalendar);

// Calculator Widget functionality
function initializeCalculator() {
    const savedState = localStorage.getItem('calculatorWidget') === 'true';
    document.getElementById('calculatorWidget').checked = savedState;
    document.getElementById('calculator-widget').style.display = savedState ? 'block' : 'none';
}

class Calculator {
    constructor() {
        this.calculation = document.querySelector('.calculation');
        this.result = document.querySelector('.result');
        this.currentCalculation = '';
        this.lastResult = '0';
        this.isScientific = false;
        this.pendingFunction = null;
        this.pendingValue = '';
        this.lastAnswer = '0';  // Add this line to store the last answer
        this.expressionInput = document.querySelector('.expression-input');
        
        // Initialize mode from localStorage
        this.isScientific = localStorage.getItem('calculatorMode') === 'scientific';
        this.updateMode();

        // Add input handler
        this.expressionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.parseAndCompute(this.expressionInput.value);
            }
        });
    }

    updateMode() {
        const widget = document.getElementById('calculator-widget');
        const basicGrid = document.querySelector('.calculator-grid.basic-mode');
        const scientificGrid = document.querySelector('.calculator-grid.scientific-mode');
        
        if (this.isScientific) {
            widget.classList.add('scientific');
            basicGrid.style.display = 'none';
            scientificGrid.style.display = 'grid';
        } else {
            widget.classList.remove('scientific');
            basicGrid.style.display = 'grid';
            scientificGrid.style.display = 'none';
        }
        
        localStorage.setItem('calculatorMode', this.isScientific ? 'scientific' : 'basic');
    }

    toggleMode() {
        this.isScientific = !this.isScientific;
        this.updateMode();
    }

    formatDisplayValue(value) {
        // Replace Math.PI with π for display
        return value.replace(/Math\.PI/g, 'π');
    }

    updateDisplay() {
        let displayText = this.currentCalculation;
        if (this.pendingFunction) {
            // Format the pending value to show π instead of Math.PI
            const formattedValue = this.formatDisplayValue(this.pendingValue);
            displayText = `${this.pendingFunction}(${formattedValue})`;
        } else {
            // Format the current calculation to show π instead of Math.PI
            displayText = this.formatDisplayValue(displayText);
        }
        this.calculation.textContent = displayText;
        this.result.textContent = this.lastResult;
    }

    appendNumber(number) {
        if (this.pendingFunction) {
            this.pendingValue += number;
        } else {
            this.currentCalculation += number;
        }
        this.updateDisplay();
    }

    applyPendingFunction() {
        if (!this.pendingFunction || !this.pendingValue) {
            this.pendingFunction = null;
            this.pendingValue = '';
            return;
        }

        let value;
        try {
            // If the pending value contains Math.PI, evaluate it first
            if (this.pendingValue.includes('Math.PI')) {
                value = Function('"use strict";return (' + this.pendingValue + ')')();
            } else {
                value = parseFloat(this.pendingValue);
            }

            if (isNaN(value)) {
                this.lastResult = 'Error';
                this.pendingFunction = null;
                this.pendingValue = '';
                return;
            }

            let result;
            switch (this.pendingFunction) {
                case 'sin':
                    // If value contains Math.PI, don't convert to radians
                    result = this.pendingValue.includes('Math.PI') ? 
                        Math.sin(value) : 
                        Math.sin(value * Math.PI / 180);
                    break;
                case 'cos':
                    result = this.pendingValue.includes('Math.PI') ? 
                        Math.cos(value) : 
                        Math.cos(value * Math.PI / 180);
                    break;
                case 'tan':
                    result = this.pendingValue.includes('Math.PI') ? 
                        Math.tan(value) : 
                        Math.tan(value * Math.PI / 180);
                    break;
                case 'sqrt':
                    result = Math.sqrt(value);
                    break;
                case 'log':
                    result = Math.log10(value);
                    break;
                case 'ln':
                    result = Math.log(value);
                    break;
            }

            if (Math.abs(result) < 1e-10) {
                result = 0;
            }

            this.lastResult = formatNumber(result);
            this.lastAnswer = this.lastResult;
            this.currentCalculation = this.lastResult;  // Set currentCalculation to the result
            this.pendingFunction = null;
            this.pendingValue = '';
            this.updateDisplay();
        } catch (e) {
            this.lastResult = 'Error';
            console.error('Error in applyPendingFunction:', e);
        }
    }

    appendOperator(operator) {
        // If starting a new operation after equals, use the last answer
        if (this.currentCalculation === '' && this.lastAnswer !== '0') {
            this.currentCalculation = parseFormattedNumber(this.lastAnswer);
        }

        // Handle special operators
        switch(operator) {
            case '×':
                operator = '*';
                break;
            case '÷':
                operator = '/';
                break;
            case 'π':
                // Don't override pending function when adding π
                if (this.pendingFunction) {
                    this.pendingValue += 'Math.PI';
                    this.updateDisplay();
                    return;
                }
                operator = 'Math.PI';
                break;
            case '^':
                operator = '**';
                break;
            case '√':
                this.pendingFunction = 'sqrt';
                this.pendingValue = '';
                this.updateDisplay();
                return;
            case 'sin':
                this.pendingFunction = 'sin';
                this.pendingValue = '';
                this.updateDisplay();
                return;
            case 'cos':
                this.pendingFunction = 'cos';
                this.pendingValue = '';
                this.updateDisplay();
                return;
            case 'tan':
                this.pendingFunction = 'tan';
                this.pendingValue = '';
                this.updateDisplay();
                return;
            case 'log':
                this.pendingFunction = 'log';
                this.pendingValue = '';
                this.updateDisplay();
                return;
            case 'ln':
                this.pendingFunction = 'ln';
                this.pendingValue = '';
                this.updateDisplay();
                return;
        }

        if (this.pendingFunction) {
            this.pendingValue += operator;
        } else {
            this.currentCalculation += operator;
        }
        this.updateDisplay();
    }

    compute() {
        if (this.pendingFunction) {
            this.applyPendingFunction();
            return;
        }

        try {
            let computation = this.currentCalculation
                .replace(/×/g, '*')
                .replace(/÷/g, '/');
            
            // First handle π symbol
            computation = computation.replace(/π/g, 'Math.PI');
            
            // Handle trig functions with proper radian handling
            computation = computation.replace(/(sin|cos|tan)\(([^)]+)\)/g, (match, func, arg) => {
                // If the argument contains Math.PI, don't convert to degrees
                if (arg.includes('Math.PI')) {
                    return `Math.${func}(${arg})`;
                }
                // Otherwise, convert to radians
                return `Math.${func}((${arg}) * Math.PI / 180)`;
            });
            
            // Parse any formatted numbers in the calculation
            computation = computation.split(/([+\-*/()])/).map(part => {
                part = part.trim();
                if (part.includes('×10')) {
                    return parseFormattedNumber(part);
                }
                return part;
            }).join('');
            
            let result = Function('"use strict";return (' + computation + ')')();
            
            if (Math.abs(result) < 1e-10) {
                result = 0;
            }

            this.lastResult = formatNumber(result);
            this.lastAnswer = this.lastResult;
            this.currentCalculation = this.lastResult;
            this.expressionInput.value = '';
        } catch (e) {
            this.lastResult = 'Error';
            console.error('Calculation error:', e);
        }
        this.updateDisplay();
    }

    clear() {
        this.currentCalculation = '';
        this.lastResult = '0';
        this.lastAnswer = '0';
        this.pendingFunction = null;
        this.pendingValue = '';
        this.expressionInput.value = '';  // Add this line to clear the input field
        this.updateDisplay();
    }

    delete() {
        if (this.pendingFunction) {
            this.pendingValue = this.pendingValue.slice(0, -1);
        } else {
            // Handle ** as a single operator when deleting
            if (this.currentCalculation.endsWith('**')) {
                this.currentCalculation = this.currentCalculation.slice(0, -2);
            } else {
                this.currentCalculation = this.currentCalculation.slice(0, -1);
            }
        }
        this.updateDisplay();
    }

    parseAndCompute(expression) {
        try {
            // First normalize the expression by removing all whitespace
            let parsed = expression.replace(/\s+/g, '');
            
            // First handle functions before any other replacements
            parsed = parsed
                .replace(/\blog\(/g, 'Math.log10(')
                .replace(/\bsin\(/g, 'Math.sin(')
                .replace(/\bcos\(/g, 'Math.cos(')
                .replace(/\btan\(/g, 'Math.tan(')
                .replace(/\bln\(/g, 'Math.log(')
                .replace(/\bsqrt\(/g, 'Math.sqrt(')
                .replace(/π/g, 'Math.PI');

            // Then handle implicit multiplication, but exclude Math functions
            parsed = parsed
                .replace(/\^/g, '**')
                .replace(/(\d+e[+-]\d+)/g, match => parseFormattedNumber(match))
                .replace(/(?<!Math\.\w+)(\d+)\s*\(/g, '$1*(')
                .replace(/\)\s*(\d+)/g, ')*$1')
                .replace(/(\d+)\s*π/g, '$1*Math.PI')
                .replace(/π\s*(\d+)/g, 'Math.PI*$1')
                .replace(/\)\s*\(/g, ')*(');

            // Add *Math.PI/180 for trig functions ONLY when the argument doesn't contain Math.PI
            parsed = parsed.replace(/Math\.(sin|cos|tan)\(([^)]+)\)/g, (match, func, arg) => {
                // If the argument contains Math.PI, don't convert to degrees
                if (arg.includes('Math.PI')) {
                    return `Math.${func}(${arg})`;
                }
                // Otherwise, convert to radians
                return `Math.${func}((${arg}) * Math.PI / 180)`;
            });

            // For debugging
            console.log('Parsed expression:', parsed);

            // Compute the result
            let result = Function('"use strict";return (' + parsed + ')')();
            
            if (Math.abs(result) < 1e-10) {
                result = 0;
            }

            this.lastResult = formatNumber(result);
            this.lastAnswer = this.lastResult;
            this.currentCalculation = this.lastResult;
            this.expressionInput.value = '';
        } catch (e) {
            this.lastResult = 'Error';
            console.error('Calculation error:', e);
        }
        this.updateDisplay();
    }
}

// Update the calculator initialization
document.addEventListener('DOMContentLoaded', function() {
    initializeCalculator();
    const calculator = new Calculator();
    
    // Clear the input field on page load
    const expressionInput = document.querySelector('.expression-input');
    if (expressionInput) {
        expressionInput.value = '';
    }

    // Add mode toggle handler
    document.querySelector('.mode-toggle').addEventListener('click', () => {
        calculator.toggleMode();
    });

    // Add event listener for calculator widget toggle
    document.getElementById('calculatorWidget').addEventListener('change', function(e) {
        const calculatorWidget = document.getElementById('calculator-widget');
        calculatorWidget.style.display = e.target.checked ? 'block' : 'none';
        localStorage.setItem('calculatorWidget', e.target.checked);
    });

    // Add event listeners for calculator buttons
    document.querySelectorAll('.calculator-grid').forEach(grid => {
        grid.addEventListener('click', e => {
            if (!e.target.matches('button')) return;

            const button = e.target;
            const buttonText = button.textContent;

            if (button.classList.contains('clear')) {
                calculator.clear();
            } else if (button.classList.contains('delete')) {
                calculator.delete();
            } else if (button.classList.contains('equals')) {
                calculator.compute();
            } else if (button.classList.contains('operator')) {
                calculator.appendOperator(buttonText);
            } else {
                calculator.appendNumber(buttonText);
            }
        });
    });

    // Add keyboard support
    document.addEventListener('keydown', e => {
        if (!document.getElementById('calculator-widget').style.display === 'none') {
            const key = e.key;
            if (/[0-9\.]/.test(key)) {
                calculator.appendNumber(key);
            } else if (['+', '-', '*', '/', '(', ')'].includes(key)) {
                calculator.appendOperator(key);
            } else if (key === 'Enter') {
                calculator.compute();
            } else if (key === 'Backspace') {
                calculator.delete();
            } else if (key === 'Escape') {
                calculator.clear();
            }
        }
    });
});

// Add this helper function to format large numbers
function formatNumber(num) {
    const str = num.toString();
    if (str.includes('e+') || str.includes('e-')) {
        const [base, exponent] = str.split('e');
        const formattedBase = parseFloat(base).toFixed(8).replace(/\.?0+$/, '');
        const exp = exponent.replace('+', '');
        return `${formattedBase}×10${exp.split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')}`;
    }
    return str;
}

// Add this helper function to parse formatted numbers
function parseFormattedNumber(str) {
    if (str.includes('×10')) {
        const [base, exp] = str.split('×10');
        const exponent = exp.split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)).join('');
        return `${base}e${exponent}`;
    }
    return str;
}

// Add this near your other initialization code
function initializeBookmarkSettings() {
    const settings = getBookmarkSettings();
    document.getElementById('hideAddButton').checked = settings.hideAddButton;
}

// Add this event listener with your other initialization code
document.getElementById('hideAddButton').addEventListener('change', function(e) {
    const settings = getBookmarkSettings();
    settings.hideAddButton = e.target.checked;
    if (saveBookmarkSettings(settings)) {
        loadBookmarks();
    }
}); 