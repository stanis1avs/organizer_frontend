module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|png|jpg|gif|svg)$': '<rootDir>/src/tests/__mocks__/fileMock.js',
  },
};
