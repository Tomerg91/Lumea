// Import the root ESLint configuration
import rootConfig from '../eslint.config.js';

// Add server-specific overrides
export default [
  ...rootConfig,
  {
    files: ['**/*.{ts,js}'],
    rules: {
      // Server-specific rules can be added here
      '@typescript-eslint/no-unused-vars': 'error', // Stricter in server code
    },
  }
]; 