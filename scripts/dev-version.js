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
    await fs.writeFile(
      path.join(__dirname, '../public/version.json'),
      JSON.stringify(versionJson, null, 2)
    );

    // Read and update index.html
    const indexPath = path.join(__dirname, '../src/index.html');
    let indexHtml = await fs.readFile(indexPath, 'utf8');
    indexHtml = indexHtml.replace(/%VERSION%/g, latestTag);
    await fs.writeFile(indexPath, indexHtml);

    console.log('Version files updated successfully:', latestTag);
  } catch (error) {
    console.error('Error updating version files:', error);
    process.exit(1);
  }
}

updateVersionFiles(); 