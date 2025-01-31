const fs = require('fs').promises;
const { execSync } = require('child_process');
const path = require('path');

async function getLatestTag() {
  try {
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return tag;
  } catch (error) {
    return 'v0.0.0';
  }
}

async function updateVersionFiles() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const forceDev = args.includes('--dev');
    const forceProd = args.includes('--prod');

    // Determine environment
    const isDevelopment = forceDev || process.env.NODE_ENV === 'development';
    const date = new Date().toISOString();
    const latestTag = await getLatestTag();

    // Only update version.json if we're in production
    if (!isDevelopment) {
      const prodVersionPath = path.join(__dirname, '../public/version.json');
      const prodVersionJson = {
        version: latestTag,
        lastUpdated: date
      };
      await fs.writeFile(
        prodVersionPath,
        JSON.stringify(prodVersionJson, null, 2)
      );
      console.log('Production version.json updated:', latestTag);
      return;
    }

    // Development version
    const devVersionPath = path.join(__dirname, '../public/version.dev.json');
    const devVersionJson = {
      version: 'development',
      lastUpdated: date
    };
    
    await fs.writeFile(
      devVersionPath,
      JSON.stringify(devVersionJson, null, 2)
    );
    console.log('Development version.dev.json updated');

  } catch (error) {
    console.error('Error updating version files:', error);
    process.exit(1);
  }
}

updateVersionFiles(); 