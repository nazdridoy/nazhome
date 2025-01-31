const fs = require('fs').promises;
const { execSync } = require('child_process');
const path = require('path');

async function getLatestTag() {
  try {
    // Try to get git tag
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return tag;
  } catch (error) {
    // Fallback version if no git tags exist
    return 'v0.0.0';
  }
}

async function updateVersionFiles() {
  try {
    const latestTag = await getLatestTag();
    const date = new Date().toISOString();

    // Update version.json
    const versionJson = {
      version: latestTag,
      lastUpdated: date
    };
    
    const versionPath = path.join(__dirname, '../public/version.json');
    await fs.writeFile(
      versionPath,
      JSON.stringify(versionJson, null, 2)
    );

    console.log('Version files updated successfully:', latestTag);
    
    // Also update localStorage if running in browser
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('appVersion', latestTag);
    }
  } catch (error) {
    console.error('Error updating version files:', error);
    process.exit(1);
  }
}

updateVersionFiles(); 