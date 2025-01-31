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
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Update version.json
    const versionJson = {
      version: isDevelopment ? 'development' : latestTag,
      lastUpdated: date
    };
    
    // Use different files for development and production
    const fileName = isDevelopment ? 'version.dev.json' : 'version.json';
    const versionPath = path.join(__dirname, '../public/', fileName);
    
    await fs.writeFile(
      versionPath,
      JSON.stringify(versionJson, null, 2)
    );

    console.log(`Version file (${fileName}) updated successfully:`, versionJson.version);
    
    // Also update localStorage if running in browser
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('appVersion', versionJson.version);
    }
  } catch (error) {
    console.error('Error updating version files:', error);
    process.exit(1);
  }
}

updateVersionFiles(); 