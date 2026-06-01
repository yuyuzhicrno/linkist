export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['js', 'mjs', 'ts'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '^lowdb$': '<rootDir>/__tests__/__mocks__/lowdb.js',
    '^lowdb/node$': '<rootDir>/__tests__/__mocks__/lowdb-node.js',
    '^(\\.{1,3}/src/config/index)$': '<rootDir>/src/config/index.ts',
    '^(\\.{1,3}/src/middleware/validation)$': '<rootDir>/src/middleware/validation.js',
    '^(\\.{1,3}/src/data/db)$': '<rootDir>/src/data/db.js',
    '^(\\.{1,3}/src/services-registry)$': '<rootDir>/src/services-registry.ts',
    '^(\\.{1,3}/src/routes/auth)$': '<rootDir>/src/routes/auth.js'
  },
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000,
  verbose: true
};