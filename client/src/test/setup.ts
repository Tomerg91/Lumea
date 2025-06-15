import '@testing-library/jest-dom';

// Global test setup
global.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: process.env.NODE_ENV === 'test' ? () => {} : console.log,
}; 