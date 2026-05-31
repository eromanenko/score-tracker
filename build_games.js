const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'src', 'games');
const destDir = path.join(__dirname, 'assets', 'games');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (!fs.existsSync(srcDir)) {
  console.error(`Source directory '${srcDir}' does not exist.`);
  process.exit(1);
}

let folders = fs.readdirSync(srcDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

const isChangedOnly = process.argv.includes('--changed-only');

if (isChangedOnly) {
  try {
    const gitStatus = execSync('git status --porcelain -uall').toString();
    const changedGames = new Set();
    
    const lines = gitStatus.split('\n');
    for (const line of lines) {
      if (line.trim() && line.includes('src/games/')) {
        const match = line.match(/src[\/\\]games[\/\\]([^\/\\]+)/);
        if (match && match[1]) {
          changedGames.add(match[1]);
        }
      }
    }
    
    folders = folders.filter(f => changedGames.has(f));
    
    if (folders.length === 0) {
      console.log('No games have uncommitted changes. Nothing to pack.');
      process.exit(0);
    }
  } catch (err) {
    console.error('Failed to get git status. Packing all games instead.', err.message);
  }
}

if (folders.length === 0) {
  console.log('No games found to pack.');
}

folders.forEach(folderName => {
  const folderPath = path.join(srcDir, folderName);
  const zipPath = path.join(destDir, `${folderName}.zip`);
  
  console.log(`Packing ${folderName} -> assets/games/${folderName}.zip`);
  
  const zip = new AdmZip();
  // addLocalFolder(localPath, zipPath) 
  // zipPath="" means root of zip
  zip.addLocalFolder(folderPath, "");
  zip.writeZip(zipPath);
});

console.log('All games packed successfully!');
