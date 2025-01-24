// Expand the icon mapping with more popular sites
const ICON_MAP = {
    // Social & Media
    'github.com': 'https://github.githubassets.com/favicons/favicon-dark.svg',
    'www.google.com': 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
    'youtube.com': 'https://www.youtube.com/s/desktop/12d6b690/img/favicon_144x144.png',
    'www.youtube.com': 'https://www.youtube.com/s/desktop/12d6b690/img/favicon_144x144.png',
    'twitter.com': 'https://abs.twimg.com/responsive-web/client-web/icon-svg.168b89d5.svg',
    'www.facebook.com': 'https://static.xx.fbcdn.net/rsrc.php/yD/r/d4ZIVX-5C-b.ico',
    'linkedin.com': 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
    
    // Productivity
    'notion.so': 'https://www.notion.so/images/logo-ios.png',
    'www.notion.so': 'https://www.notion.so/images/logo-ios.png',
    'discord.com': 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0b5493894cf60b300587_icon_clyde_white_RGB.svg',
    'slack.com': 'https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png',
    
    // Dev
    'stackoverflow.com': 'https://cdn.sstatic.net/Sites/stackoverflow/Img/apple-touch-icon.png',
    'www.figma.com': 'https://static.figma.com/app/icon/1/icon-192.png',
};

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
    localStorage.setItem('backgroundCache', JSON.stringify(cache));
}

async function imageToBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to convert image to base64:', error);
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
        // No need for separate preloadImage call
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to load new background:', error);
        return null;
    }
}

async function updateBackgroundCache() {
    const cache = getBackgroundCache();
    const newImage = await fetchNewBackgroundImage();
    
    if (newImage) {
        // Keep only the two most recent images
        cache.push(newImage);
        if (cache.length > 2) {
            cache.shift(); // Remove oldest image
        }
        setBackgroundCache(cache);
    }
}

function loadBackground() {
    const cache = getBackgroundCache();
    
    if (cache.length > 0) {
        // Use the oldest cached image
        const oldestImage = cache[0];
        document.body.style.backgroundImage = `url('${oldestImage}')`;
        
        // After page loads, fetch one new image for cache
        window.addEventListener('load', () => {
            setTimeout(async () => {
                const newImage = await fetchNewBackgroundImage();
                if (newImage) {
                    const newCache = [cache[1], newImage]; // Keep the newer cached image and add new one
                    setBackgroundCache(newCache);
                }
            }, 1000);
        });
    } else {
        // No cache, fetch one image and use it
        fetchNewBackgroundImage().then(base64Image => {
            if (base64Image) {
                document.body.style.backgroundImage = `url('${base64Image}')`;
                setBackgroundCache([base64Image]);
                
                // Fetch one more for next time
                setTimeout(async () => {
                    const nextImage = await fetchNewBackgroundImage();
                    if (nextImage) {
                        setBackgroundCache([base64Image, nextImage]);
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

// Function to get the best available icon
function getBestIcon(url) {
    try {
        const hostname = new URL(url).hostname;
        
        // 1. Check our mapped icons first
        if (ICON_MAP[hostname]) {
            return ICON_MAP[hostname];
        }
        
        // 2. Use Google's favicon service directly (faster)
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
        
    } catch (error) {
        // Fallback to a default icon
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23555"/></svg>';
    }
}

// Bookmark management
function loadBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    const grid = document.getElementById('quickLinks');
    grid.innerHTML = '';

    bookmarks.forEach((bookmark, index) => {
        const link = document.createElement('a');
        link.href = bookmark.url;
        const hostname = new URL(bookmark.url).hostname;
        
        const faviconUrl = getBestIcon(bookmark.url);
        
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
                     alt="${bookmark.name}"
                     onerror="this.src='https://www.google.com/s2/favicons?domain=${hostname}&sz=64'">
            </div>
            <span>${bookmark.name}</span>
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
            const dialog = createEditDialog(bookmark.name, bookmark.url);
            
            const editForm = dialog.querySelector('#editForm');
            const nameInput = dialog.querySelector('#editName');
            const urlInput = dialog.querySelector('#editUrl');
            
            // Handle form submission
            editForm.onsubmit = (e) => {
                e.preventDefault();
                try {
                    const parsedUrl = new URL(urlInput.value);
                    bookmarks[index] = {
                        name: nameInput.value.trim(),
                        url: parsedUrl.href
                    };
                    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
                    loadBookmarks();
                    dialog.remove();
                } catch {
                    alert('Please enter a valid URL (include http:// or https://)');
                }
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
                        localStorage.setItem('deletedDefaults', JSON.stringify(deletedDefaults));
                    }
                }
                
                // Remove from current bookmarks
                bookmarks.splice(index, 1);
                localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
                loadBookmarks();
            });
        });

        grid.appendChild(link);
    });

    // Add the "+" button
    const addButton = document.createElement('a');
    addButton.href = '#';
    addButton.className = 'add-bookmark';
    addButton.innerHTML = `
        <div class="add-button">
            <span class="plus-icon">+</span>
        </div>
        <span>Add Link</span>
    `;

    addButton.addEventListener('click', (e) => {
        e.preventDefault();
        const dialog = createAddDialog();
        
        const addForm = dialog.querySelector('#addForm');
        const urlInput = dialog.querySelector('#addUrl');
        const nameInput = dialog.querySelector('#addName');
        
        // Focus URL input
        urlInput.focus();
        
        // Handle URL input change to auto-fill name
        urlInput.addEventListener('change', () => {
            try {
                const url = new URL(urlInput.value);
                if (!nameInput.value) {
                    nameInput.value = url.hostname.replace('www.', '');
                }
            } catch {}
        });

        // Handle form submission
        addForm.onsubmit = (e) => {
            e.preventDefault();
            try {
                const parsedUrl = new URL(urlInput.value);
                const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
                
                bookmarks.push({
                    name: nameInput.value.trim(),
                    url: parsedUrl.href
                });
                
                localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
                loadBookmarks();
                dialog.remove();
            } catch {
                alert('Please enter a valid URL (include http:// or https://)');
            }
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

    grid.appendChild(addButton);
}

// Update the getDefaultBookmarks function
function getDefaultBookmarks() {
    return [
        { name: 'Google', url: 'https://www.google.com' },
        { name: 'YouTube', url: 'https://youtube.com' },
        { name: 'Reddit', url: 'https://reddit.com' }
    ];
}

// Add this function to track deleted default bookmarks
function getDeletedDefaults() {
    return JSON.parse(localStorage.getItem('deletedDefaults') || '[]');
}

// Update the addDefaultBookmarks function
function addDefaultBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    const deletedDefaults = getDeletedDefaults();
    
    // If this is first time (no bookmarks stored yet)
    if (bookmarks.length === 0) {
        // Add all default bookmarks
        localStorage.setItem('bookmarks', JSON.stringify(getDefaultBookmarks()));
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
        localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
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

// Initialize settings panel as hidden
document.querySelector('.settings-panel').style.display = 'none';

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

// Update background periodically (every hour)
setInterval(() => {
    loadBackground();
}, 3600000);

// Add this function at the top of your script
function createEditDialog(name, url) {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <div class="edit-dialog-content">
            <h3>Edit Bookmark</h3>
            <form id="editForm">
                <div class="input-group">
                    <label for="editName">Name:</label>
                    <input type="text" id="editName" value="${name}" required>
                </div>
                <div class="input-group">
                    <label for="editUrl">URL:</label>
                    <input type="url" id="editUrl" value="${url}" required>
                </div>
                <div class="button-group">
                    <button type="submit" class="save-btn">Save</button>
                    <button type="button" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(dialog);
    return dialog;
}

// Add this function for creating new bookmarks
function createAddDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <div class="edit-dialog-content">
            <h3>Add New Bookmark</h3>
            <form id="addForm">
                <div class="input-group">
                    <label for="addUrl">URL:</label>
                    <input type="url" id="addUrl" placeholder="https://example.com" required>
                </div>
                <div class="input-group">
                    <label for="addName">Name:</label>
                    <input type="text" id="addName" placeholder="Website Name" required>
                </div>
                <div class="button-group">
                    <button type="submit" class="save-btn">Add</button>
                    <button type="button" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
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
    dialog.innerHTML = `
        <div class="edit-dialog-content">
            <h3>${isEdit ? 'Edit' : 'Add'} Search Engine</h3>
            <form id="searchEngineForm">
                <div class="input-group">
                    <label for="engineName">Name:</label>
                    <input type="text" id="engineName" value="${engineData?.name || ''}" 
                           placeholder="e.g., Bing" required>
                </div>
                <div class="input-group">
                    <label for="engineUrl">Search URL:</label>
                    <input type="url" id="engineUrl" value="${engineData?.url || ''}"
                           placeholder="https://example.com/search?q={searchTerm}" required>
                    <small class="help-text">Use {searchTerm} where the search query should go</small>
                </div>
                <div class="input-group">
                    <label for="engineIcon">Icon URL: (optional)</label>
                    <input type="url" id="engineIcon" value="${engineData?.icon || ''}"
                           placeholder="https://example.com/favicon.ico">
                    <small class="help-text">Leave empty for default icon</small>
                </div>
                <div class="button-group">
                    <button type="submit" class="save-btn">${isEdit ? 'Save' : 'Add'}</button>
                    <button type="button" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
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
    
    const customEngines = JSON.parse(localStorage.getItem('customSearchEngines') || '{}');
    const defaultEngines = [
        { key: 'google', name: 'Google', icon: 'https://www.google.com/favicon.ico' },
        { key: 'ddg', name: 'DuckDuckGo', icon: 'https://duckduckgo.com/favicon.ico' },
        { key: 'brave', name: 'Brave', icon: 'https://brave.com/favicon.ico' },
        { key: 'yandex', name: 'Yandex', icon: 'https://yandex.com/favicon.ico' }
    ];

    dialog.innerHTML = `
        <div class="edit-dialog-content search-engine-selector">
            <h3>Select Search Engine</h3>
            <div class="search-engine-grid">
                ${defaultEngines.map(engine => `
                    <div class="search-engine-item" data-engine="${engine.key}">
                        <div class="icon-wrapper">
                            <img src="${engine.icon}" alt="${engine.name}">
                        </div>
                        <span>${engine.name}</span>
                    </div>
                `).join('')}
                ${Object.entries(customEngines).map(([key, engine]) => `
                    <div class="search-engine-item" data-engine="${key}">
                        <div class="quick-link-menu">
                            <div class="menu-items">
                                <button class="edit-btn">Edit</button>
                                <button class="delete-btn">Delete</button>
                            </div>
                            <span class="menu-dots">⋮</span>
                        </div>
                        <div class="icon-wrapper">
                            <img src="${engine.icon || getDefaultSearchIcon(engine.url)}" 
                                 alt="${engine.name}"
                                 onerror="this.src='${getDefaultSearchIcon(engine.url)}'">
                        </div>
                        <span>${engine.name}</span>
                    </div>
                `).join('')}
                <div class="search-engine-item add-engine">
                    <div class="icon-wrapper">
                        <span class="plus-icon">+</span>
                    </div>
                    <span>Add Custom</span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Handle menu dots for custom engines
    dialog.querySelectorAll('.search-engine-item[data-engine]').forEach(item => {
        const menuDots = item.querySelector('.menu-dots');
        const menuItems = item.querySelector('.menu-items');
        
        if (menuDots && menuItems) {
            menuDots.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Close all other open menus first
                document.querySelectorAll('.menu-items.active').forEach(menu => {
                    if (menu !== menuItems) {
                        menu.classList.remove('active');
                    }
                });
                
                menuItems.classList.toggle('active');
            });

            // Edit handler
            item.querySelector('.edit-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const engineKey = item.dataset.engine;
                const engineData = customEngines[engineKey];
                dialog.remove();
                showEditEngineDialog(engineKey, engineData);
            });

            // Delete handler
            item.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const engineKey = item.dataset.engine;
                createConfirmDialog('Delete this search engine?', () => {
                    delete customEngines[engineKey];
                    localStorage.setItem('customSearchEngines', JSON.stringify(customEngines));
                    dialog.remove();
                    createSearchEngineSelector();
                    // Reset to Google if the current engine was deleted
                    if (document.getElementById('searchEngine').dataset.engine === engineKey) {
                        handleEngineSelection('google');
                    }
                });
            });
        }

        // Selection handler
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-items') && !e.target.closest('.menu-dots')) {
                const engineKey = item.dataset.engine;
                handleEngineSelection(engineKey);
                dialog.remove();
            }
        });
    });

    // Handle add engine button
    dialog.querySelector('.add-engine')?.addEventListener('click', () => {
        dialog.remove();
        showAddEngineDialog();
    });

    // Close when clicking outside
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.menu-items') && !e.target.closest('.menu-dots')) {
            dialog.querySelectorAll('.menu-items.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });
}

// Add function to show edit dialog
function showEditEngineDialog(engineKey, engineData) {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <div class="edit-dialog-content">
            <h3>Edit Search Engine</h3>
            <form id="editEngineForm" name="editEngineForm">
                <div class="input-group">
                    <label for="engineName">Name:</label>
                    <input type="text" 
                           id="engineName" 
                           name="engineName" 
                           required 
                           value="${engineData.name}">
                </div>
                <div class="input-group">
                    <label for="engineUrl">Search URL:</label>
                    <input type="text" 
                           id="engineUrl" 
                           name="engineUrl" 
                           required 
                           value="${engineData.url}">
                    <small class="help-text">Use {searchTerm} where the search query should go</small>
                    <small class="error-text"></small>
                </div>
                <div class="input-group">
                    <label for="engineIcon">Icon URL (optional):</label>
                    <input type="text" 
                           id="engineIcon" 
                           name="engineIcon" 
                           value="${engineData.icon || ''}">
                </div>
                <div class="button-group">
                    <button type="submit" class="save-btn">Save</button>
                    <button type="button" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(dialog);

    const form = dialog.querySelector('#editEngineForm');
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

// Update the createConfirmDialog function to handle different types
function createConfirmDialog(message, onConfirm, confirmText = 'Delete') {
    const isDelete = confirmText === 'Delete';
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <div class="edit-dialog-content confirm-dialog">
            <h3>Confirm</h3>
            <p class="confirm-message">${message}</p>
            <div class="button-group">
                <button type="button" class="${isDelete ? 'delete-btn' : 'restore-btn'}">${confirmText}</button>
                <button type="button" class="cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);

    // Handle confirm button
    const confirmBtn = dialog.querySelector(`.${isDelete ? 'delete-btn' : 'restore-btn'}`);
    confirmBtn.onclick = () => {
        onConfirm();
        dialog.remove();
    };

    // Handle cancel button
    dialog.querySelector('.cancel-btn').onclick = () => {
        dialog.remove();
    };

    // Handle click outside
    dialog.onclick = (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    };

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

// Add this function to show add engine dialog
function showAddEngineDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog';
    dialog.innerHTML = `
        <div class="edit-dialog-content">
            <h3>Add Custom Search Engine</h3>
            <form id="addEngineForm" name="addEngineForm">
                <div class="input-group">
                    <label for="engineName">Name:</label>
                    <input type="text" 
                           id="engineName" 
                           name="engineName" 
                           required 
                           placeholder="e.g., Bing">
                </div>
                <div class="input-group">
                    <label for="engineUrl">Search URL:</label>
                    <input type="text" 
                           id="engineUrl" 
                           name="engineUrl" 
                           required 
                           placeholder="https://example.com/search?q={searchTerm}">
                    <small class="help-text">Use {searchTerm} where the search query should go</small>
                    <small class="error-text"></small>
                </div>
                <div class="input-group">
                    <label for="engineIcon">Icon URL (optional):</label>
                    <input type="text" 
                           id="engineIcon" 
                           name="engineIcon" 
                           placeholder="https://example.com/favicon.ico">
                </div>
                <div class="button-group">
                    <button type="submit" class="save-btn">Add</button>
                    <button type="button" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(dialog);

    const form = dialog.querySelector('#addEngineForm');
    const urlInput = document.getElementById('engineUrl');
    const errorText = urlInput.nextElementSibling.nextElementSibling;

    // Add real-time validation
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('engineName').value.trim();
        const url = urlInput.value.trim();
        const icon = document.getElementById('engineIcon').value.trim();

        // Validate URL before saving
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
    localStorage.removeItem('deletedDefaults');
    
    // Get current custom bookmarks
    const currentBookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    const customBookmarks = currentBookmarks.filter(bookmark => 
        !getDefaultBookmarks().some(def => def.url === bookmark.url)
    );
    
    // Combine default and custom bookmarks
    const allBookmarks = [...getDefaultBookmarks(), ...customBookmarks];
    localStorage.setItem('bookmarks', JSON.stringify(allBookmarks));
    loadBookmarks();
} 