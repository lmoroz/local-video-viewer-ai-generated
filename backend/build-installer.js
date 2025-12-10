const fs = require('fs-extra');
const path = require('path');
const {execSync} = require('child_process');

async function build() {
  const frontendSrc = path.join(__dirname, '../frontend/dist');
  const frontendDest = path.join(__dirname, 'frontend-dist');

  console.log('Checking for frontend build...');
  if (!fs.existsSync(frontendSrc)) {
    console.error('Frontend build not found! Please run "npm run build" in the frontend directory first.');
    process.exit(1);
  }

  console.log('Clearing old frontend assets...');
  await fs.remove(frontendDest);

  console.log('Copying frontend build to backend...');
  await fs.copy(frontendSrc, frontendDest);

  console.log('Copying icon...');
  const iconSrc = path.join(__dirname, '../frontend/public/app_icon.png');
  const iconDest = path.join(__dirname, 'icon.png');
  await fs.copy(iconSrc, iconDest);

  console.log('Building Electron app...');
  try {
    execSync('npx electron-builder', {stdio: 'inherit'});
    await fs.remove(frontendDest);
  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  }
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
