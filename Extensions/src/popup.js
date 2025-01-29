// Fetch latest version from GitHub API
async function fetchLatestVersion() {
    try {
        const response = await fetch('https://api.github.com/repos/nazdridoy/nazhome/releases/latest');
        if (!response.ok) throw new Error('Failed to fetch version');
        const data = await response.json();
        
        // Update version tag if found
        const versionTag = document.querySelector('.version-tag');
        if (versionTag && data.tag_name) {
            versionTag.textContent = data.tag_name;
            versionTag.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to fetch version:', error);
    }
}

// Handle popup initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Handle the visit button click
    document.getElementById('visitButton').addEventListener('click', () => {
        window.open('https://nazhome.pages.dev', '_blank');
    });

    // Fetch latest version from GitHub
    await fetchLatestVersion();
});