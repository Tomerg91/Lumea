import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SessionModal from '../components/SessionModal';
import { Client } from '../components/ClientsTable';

/**
 * Regression Test: Ensure components using auth context can be tested without blank UI
 * 
 * This test prevents the "useAuth must be used within an AuthProvider" error
 * that causes components to fail to render during testing, resulting in blank UI.
 * 
 * Background: Components that use useAuth() or hooks that depend on useAuth()
 * (like useCreateSession) would fail to render in tests without proper mocking.
 */

// Mock the useAuth hook to prevent AuthProvider dependency
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-user-id' } },
    user: { id: 'test-user-id', role: 'coach' },
    profile: { id: 'test-user-id', role: 'coach' },
    loading: false,
    authError: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

// Mock other dependencies
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@headlessui/react', () => {
  const MockDialog = ({ open, children }: any) => (
    open ? <div data-testid="dialog">{children}</div> : null
  );
  MockDialog.Panel = ({ children }: any) => <div data-testid="dialog-panel">{children}</div>;
  MockDialog.Title = ({ children }: any) => <h3 data-testid="dialog-title">{children}</h3>;
  return { Dialog: MockDialog };
});

vi.mock('@radix-ui/react-icons', () => ({
  Cross2Icon: () => <div data-testid="cross-icon">✕</div>,
}));

vi.mock('date-fns', () => ({
  format: () => '2023-07-15',
}));

// Create test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Auth Context Regression Tests', () => {
  const mockClients: Client[] = [
    {
      _id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      createdAt: '2023-01-01T00:00:00.000Z',
      lastSessionDate: '2023-05-15T14:30:00.000Z',
    },
  ];

  it('should render SessionModal without auth context errors', () => {
    // This test ensures that components using auth hooks can be rendered in tests
    // without the "useAuth must be used within an AuthProvider" error
    const { getByTestId } = render(
      <SessionModal
        isOpen={true}
        onClose={vi.fn()}
        clients={mockClients}
      />,
      { wrapper: createWrapper() }
    );

    // If this test passes, it means the component rendered successfully
    // without encountering the blank UI issue caused by missing auth context
    expect(getByTestId('dialog')).toBeDefined();
    expect(getByTestId('dialog-panel')).toBeDefined();
    expect(getByTestId('dialog-title')).toBeDefined();
  });

  it('should render forms and inputs without auth context errors', () => {
    const { getByLabelText } = render(
      <SessionModal
        isOpen={true}
        onClose={vi.fn()}
        clients={mockClients}
      />,
      { wrapper: createWrapper() }
    );

    // Verify that form elements render properly
    expect(getByLabelText('sessions.selectClient')).toBeDefined();
    expect(getByLabelText('sessions.sessionDate')).toBeDefined();
    expect(getByLabelText('sessions.notes')).toBeDefined();
  });

  it('should handle user interactions without auth context errors', () => {
    const mockOnClose = vi.fn();
    const { getByText } = render(
      <SessionModal
        isOpen={true}
        onClose={mockOnClose}
        clients={mockClients}
      />,
      { wrapper: createWrapper() }
    );

    // Verify that interactive elements work
    const cancelButton = getByText('common.cancel');
    expect(cancelButton).toBeDefined();
    
    // This proves the component is fully interactive, not just a blank UI
    expect(() => cancelButton.click()).not.toThrow();
  });
}); 