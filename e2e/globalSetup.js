const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createStaticServer } = require('./helpers/staticServer');

// After the move into organizer_frontend/e2e/, __dirname is one level below
// the frontend root, so '..' points to organizer_frontend/ itself.
const FRONTEND_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(FRONTEND_DIR, 'dist');
const STATIC_PORT = 3001;

module.exports = async function globalSetup() {
  // Build the frontend unless SKIP_BUILD=1 is set and dist already exists
  const distIndex = path.join(DIST_DIR, 'index.html');
  const skipBuild = process.env.SKIP_BUILD === '1' && fs.existsSync(distIndex);

  if (!skipBuild) {
    console.log('\n[E2E] Building frontend (set SKIP_BUILD=1 to reuse existing dist)...');
    execSync('npm run build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
    console.log('[E2E] Build done.\n');
  } else {
    console.log('[E2E] Skipping build — using existing dist/\n');
  }

  // Start the static file server for the built frontend
  const server = await createStaticServer(DIST_DIR, STATIC_PORT);
  global.__E2E_STATIC_SERVER__ = server;

  const url = `http://localhost:${STATIC_PORT}`;
  console.log(`[E2E] Frontend served at ${url}`);

  // Open the running app in the default system browser so it is easy to inspect
  exec(`cmd /c start "" "${url}"`, (err) => {
    if (err) console.warn('[E2E] Could not auto-open browser:', err.message);
  });
};
