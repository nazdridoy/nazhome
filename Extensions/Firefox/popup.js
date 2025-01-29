// Fetch latest version from GitHub API
async function fetchLatestVersion() {
    try {
        const response = await fetch('https://api.github.com/repos/nazdridoy/nazhome/releases/latest');
        if (!response.ok) throw new Error('Failed to fetch version');
        const data = await response.json();
        
        // Update version tag if found
        const versionTag = document.querySelector('.version-tag');
        if (versionTag && data.tag_name) {
            // Remove 'v' prefix if present
            const version = data.tag_name.replace(/^v/, '');
            versionTag.textContent = version;
        }
    } catch (error) {
        console.log('Error fetching version:', error);
        // Keep default version from HTML if fetch fails
    }
}

// Handle popup initialization
document.addEventListener('DOMContentLoaded', function() {
    // Fetch and update version
    fetchLatestVersion();

    // Handle visit button click
    const visitButton = document.getElementById('visitButton');

    if (visitButton) {
        visitButton.addEventListener('click', function() {
            browser.tabs.create({
                url: "https://nazhome.pages.dev"
            });
        });
    }
});