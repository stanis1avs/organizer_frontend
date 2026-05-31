module.exports = async function globalTeardown() {
  if (global.__E2E_STATIC_SERVER__) {
    await new Promise((resolve) => global.__E2E_STATIC_SERVER__.close(resolve));
    console.log('[E2E] Static server stopped.');
  }
};
