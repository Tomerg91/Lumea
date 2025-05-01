// Import the root ESLint configuration
import rootConfig from '../eslint.config.js';

// Add client-specific overrides
export default [
  ...rootConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      // Client-specific rules can be added here
    },
  }
]; 