// Global declarations for Vitest functions when they're used outside of modules
declare global {
  // Individual test case
  const it: (typeof import('vitest'))['it'];
  const test: (typeof import('vitest'))['test'];

  // Describe test suites
  const describe: (typeof import('vitest'))['describe'];

  // Hooks
  const beforeEach: (typeof import('vitest'))['beforeEach'];
  const afterEach: (typeof import('vitest'))['afterEach'];
  const beforeAll: (typeof import('vitest'))['beforeAll'];
  const afterAll: (typeof import('vitest'))['afterAll'];

  // Mocks and spies
  const vi: (typeof import('vitest'))['vi'];
  const expect: (typeof import('vitest'))['expect'];

  namespace Vi {
    interface JestMatchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(expected: string | RegExp): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toHaveClass(expected: string): R;
      // Add other testing-library matchers here
    }
  }
}

export {};
