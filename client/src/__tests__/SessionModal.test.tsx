import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SessionModal from '../components/SessionModal';
import { Client } from '../components/ClientsTable';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'sessions.createSession': 'Create Session',
        'sessions.selectClient': 'Select Client',
        'sessions.chooseClient': 'Choose a client',
        'sessions.sessionDate': 'Session Date',
        'sessions.notes': 'Notes',
        'sessions.notesPlaceholder': 'Enter any notes about this session...',
        'sessions.create': 'Create',
        'common.cancel': 'Cancel',
        'validation.required': 'This field is required',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    // Simple mock for yyyy-MM-dd format
    return '2023-07-15';
  },
}));

// Mock @headlessui/react Dialog component
vi.mock('@headlessui/react', () => ({
  Dialog: {
    Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-panel">{children}</div>,
    Title: ({ children }: { children: React.ReactNode }) => <h3 data-testid="dialog-title">{children}</h3>,
    Description: ({ children }: { children: React.ReactNode }) => <p data-testid="dialog-description">{children}</p>,
  },
}));

// Mock radix icons
vi.mock('@radix-ui/react-icons', () => ({
  Cross2Icon: () => <div data-testid="cross-icon">✕</div>,
}));

describe('SessionModal', () => {
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
  
  const mockOnClose = vi.fn();
  const mockOnCreateSession = vi.fn();
  
  beforeEach(() => {
    mockOnClose.mockReset();
    mockOnCreateSession.mockReset();
  });
  
  it('should render the modal when open', () => {
    const { getByTestId, getByText } = render(
      <SessionModal
        isOpen={true}
        onClose={mockOnClose}
        onCreateSession={mockOnCreateSession}
        isLoading={false}
        clients={mockClients}
      />
    );
    
    expect(getByTestId('dialog-panel')).toBeDefined();
    expect(getByTestId('dialog-title')).toBeDefined();
    expect(getByText('Create Session')).toBeDefined();
  });
  
  it('should show client dropdown with options', () => {
    const { getByLabelText } = render(
      <SessionModal
        isOpen={true}
        onClose={mockOnClose}
        onCreateSession={mockOnCreateSession}
        isLoading={false}
        clients={mockClients}
      />
    );
    
    const clientSelect = getByLabelText('Select Client') as HTMLSelectElement;
    expect(clientSelect).toBeDefined();
    
    // Options should include the placeholder and 2 clients
    expect(clientSelect.options.length).toBe(3);
    
    // First option should be placeholder
    expect(clientSelect.options[0].text).toBe('Choose a client');
    
    // Client options should have correct text
    expect(clientSelect.options[1].text).toBe('John Doe');
    expect(clientSelect.options[2].text).toBe('Jane Smith');
  });
  
  it('should call onCreateSession with form data when submitted', () => {
    const { getByLabelText, getByText } = render(
      <SessionModal
        isOpen={true}
        onClose={mockOnClose}
        onCreateSession={mockOnCreateSession}
        isLoading={false}
        clients={mockClients}
      />
    );
    
    // Fill out the form
    const clientSelect = getByLabelText('Select Client') as HTMLSelectElement;
    fireEvent.change(clientSelect, { target: { value: '1' } });
    
    const dateInput = getByLabelText('Session Date') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2023-07-15' } });
    
    const notesInput = getByLabelText('Notes') as HTMLTextAreaElement;
    fireEvent.change(notesInput, { target: { value: 'Test session notes' } });
    
    // Submit the form
    const createButton = getByText('Create');
    fireEvent.click(createButton);
    
    // Check if onCreateSession was called with correct data
    expect(mockOnCreateSession).toHaveBeenCalledTimes(1);
    expect(mockOnCreateSession).toHaveBeenCalledWith({
      clientId: '1',
      date: '2023-07-15',
      notes: 'Test session notes',
    });
  });
  
  it('should show validation errors when form is submitted without required fields', () => {
    const { getByText, queryByText } = render(
      <SessionModal
        isOpen={true}
        onClose={mockOnClose}
        onCreateSession={mockOnCreateSession}
        isLoading={false}
        clients={mockClients}
      />
    );
    
    // Submit form without filling required fields
    const createButton = getByText('Create');
    fireEvent.click(createButton);
    
    // Check if validation error messages are shown
    expect(queryByText('This field is required')).toBeDefined();
    
    // onCreateSession should not be called
    expect(mockOnCreateSession).not.toHaveBeenCalled();
  });
  
  it('should call onClose when cancel button is clicked', () => {
    const { getByText } = render(
      <SessionModal
        isOpen={true}
        onClose={mockOnClose}
        onCreateSession={mockOnCreateSession}
        isLoading={false}
        clients={mockClients}
      />
    );
    
    const cancelButton = getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
  
  it('should disable buttons when loading', () => {
    const { getByText } = render(
      <SessionModal
        isOpen={true}
        onClose={mockOnClose}
        onCreateSession={mockOnCreateSession}
        isLoading={true}
        clients={mockClients}
      />
    );
    
    const createButton = getByText('Create').closest('button');
    const cancelButton = getByText('Cancel').closest('button');
    
    expect(createButton?.disabled).toBe(true);
    expect(cancelButton?.disabled).toBe(true);
  });
}); 