const fs = require('fs');
const path = require('path');

// Get the current version from package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = require(packageJsonPath);
const version = packageJson.version;

console.log(`Syncing version ${version} to other files...`);

// 1. Update service-worker.js
const swPath = path.join(__dirname, 'service-worker.js');
try {
  let swContent = fs.readFileSync(swPath, 'utf8');
  // Find CACHE_NAME = 'score-tracker-v...'; and replace the version
  swContent = swContent.replace(/(CACHE_NAME\s*=\s*['"`]score-tracker-v)[0-9.]+(['"`])/, `$1${version}$2`);
  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`✅ Updated service-worker.js to v${version}`);
} catch (error) {
  console.error(`❌ Failed to update service-worker.js:`, error.message);
}

// 2. Update assets/games.json
const gamesJsonPath = path.join(__dirname, 'assets', 'games.json');
try {
  let gamesContent = fs.readFileSync(gamesJsonPath, 'utf8');
  const gamesData = JSON.parse(gamesContent);
  gamesData.version = version;
  fs.writeFileSync(gamesJsonPath, JSON.stringify(gamesData, null, 2) + '\n', 'utf8');
  console.log(`✅ Updated assets/games.json to v${version}`);
} catch (error) {
  console.error(`❌ Failed to update assets/games.json:`, error.message);
}

console.log('Version sync complete!');
