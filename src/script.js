/**
 * nazHome - A customizable browser homepage with widgets and bookmarks
 * https://github.com/nazdridoy/nazhome
 * 
 * Core search engine configuration
 */
const searchEngines = {
    google: 'https://www.google.com/search?q=',
    ddg: 'https://duckduckgo.com/?q=',
    brave: 'https://search.brave.com/search?q=',
    yandex: 'https://yandex.com/search/?text='
};
/**
 * Search form handler - Processes search queries and redirects to appropriate search engine
 * Supports both built-in engines and custom user-defined search engines
 * If input is a valid URL, navigates directly to it
 */
document.getElementById('searchForm').onsubmit = function(e) {
    e.preventDefault();
    const query = document.querySelector('input[type="search"]').value;
    if (!query) return;
    
    // Check if the input is a valid URL
    if (isValidBrowserUrl(query)) {
        // If URL already has a protocol, use it as is
        if (query.includes('://')) {
            window.location.href = query.trim();
            return;
        }

        // For localhost, always use http://
        if (query.startsWith('localhost')) {
            window.location.href = `http://${query.trim()}`;
            return;
        }

        // For other URLs without protocol, try https:// first, then fallback to http://
        const url = query.trim();
        fetch(`https://${url}`, { mode: 'no-cors' })
            .then(() => {
                window.location.href = `https://${url}`;
            })
            .catch(() => {
                // If https fails, try http
                window.location.href = `http://${url}`;
            });
        return;
    }
    
    // If not a URL, perform search
    const engine = document.getElementById('searchEngine').dataset.engine;
    
    const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
    if (customEngines[engine]) {
        const searchUrl = customEngines[engine].url.replace('{searchTerm}', encodeURIComponent(query));
        window.location.href = searchUrl;
    } else {
        window.location.href = searchEngines[engine] + encodeURIComponent(query);
    }
};

/**
 * Updates the date/time display in the UI
 * Formats time as 12-hour with minutes
 * Formats date as full weekday, month and day
 */
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

/**
 * Background image caching system
 * Stores and retrieves background images from localStorage
 * Each cached image includes timestamp for rotation management
 */
function getBackgroundCache() {
    return JSON.parse(localStorage.getItem('backgroundCache') || '[]');
}

function setBackgroundCache(cache) {
    const cacheWithTimestamps = cache.map(item => {
        if (typeof item === 'object' && item.image) {
            return item;
        }
        return {
            image: item,
            timestamp: Date.now()
        };
    });
    localStorage.setItem('backgroundCache', JSON.stringify(cacheWithTimestamps));
}

/**
 * Converts image URL to base64 string for caching
 * Handles fetch errors gracefully by returning null
 * @param {string} url - URL of image to convert
 * @returns {Promise<string|null>} Base64 encoded image or null if conversion fails
 */
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
        return null;
    }
}

/**
 * Fetches a random background image from Picsum Photos API and converts it to base64
 * Returns null if the fetch or conversion fails
 */
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

/**
 * Updates the background image cache by fetching a new image and maintaining
 * a rolling cache of the 3 most recent images
 */
async function updateBackgroundCache() {
    const cache = getBackgroundCache();
    const newImage = await fetchNewBackgroundImage();
    
    if (newImage) {
        cache.push(newImage);
        while (cache.length > 3) {
            cache.shift();
        }
        setBackgroundCache(cache);
    }
}

/**
 * Rotates through cached background images, updating timestamps
 * to maintain proper rotation order
 */
function rotateBackground() {
    const cache = getBackgroundCache();
    if (cache.length <= 1) return; // Nothing to rotate if only one or no images
    
    const sortedCache = [...cache].sort((a, b) => a.timestamp - b.timestamp);
    const rotatedCache = [...sortedCache.slice(1), {
        ...sortedCache[0],
        timestamp: Date.now()
    }];
    
    setBackgroundCache(rotatedCache);
    document.body.style.backgroundImage = `url('${rotatedCache[0].image}')`;
}

/**
 * Main background loading function that handles:
 * - Initial background display from cache
 * - Cache filling for new installations
 * - Cache updates and rotation for existing installations
 * - Delayed background updates to prevent overwhelming the browser
 */
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

/**
 * Sets initial background styling properties
 */
function initializeBackground() {
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    loadBackground();
}

/**
 * Gets the best available favicon URL for a given website URL
 * Uses DuckDuckGo's favicon service for external URLs
 * Falls back to a default icon for local/internal URLs
 */
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
        
        return `https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`;
        
    } catch (error) {
        // Fallback to default icon
        return DEFAULT_FALLBACK_ICON;
    }
}

const DEFAULT_FALLBACK_ICON = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="20" fill="#555"/>
        <text x="50" y="50" font-family="Arial" font-size="50" 
              text-anchor="middle" dy=".3em" fill="#fff">?</text>
    </svg>
`);

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

function safeRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('LocalStorage remove error:', error);
        return false;
    }
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Drag and drop handlers for bookmark reordering
 */
function handleDragStart(e) {
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

/**
 * Handles drag and drop reordering of bookmarks
 * Calculates insertion position based on mouse coordinates
 */
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

function getBookmarkSettings() {
    return {
        hideAddButton: safeGet('hideAddButton') || false
    };
}

function saveBookmarkSettings(settings) {
    return safeSet('hideAddButton', settings.hideAddButton);
}

/**
 * Favicon management system with caching and fallbacks
 */
let alternativeIcons = null;
let alternativeIconsPromise = null;

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
        const domain = new URL(url).hostname;
        
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

/**
 * Checks for duplicate bookmarks by normalizing and comparing URLs
 */
function isDuplicateBookmark(url, bookmarks) {
    // Normalize URLs for comparison by removing trailing slashes and protocol
    const normalizeUrl = (u) => {
        try {
            const urlObj = new URL(u);
            return urlObj.hostname + urlObj.pathname.replace(/\/$/, '') + urlObj.search;
        } catch {
            return u;
        }
    };
    
    const normalizedNew = normalizeUrl(url);
    return bookmarks.some(bookmark => normalizeUrl(bookmark.url) === normalizedNew);
}

/**
 * Loads and displays bookmarks in the grid with fade-in animation.
 * Handles bookmark CRUD operations, drag-and-drop reordering, and icon loading.
 * Each bookmark has edit/delete options in a context menu.
 */
async function loadBookmarks() {
    const bookmarks = safeGet('bookmarks') || [];
    const grid = document.getElementById('quickLinks');
    grid.innerHTML = '';

    // Add drag and drop event listeners to the grid
    grid.addEventListener('dragover', handleDragOver);
    grid.addEventListener('drop', handleDrop);

    // Create all bookmark elements first but keep them invisible
    const bookmarkPromises = bookmarks.map(async (bookmark, index) => {
        const link = document.createElement('a');
        link.href = bookmark.url;
        link.className = 'quick-link invisible';
        link.draggable = true;
        link.dataset.index = index;
        
        // Add drag event listeners
        link.addEventListener('dragstart', handleDragStart);
        link.addEventListener('dragend', handleDragEnd);
        
        link.innerHTML = `
            <div class="icon-wrapper">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='rgba(255,255,255,0.15)'/%3E%3Cstop offset='100%25' stop-color='rgba(255,255,255,0.05)'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='8' fill='url(%23g)'/%3E%3C/svg%3E" 
                     alt="${sanitizeHTML(bookmark.name)}"
                     style="opacity: 0.8; transition: opacity 0.3s ease;">
            </div>
            <span>${sanitizeHTML(bookmark.name)}</span>
            <div class="quick-link-menu">
                <div class="menu-items">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
                <span class="menu-dots">⋮</span>
            </div>
        `;
        
        grid.appendChild(link);

        // Load icon with timeout
        try {
            const iconPromise = resolveFavicon(bookmark.url, bookmark.icon);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Icon load timeout')), 3000);
            });

            const iconUrl = await Promise.race([iconPromise, timeoutPromise]);
            const iconImg = link.querySelector('.icon-wrapper img');
            iconImg.src = iconUrl;
            iconImg.style.opacity = '1';
        } catch (error) {
            console.log(`Failed to load icon for ${bookmark.url}:`, error);
            const iconImg = link.querySelector('.icon-wrapper img');
            iconImg.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='rgba(255,255,255,0.2)'/%3E%3Cstop offset='100%25' stop-color='rgba(255,255,255,0.1)'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='8' fill='url(%23g)'/%3E%3Cpath d='M16 8C11.6 8 8 11.6 8 16s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z' fill='rgba(255,255,255,0.5)'/%3E%3C/svg%3E`;
            iconImg.style.opacity = '1';
        }

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
            const dialog = createEditDialog(bookmark.name, bookmark.url, bookmark.icon);
            
            const editForm = dialog.querySelector('#editForm');
            const nameInput = dialog.querySelector('#editName');
            const urlInput = dialog.querySelector('#editUrl');
            const iconInput = dialog.querySelector('#editIcon');
            
            // Set initial values
            nameInput.value = bookmark.name;
            urlInput.value = bookmark.url;
            iconInput.value = bookmark.icon || '';
            
            // Update the edit form submission handler
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
                    icon: iconUrl || null
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

        return link;
    });

    // Wait for all bookmarks to be processed
    await Promise.all(bookmarkPromises);

    // Add the "+" button
    const addButton = document.createElement('a');
    addButton.href = '#';
    addButton.className = 'add-bookmark invisible';
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

        // Update the add form submission handler
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
            
            // Check for duplicates before adding
            if (isDuplicateBookmark(urlValidation.value, bookmarks)) {
                alert('This URL already exists in your bookmarks');
                return;
            }
            
            const bookmark = {
                name: sanitizeHTML(nameValidation.value),
                url: urlValidation.value,
                icon: iconUrl || null
            };

            bookmarks.push(bookmark);
            
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

    // Fade in all elements with a stagger effect
    const allItems = grid.querySelectorAll('.quick-link, .add-bookmark');
    allItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.remove('invisible');
        }, index * 50); // 50ms delay between each item
    });
}

/**
 * Default bookmarks that are added for new users
 */
function getDefaultBookmarks() {
    return [
        { name: 'Google', url: 'https://www.google.com' },
        { name: 'YouTube', url: 'https://youtube.com' },
        { name: 'Discord', url: 'https://discord.com/channels/@me' }
    ];
}

/**
 * Retrieves list of default bookmarks that user has deleted
 */
function getDeletedDefaults() {
    return safeGet('deletedDefaults') || [];
}

/**
 * Adds default bookmarks for new users while preserving any user-deleted defaults
 */
function addDefaultBookmarks() {
    const bookmarks = safeGet('bookmarks') || [];
    const deletedDefaults = safeGet('deletedDefaults') || [];
    
    if (bookmarks.length === 0) {
        const defaultBookmarks = getDefaultBookmarks();
        if (!safeSet('bookmarks', defaultBookmarks)) return;
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
    }
}

/**
 * Settings Panel Event Handlers
 * Manages visibility of the settings panel and handles click-outside behavior
 */
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

/**
 * Updates the search engine logo based on the selected engine
 * Handles both default engines and custom user-defined engines
 */
function updateSearchEngineLogo() {
    const button = document.getElementById('searchEngine');
    const engine = button.dataset.engine;
    
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

/**
 * Main initialization function that runs on DOMContentLoaded
 * Sets up all components and widgets in the correct order
 */
document.addEventListener('DOMContentLoaded', function() {
    addDefaultBookmarks();
    initializeTimeWidget();
    initializeWeatherWidget();
    
    const weatherSettings = getWeatherSettings();
    if (weatherSettings.showWeather) {
        const location = loadWeatherLocation();
        document.getElementById('weatherCity').value = location.city;
        populateCountryDropdown();
        updateWeather();
    } else {
        populateCountryDropdown();
    }
    
    initializeCalendar();
    initializeBookmarkSettings();
    initializeBackground();
    loadCustomEngines();
    loadLastSelectedEngine();
    updateDateTime();
    document.querySelector('input[type="search"]').value = '';
    loadBookmarks();
    initializeIframeNavigation();
});

/**
 * Creates a dialog for editing existing bookmarks
 */
function createEditDialog(name, url, iconUrl = '') {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('editDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    dialog.querySelector('#editName').value = name;
    dialog.querySelector('#editUrl').value = url;
    dialog.querySelector('#editIcon').value = iconUrl || '';
    
    document.body.appendChild(dialog);
    return dialog;
}

/**
 * Creates a dialog for adding new bookmarks
 */
function createAddDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('addDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    document.body.appendChild(dialog);
    return dialog;
}

/**
 * Handles first-time user experience by showing animation on search engine
 */
function checkFirstVisit() {
    if (!localStorage.getItem('hasVisited')) {
        // Add animation class to the search form instead of just the button
        document.getElementById('searchForm').classList.add('first-visit');
        localStorage.setItem('hasVisited', 'true');
        
        // Remove the animation class after animation completes
        setTimeout(() => {
            document.getElementById('searchForm').classList.remove('first-visit');
        }, 4000); // Increased from 2000ms to 4000ms
    }
}

checkFirstVisit();

/**
 * Creates dialog for adding/editing custom search engines
 */
function createSearchEngineDialog(isEdit = false, engineData = null) {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('searchEngineDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    if (isEdit) {
        dialog.querySelector('h3').textContent = 'Edit Search Engine';
        dialog.querySelector('.save-btn').textContent = 'Save';
    }
    
    if (engineData) {
        dialog.querySelector('#engineName').value = engineData.name;
        dialog.querySelector('#engineUrl').value = engineData.url;
        dialog.querySelector('#engineIcon').value = engineData.icon || '';
    }
    
    document.body.appendChild(dialog);
    return dialog;
}

/**
 * Local storage management for search engine preferences
 */
function saveLastSelectedEngine(engineKey) {
    localStorage.setItem('lastSelectedEngine', engineKey);
}

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

/**
 * Creates and manages the search engine selector UI
 * Handles both default and custom search engines with their respective actions
 */
function createSearchEngineSelector() {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
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
    
    defaultEngines.forEach(engine => {
        const item = defaultTemplate.content.cloneNode(true).querySelector('.search-engine-item');
        item.dataset.engine = engine.key;
        const img = item.querySelector('img');
        img.src = engine.icon;
        img.alt = engine.name;
        item.querySelector('span').textContent = engine.name;
        
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

/**
 * Shows dialog for editing existing search engines
 */
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

/**
 * Updates the selected search engine and persists the selection
 */
function handleEngineSelection(engineKey) {
    const button = document.getElementById('searchEngine');
    button.dataset.engine = engineKey;
    updateSearchEngineLogo();
    saveLastSelectedEngine(engineKey);
}

/**
 * Retrieves favicon for a given search engine URL
 */
function getDefaultSearchIcon(url) {
    try {
        const hostname = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch {
        // Fallback to a generic search icon
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z"/></svg>';
    }
}

function createSearchEngineOption(engine, name, isCustom = false) {
    const option = document.createElement('option');
    option.value = engine;
    option.textContent = name;
    if (isCustom) {
        option.dataset.custom = 'true';
    }
    return option;
}

/**
 * Loads and initializes custom search engines from localStorage
 */
function loadCustomEngines() {
    const button = document.getElementById('searchEngine');
    const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
    
    const currentEngine = button.dataset.engine;
    if (customEngines[currentEngine]) {
        updateSearchEngineLogo();
    }
}

/**
 * Context menu handler for custom search engines
 */
document.getElementById('searchEngine').addEventListener('contextmenu', function(e) {
    const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
    if (customEngines[this.value]) {
        e.preventDefault();
        
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
            
            dialog.querySelector('.cancel-btn').onclick = () => {
                dialog.remove();
            };

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

/**
 * Retrieves favicon URLs for a search engine in order of preference
 */
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

/**
 * Attempts to load icons sequentially until a valid one is found
 */
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

document.getElementById('restoreDefaults').onclick = () => {
    createConfirmDialog('Restore all default bookmarks?', restoreDefaultBookmarks, 'Restore');
};

document.getElementById('searchEngine').addEventListener('click', function(e) {
    e.preventDefault();
    createSearchEngineSelector();
});

if (!document.getElementById('searchEngine').dataset.engine) {
    document.getElementById('searchEngine').dataset.engine = 'google';
    updateSearchEngineLogo();
}

/**
 * Shows dialog for adding new search engines with validation
 */
function showAddEngineDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    
    const template = document.getElementById('searchEngineDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));

    document.body.appendChild(dialog);

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

    return dialog;
}
/**
 * Validates a search engine URL to ensure it meets security and functionality requirements
 * @param {string} url - The URL to validate
 * @returns {Object} Validation result with valid boolean and optional error message
 */
function validateSearchEngineUrl(url) {
    try {
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

document.getElementById('closeSettings').addEventListener('click', function() {
    document.querySelector('.settings-panel').style.display = 'none';
});

// function to restore default bookmarks
function restoreDefaultBookmarks() {
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

// event listener for the local URLs toggle
document.getElementById('allowLocalUrls').addEventListener('change', function(e) {
    safeSet('allowLocalUrls', e.target.checked);
});

document.getElementById('allowLocalUrls').checked = isLocalUrlAllowed();

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

// event listener for the manage storage button
document.getElementById('manageStorage').addEventListener('click', function() {
    showStorageManager();
});

// Add automatic background rotation every hour if offline
setInterval(async () => {
    const online = navigator.onLine;
    if (!online) {
        rotateBackground();
    } else {
        const newImage = await fetchNewBackgroundImage();
        if (!newImage) {
            rotateBackground();
        }
    }
}, 3600000);

/**
 * Exports user data including bookmarks, settings, and preferences
 * Downloads a JSON file with timestamp in filename
 */
function exportUserData() {
    const data = {
        bookmarks: safeGet('bookmarks') || [],
        deletedDefaults: safeGet('deletedDefaults') || [],
        customSearchEngines: safeGet('customSearchEngines') || {},
        settings: {
            hideAddButton: safeGet('hideAddButton') || false,
            allowLocalUrls: localStorage.getItem('allowLocalUrls') === 'true',
            weatherWidget: safeGet('weatherWidget') !== false,
            timeWidget: safeGet('timeWidget') !== false,
            calendarWidget: localStorage.getItem('calendarWidget') === 'true',
            calculatorWidget: localStorage.getItem('calculatorWidget') === 'true'
        },
            weather: {
                city: localStorage.getItem('weatherCity') || 'Dhaka',
                country: localStorage.getItem('weatherCountry') || 'BD'
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('.')[0].replace(/[:]/g, '-');
    a.download = `nazhome_backup_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Imports user data from a JSON file and applies settings
 * @param {File} file - The JSON file containing user data
 */
async function importUserData(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (Array.isArray(data.bookmarks)) {
            safeSet('bookmarks', data.bookmarks);
        }
        
        if (Array.isArray(data.deletedDefaults)) {
            safeSet('deletedDefaults', data.deletedDefaults);
        }
        
        if (data.customSearchEngines && typeof data.customSearchEngines === 'object') {
                safeSet('customSearchEngines', data.customSearchEngines);
        }
        
        if (data.settings) {
            if (typeof data.settings.hideAddButton === 'boolean') {
                safeSet('hideAddButton', data.settings.hideAddButton);
            }
            if (typeof data.settings.allowLocalUrls === 'boolean') {
                localStorage.setItem('allowLocalUrls', data.settings.allowLocalUrls);
            }
            if (typeof data.settings.weatherWidget === 'boolean') {
                safeSet('weatherWidget', data.settings.weatherWidget);
            }
            if (typeof data.settings.timeWidget === 'boolean') {
                safeSet('timeWidget', data.settings.timeWidget);
            }
            if (typeof data.settings.calendarWidget === 'boolean') {
                localStorage.setItem('calendarWidget', data.settings.calendarWidget);
            }
            if (typeof data.settings.calculatorWidget === 'boolean') {
                localStorage.setItem('calculatorWidget', data.settings.calculatorWidget);
            }
        }
        
        if (data.weather) {
            if (data.weather.city) {
                localStorage.setItem('weatherCity', data.weather.city);
            }
            if (data.weather.country) {
                localStorage.setItem('weatherCountry', data.weather.country);
            }
        }

        // Reload the page to apply all settings
        window.location.reload();
        } catch (error) {
        console.error('Failed to import data:', error);
        alert('Failed to import data. Please check if the file is valid.');
        }
}

document.getElementById('exportData').addEventListener('click', exportUserData);

document.getElementById('importData').addEventListener('click', function() {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        importUserData(e.target.files[0]);
    }
});

/**
 * Updates weather widget with current conditions
 * Fetches data from OpenWeatherMap API
 */
async function updateWeather() {
    const settings = getWeatherSettings();
    const weatherContainer = document.getElementById('weather');
    
    if (!settings.showWeather || !weatherContainer) {
        return;
    }

    weatherContainer.style.opacity = '0';
    weatherContainer.style.display = 'none';
    
    const location = loadWeatherLocation();
    if (!location.city || !location.country) {
        console.warn('Invalid weather location');
        return;
    }
    
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location.city)},${encodeURIComponent(location.country)}&units=metric&appid=6d055e39ee237af35ca066f35474e9df`
        );
        
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();
        
        const elements = {
            city: weatherContainer.querySelector('.city'),
            temp: weatherContainer.querySelector('.temp'),
            desc: weatherContainer.querySelector('.description'),
            icon: weatherContainer.querySelector('.weather-icon')
        };
        
        if (!Object.values(elements).every(el => el)) {
            throw new Error('Missing weather widget elements');
        }

        elements.city.textContent = data.name;
        elements.temp.textContent = `${Math.round(data.main.temp)}°C`;
        elements.desc.textContent = data.weather[0].description;
        elements.icon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        elements.icon.alt = data.weather[0].description;

        weatherContainer.style.display = 'block';
        weatherContainer.offsetHeight;
        weatherContainer.style.opacity = '1';

    } catch (error) {
        console.error('Weather update failed:', error);
        weatherContainer.style.display = 'none';
        weatherContainer.style.opacity = '0';
    }
}

// Update weather every 30 minutes
setInterval(updateWeather, 30 * 60 * 1000);

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

/**
 * Fetches country list from GeoNames API and populates country dropdown
 */
async function populateCountryDropdown() {
    const select = document.getElementById('weatherCountry');
    const savedCountry = localStorage.getItem('weatherCountry') || 'BD';
    
    try {
        const response = await fetch('https://secure.geonames.org/countryInfoJSON?username=nazhome');
        if (!response.ok) throw new Error('Failed to fetch countries');
        
        const data = await response.json();
        const countries = data.geonames;
        
        // Sort countries by name
        countries.sort((a, b) => a.countryName.localeCompare(b.countryName));
        
        select.innerHTML = '';
        
        // Add countries to dropdown
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.countryCode; // ISO 2-letter country code
            option.textContent = country.countryName;
            option.selected = country.countryCode === savedCountry;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching countries:', error);
        // Fallback to Bangladesh if fetch fails
        select.innerHTML = `<option value="BD">Bangladesh</option>`;
    }
}

/**
 * Calendar Widget Module
 * Provides a dynamic calendar interface with month navigation and today's date highlighting.
 * State is persisted in localStorage.
 */
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

document.addEventListener('DOMContentLoaded', initializeCalendar);

/**
 * Calculator Widget Module
 * Provides basic and scientific calculator functionality with keyboard support.
 * Features include:
 * - Basic arithmetic operations
 * - Scientific functions (sin, cos, tan, log, ln)
 * - Support for π and exponents
 * - Expression parsing
 * - Keyboard shortcuts
 * - Persistent mode storage
 */
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
        this.lastAnswer = '0';
        this.expressionInput = document.querySelector('.expression-input');
        
        this.isScientific = localStorage.getItem('calculatorMode') === 'scientific';
        this.updateMode();

        this.expressionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.parseAndCompute(this.expressionInput.value);
            }
        });
    }

    updateMode() {
        const widget = document.getElementById('calculator-widget');
        const basicGrid = widget?.querySelector('.calculator-grid.basic-mode');
        const scientificGrid = widget?.querySelector('.calculator-grid.scientific-mode');
        
        if (!widget || !basicGrid || !scientificGrid) {
            console.warn('Calculator elements not found');
            return;
        }
        
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
            this.currentCalculation = this.lastResult;
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
        this.expressionInput.value = '';
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

            // For debugging, please create an issue on github and paste the parsed expression here
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
        const calculatorWidget = document.getElementById('calculator-widget');
        // Check if calculator is visible AND we're not focused on an input element
        if (calculatorWidget.style.display !== 'none' && 
            !e.target.matches('input, textarea')) {
            
            const key = e.key;
            
            // Prevent default behavior for calculator keys
            if (!/^F\d+$/.test(key)) { // Don't prevent F1-F12 keys
                e.preventDefault();
            }
            
            if (/[0-9.]/.test(key)) {
                calculator.appendNumber(key);
            } else if (['+', '-', '*', '/', '(', ')', '^'].includes(key)) {
                // Map keyboard operators to calculator operators
                const operatorMap = {
                    '*': '×',
                    '/': '÷',
                    '^': '^'
                };
                calculator.appendOperator(operatorMap[key] || key);
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

/**
 * Helper function to format large numbers using scientific notation
 * Converts numbers to a format like "1.23×10⁴" for better readability
 */
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

/**
 * Helper function to parse formatted numbers back to standard notation
 * Converts numbers like "1.23×10⁴" back to "1.23e4"
 */
function parseFormattedNumber(str) {
    if (str.includes('×10')) {
        const [base, exp] = str.split('×10');
        const exponent = exp.split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)).join('');
        return `${base}e${exponent}`;
    }
    return str;
} 

function initializeBookmarkSettings() {
    const settings = getBookmarkSettings();
    document.getElementById('hideAddButton').checked = settings.hideAddButton;
}

document.getElementById('hideAddButton').addEventListener('change', function(e) {
    const settings = getBookmarkSettings();
    settings.hideAddButton = e.target.checked;
    if (saveBookmarkSettings(settings)) {
        loadBookmarks();
    }
});

/**
 * Weather Widget Management Functions
 * Handles weather widget visibility and persistence
 */
function getWeatherSettings() {
    return {
        showWeather: safeGet('weatherWidget') !== false
    };
}

function saveWeatherSettings(settings) {
    return safeSet('weatherWidget', settings.showWeather);
}

function initializeWeatherWidget() {
    const settings = getWeatherSettings();
    const weatherWidget = document.getElementById('weather');
    const weatherToggle = document.getElementById('weatherWidget');
    
    // Add null checks
    if (!weatherWidget || !weatherToggle) return;
    
    weatherToggle.checked = settings.showWeather;
    weatherWidget.style.display = settings.showWeather ? 'block' : 'none';
}

document.getElementById('weatherWidget').addEventListener('change', function(e) {
    const settings = getWeatherSettings();
    settings.showWeather = e.target.checked;
    if (saveWeatherSettings(settings)) {
        const weatherWidget = document.getElementById('weather');
        weatherWidget.style.display = e.target.checked ? 'block' : 'none';
        if (e.target.checked) {
            updateWeather();
        }
    }
});

/**
 * Time Widget Management Functions
 * Handles time widget visibility and persistence
 */
function getTimeSettings() {
    return {
        showTime: safeGet('timeWidget') !== false
    };
}

function saveTimeSettings(settings) {
    return safeSet('timeWidget', settings.showTime);
}

function initializeTimeWidget() {
    const settings = getTimeSettings();
    const timeWidget = document.getElementById('datetime');
    const timeToggle = document.getElementById('timeWidget');
    
    timeToggle.checked = settings.showTime;
    timeWidget.style.opacity = settings.showTime ? '1' : '0';
    timeWidget.style.visibility = settings.showTime ? 'visible' : 'hidden';
    timeWidget.style.display = 'flex';
}

document.getElementById('timeWidget').addEventListener('change', function(e) {
    const settings = getTimeSettings();
    settings.showTime = e.target.checked;
    if (saveTimeSettings(settings)) {
        const timeWidget = document.getElementById('datetime');
        timeWidget.style.opacity = e.target.checked ? '1' : '0';
        timeWidget.style.visibility = e.target.checked ? 'visible' : 'hidden';
    }
});

/**
 * Keyboard Shortcuts
 * Alt + T: Toggle Time Widget
 * Alt + C: Toggle Calendar Widget
 * Alt + W: Toggle Weather Widget
 * Alt + L: Toggle Calculator Widget
 */
document.addEventListener('keydown', function(e) {
    // Only handle if Alt key is pressed
    if (!e.altKey) return;
    
    switch (e.key.toLowerCase()) {
        case 't': // Alt + T for Time
            e.preventDefault();
            const timeToggle = document.getElementById('timeWidget');
            timeToggle.checked = !timeToggle.checked;
            timeToggle.dispatchEvent(new Event('change'));
            break;
            
        case 'c': // Alt + C for Calendar
            e.preventDefault();
            const calendarToggle = document.getElementById('calendarWidget');
            calendarToggle.checked = !calendarToggle.checked;
            calendarToggle.dispatchEvent(new Event('change'));
            break;
            
        case 'w': // Alt + W for Weather
            e.preventDefault();
            const weatherToggle = document.getElementById('weatherWidget');
            weatherToggle.checked = !weatherToggle.checked;
            weatherToggle.dispatchEvent(new Event('change'));
            break;
            
        case 'l': // Alt + L for Calculator
            e.preventDefault();
            const calcToggle = document.getElementById('calculatorWidget');
            calcToggle.checked = !calcToggle.checked;
            calcToggle.dispatchEvent(new Event('change'));
            break;
    }
});

/* styles to make the settings panel scrollable */
const settingsContent = document.querySelector('.settings-content');
if (settingsContent) {
    settingsContent.style.maxHeight = 'calc(80vh - 4rem)';
    settingsContent.style.overflowY = 'auto';
    settingsContent.style.paddingRight = '0.5rem';
} 

// Add click handlers for setting items
document.querySelectorAll('.setting-item').forEach(item => {
    item.addEventListener('click', (e) => {
        // Don't trigger if clicking on inputs, select, or update button
        if (e.target.closest('.weather-location') || 
            e.target.closest('.update-btn') || 
            e.target.closest('.widgets-grid')) {
            return;
        }

        const button = item.querySelector('button');
        if (button) {
            button.click();
        }
    });
});

/**
 * Handles visibility of quick links based on scroll position
 * Hides links that would overlap with the search container
 */
function handleQuickLinksVisibility() {
    const searchContainer = document.querySelector('.search-container');
    const links = document.querySelectorAll('.grid-container a');
    
    if (!searchContainer || !links.length) return;
    
    const searchBottom = searchContainer.getBoundingClientRect().bottom;
    
    links.forEach(link => {
        const linkTop = link.getBoundingClientRect().top;
        if (linkTop < searchBottom) {
            link.style.opacity = '0';
            link.style.pointerEvents = 'none';
        } else {
            link.style.opacity = '1';
            link.style.pointerEvents = 'auto';
        }
    });
}

let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            handleQuickLinksVisibility();
            ticking = false;
        });
        ticking = true;
    }
});

/**
 * Creates and displays the About dialog
 * Shows information about the application and its features
 */
async function fetchLatestVersion() {
    try {
        const response = await fetch('https://api.github.com/repos/nazdridoy/nazhome/releases/latest');
        if (!response.ok) throw new Error('Failed to fetch version');
        
        const data = await response.json();
        if (!data.tag_name) throw new Error('No version tag found');

        // Update all version tags in the document
        const versionTags = document.getElementsByClassName('version-tag');
        Array.from(versionTags).forEach(tag => {
            tag.textContent = data.tag_name;
            tag.style.display = 'inline'; // Show the version tag
        });
    } catch (error) {
        console.warn('Failed to fetch version:', error);
        // Don't show version tag if fetch fails
        const versionTags = document.getElementsByClassName('version-tag');
        Array.from(versionTags).forEach(tag => {
            tag.style.display = 'none';
        });
    }
}

// Call this function when showing the about dialog
function showAboutDialog() {
    // Close the settings panel first
    const settingsPanel = document.querySelector('.settings-panel');
    if (settingsPanel) {
        settingsPanel.style.display = 'none';
    }

    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    const template = document.getElementById('aboutDialogTemplate');
    dialog.appendChild(template.content.cloneNode(true));
    
    // Fetch version when dialog is shown
    fetchLatestVersion();
    
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    document.body.appendChild(dialog);
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

// Add event listener in the DOMContentLoaded section
document.getElementById('aboutButton').addEventListener('click', showAboutDialog);

// Add event listener in the DOMContentLoaded section
document.getElementById('aboutButtonCorner').addEventListener('click', showAboutDialog);


// Call on page load
document.addEventListener('DOMContentLoaded', handleQuickLinksVisibility);

// Handle iframe navigation for links and search
function initializeIframeNavigation() {
    // Handle link clicks
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
            // Don't intercept links that should open in new tabs
            if (link.target === '_blank' || link.hasAttribute('download') || e.ctrlKey || e.metaKey) {
                return;
            }
            
            e.preventDefault();
            
            // Check if we're in an iframe
            if (window !== window.top) {
                // Send message to parent frame
                window.parent.postMessage({
                    type: 'navigation',
                    url: link.href
                }, '*');
            } else {
                // Normal navigation if not in iframe
                window.location.href = link.href;
            }
        }
    });

    // Handle search form submission
    const searchForm = document.getElementById('searchForm');
    const originalHandler = searchForm.onsubmit;
    
    searchForm.onsubmit = function(e) {
        e.preventDefault();
        const query = this.querySelector('input[type="search"]').value;
        if (!query) return;
        
        // Check if we're in an iframe
        if (window !== window.top) {
            // Get the search URL using the original logic
            const engine = document.getElementById('searchEngine').dataset.engine;
            let searchUrl;
            
            // Check for custom search engines
            const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
            if (customEngines[engine]) {
                searchUrl = customEngines[engine].url.replace('{searchTerm}', encodeURIComponent(query));
            } else {
                // Use default search engines
                const searchEngines = {
                    google: 'https://www.google.com/search?q=',
                    ddg: 'https://duckduckgo.com/?q=',
                    brave: 'https://search.brave.com/search?q=',
                    yandex: 'https://yandex.com/search/?text='
                };
                searchUrl = searchEngines[engine] + encodeURIComponent(query);
            }
            
            // Send message to parent frame
            window.parent.postMessage({
                type: 'navigation',
                url: searchUrl
            }, '*');
        } else {
            // If not in iframe, use the original handler
            originalHandler.call(this, e);
        }
    };
}

document.addEventListener('DOMContentLoaded', function() {
    initializeIframeNavigation();
});

import './styles.css';