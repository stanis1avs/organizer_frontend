module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  globalSetup: './globalSetup.js',
  globalTeardown: './globalTeardown.js',
  testTimeout: 30000,
  // Tests share port 7000 for the mock backend — must run sequentially
  maxWorkers: 1,
};
