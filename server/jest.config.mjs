export default {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'mjs'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '^lowdb$': '<rootDir>/__tests__/__mocks__/lowdb.js',
    '^lowdb/node$': '<rootDir>/__tests__/__mocks__/lowdb-node.js'
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'config/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000,
  verbose: true
};