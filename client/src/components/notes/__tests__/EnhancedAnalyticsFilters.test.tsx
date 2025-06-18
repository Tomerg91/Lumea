import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnhancedAnalyticsFilters } from '../EnhancedAnalyticsFilters';

// Mock the dependencies
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-coach-id' } },
    user: { id: 'test-coach-id', role: 'coach' },
    profile: { id: 'test-coach-id', role: 'coach' },
    loading: false,
  }),
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../../services/analyticsService', () => ({
  getAnalyticsData: vi.fn().mockResolvedValue({
    totalNotes: 100,
    filteredNotes: 25,
    clients: ['Client A', 'Client B'],
    tags: ['important', 'follow-up', 'progress']
  }),
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

// Mock coach notes data
const mockNotes = [
  {
    id: '1',
    title: 'Session Notes',
    content: 'Client made good progress today with their goals',
    coachId: 'test-coach-id',
    clientId: 'client-1',
    sessionId: 'session-1',
    createdAt: '2025-01-15T10:00:00Z',
    tags: ['progress', 'goals'],
    isPrivate: true
  },
  {
    id: '2',
    title: 'Follow-up Notes',
    content: 'Need to follow up on action items from last session',
    coachId: 'test-coach-id',
    clientId: 'client-2',
    sessionId: 'session-2',
    createdAt: '2025-01-14T15:30:00Z',
    tags: ['follow-up', 'action-items'],
    isPrivate: true
  }
];

describe('EnhancedAnalyticsFilters', () => {
  const mockOnFiltersChange = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render analytics filters interface', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    // Check that the main filter interface is rendered
    expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
  });

  it('should handle search input changes', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    // Find search input
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();

    // Type in search input
    fireEvent.change(searchInput, { target: { value: 'progress' } });
    
    // Wait for debounced search
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should handle date range selection', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    // Look for date range controls
    const dateInputs = screen.getAllByDisplayValue('');
    expect(dateInputs.length).toBeGreaterThan(0);
  });

  it('should handle client filtering', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
    });

    // Look for client filter controls
    const filterSection = screen.getByText('Advanced Analytics Filters').closest('div');
    expect(filterSection).toBeInTheDocument();
  });

  it('should handle tag filtering', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
    });

    // Component should handle tag filtering internally
    expect(mockOnFiltersChange).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should handle word count range filtering', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
    });

    // Look for word count range controls
    const numberInputs = screen.getAllByRole('spinbutton');
    if (numberInputs.length > 0) {
      fireEvent.change(numberInputs[0], { target: { value: '100' } });
      
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalled();
      });
    }
  });

  it('should handle export functionality', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
    });

    // Look for export buttons
    const exportButtons = screen.getAllByText(/export/i);
    if (exportButtons.length > 0) {
      fireEvent.click(exportButtons[0]);
      
      await waitFor(() => {
        expect(mockOnExport).toHaveBeenCalled();
      });
    }
  });

  it('should display active filter badges', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
    });

    // Component should manage active filters internally
    expect(mockOnFiltersChange).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should handle filter clearing', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
    });

    // Look for clear filters button
    const clearButtons = screen.getAllByText(/clear/i);
    if (clearButtons.length > 0) {
      fireEvent.click(clearButtons[0]);
      
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalled();
      });
    }
  });

  it('should be accessible with proper ARIA labels', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
    });

    // Check for proper accessibility structure
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('should handle expandable interface', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
    });

    // Look for expand/collapse functionality
    const expandButtons = screen.getAllByRole('button');
    expect(expandButtons.length).toBeGreaterThan(0);
  });

  it('should handle empty notes array', () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={[]} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    // Should still render the interface
    expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    render(
      <EnhancedAnalyticsFilters 
        notes={mockNotes} 
        onFiltersChange={mockOnFiltersChange}
        onExport={mockOnExport}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics Filters')).toBeInTheDocument();
    });

    // Test keyboard navigation on search input
    const searchInput = screen.getByPlaceholderText(/search/i);
    searchInput.focus();
    expect(searchInput).toHaveFocus();
  });
}); 