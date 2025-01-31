// Fetch latest version from GitHub API
async function fetchLatestVersion() {
    try {
        // First try to get the latest tag
        const tagsResponse = await fetch('https://api.github.com/repos/nazdridoy/nazhome/tags');
        if (!tagsResponse.ok) throw new Error('Failed to fetch tags');
        
        const tags = await tagsResponse.json();
        if (!tags || !tags.length) throw new Error('No tags found');
        
        // Get the most recent tag
        const latestTag = tags[0].name;
        
        // Update version tag if found
        const versionTag = document.querySelector('.version-tag');
        if (versionTag) {
            versionTag.textContent = latestTag;
            versionTag.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to fetch version:', error);
        // Hide version tag if fetch fails
        const versionTag = document.querySelector('.version-tag');
        if (versionTag) {
            versionTag.style.display = 'none';
        }
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