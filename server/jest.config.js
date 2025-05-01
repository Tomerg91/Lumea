module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  // Optional: Setup file for global test setup (e.g., DB connection)
  // setupFilesAfterEnv: ['./src/test-setup.ts'],
};
