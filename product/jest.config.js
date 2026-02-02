
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],       // from __tests__ to tests
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],  // update path
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
};
