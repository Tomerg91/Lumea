import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClientsTable, { Client } from '../components/ClientsTable';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'clients.name': 'Name',
        'clients.email': 'Email',
        'clients.lastSession': 'Last Session',
        'clients.noClientsYet': 'No clients yet',
        'clients.noClientsMessage':
          "You don't have any clients yet. Start by inviting someone to join.",
        'clients.inviteClient': 'Invite Client',
        'clients.viewDetails': 'View Details',
        'clients.noSessions': 'No sessions yet',
        'clients.invalidDate': 'Invalid date',
        actions: 'Actions',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

describe('ClientsTable', () => {
  const mockOnInviteClick = vi.fn();

  // Reset mock function before each test
  beforeEach(() => {
    mockOnInviteClick.mockReset();
  });

  it('should render loading state', () => {
    render(<ClientsTable clients={[]} onInviteClick={mockOnInviteClick} isLoading={true} />);

    // Should show loading spinner (testing for element with animate-spin class)
    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('should render empty state and invite button when no clients', () => {
    render(<ClientsTable clients={[]} onInviteClick={mockOnInviteClick} isLoading={false} />);

    // Should show empty state message
    expect(screen.getByText('No clients yet')).toBeInTheDocument();
    expect(
      screen.getByText("You don't have any clients yet. Start by inviting someone to join.")
    ).toBeInTheDocument();

    // Should show invite button
    const inviteButton = screen.getByText('Invite Client');
    expect(inviteButton).toBeInTheDocument();

    // Test click handler
    inviteButton.click();
    expect(mockOnInviteClick).toHaveBeenCalledTimes(1);
  });

  it('should render client list when clients exist', () => {
    const mockClients: Client[] = [
      {
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastSessionDate: '2023-05-15T14:30:00.000Z',
      },
      {
        _id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        createdAt: '2023-02-01T00:00:00.000Z',
        lastSessionDate: null,
      },
    ];

    render(
      <ClientsTable clients={mockClients} onInviteClick={mockOnInviteClick} isLoading={false} />
    );

    // Should show table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Last Session')).toBeInTheDocument();

    // Should show client names
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();

    // Should show client emails
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();

    // Should show "No sessions yet" for client without sessions
    expect(screen.getByText('No sessions yet')).toBeInTheDocument();

    // Should show 2 "View Details" buttons
    const viewDetailsButtons = screen.getAllByText('View Details');
    expect(viewDetailsButtons).toHaveLength(2);
  });
});
