import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProgressTrackingDashboard } from '../ProgressTrackingDashboard';

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
  getProgressMetrics: vi.fn().mockResolvedValue({
    notesCreated: 45,
    avgWordsPerNote: 156,
    clientsDocumented: 8,
    sessionCoverage: 78,
    trends: {
      notesCreated: 'up',
      avgWordsPerNote: 'stable',
      clientsDocumented: 'up',
      sessionCoverage: 'down'
    }
  }),
  getClientProgress: vi.fn().mockResolvedValue([
    {
      clientId: 'client-1',
      clientName: 'John Doe',
      engagementScore: 85,
      recentActivity: '2025-01-15T10:00:00Z',
      notesCount: 12,
      trend: 'up'
    },
    {
      clientId: 'client-2', 
      clientName: 'Jane Smith',
      engagementScore: 92,
      recentActivity: '2025-01-14T15:30:00Z',
      notesCount: 18,
      trend: 'stable'
    }
  ])
}));

vi.mock('../../../services/advancedSearchService', () => ({
  exportData: vi.fn().mockResolvedValue({ success: true }),
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
    content: 'Client made good progress today',
    coachId: 'test-coach-id',
    clientId: 'client-1',
    sessionId: 'session-1',
    createdAt: '2025-01-15T10:00:00Z',
    tags: ['progress'],
    isPrivate: true
  },
  {
    id: '2',
    title: 'Follow-up Notes',
    content: 'Need to follow up on action items',
    coachId: 'test-coach-id',
    clientId: 'client-2',
    sessionId: 'session-2',
    createdAt: '2025-01-14T15:30:00Z',
    tags: ['follow-up'],
    isPrivate: true
  }
];

describe('ProgressTrackingDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render progress tracking title', async () => {
    render(<ProgressTrackingDashboard notes={mockNotes} />, { wrapper: createWrapper() });

    // Check that the main title is rendered
    expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
    expect(screen.getByText('Monitor your coaching documentation progress and client engagement')).toBeInTheDocument();
  });

  it('should display progress metrics cards', async () => {
    render(<ProgressTrackingDashboard notes={mockNotes} />, { wrapper: createWrapper() });

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
    });

    // Check for progress metrics structure
    const cards = screen.getAllByRole('article');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should display client progress section', async () => {
    render(<ProgressTrackingDashboard notes={mockNotes} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Client Progress Overview')).toBeInTheDocument();
    });
  });

  it('should handle export functionality', async () => {
    const mockOnExportProgress = vi.fn();
    render(
      <ProgressTrackingDashboard 
        notes={mockNotes} 
        onExportProgress={mockOnExportProgress}
      />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
    });

    // Find and click export buttons
    const jsonButton = screen.getByText('JSON');
    const csvButton = screen.getByText('CSV');
    
    expect(jsonButton).toBeInTheDocument();
    expect(csvButton).toBeInTheDocument();

    fireEvent.click(jsonButton);
    
    // Wait for the export function to be called
    await waitFor(() => {
      expect(mockOnExportProgress).toHaveBeenCalledWith('json');
    });
  });

  it('should handle period selection', async () => {
    render(<ProgressTrackingDashboard notes={mockNotes} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
    });

    // Find the period selector
    const periodSelect = screen.getByDisplayValue('Last Month');
    expect(periodSelect).toBeInTheDocument();

    // Change period
    fireEvent.change(periodSelect, { target: { value: 'week' } });
    expect(periodSelect).toHaveValue('week');
  });

  it('should be accessible with proper structure', async () => {
    render(<ProgressTrackingDashboard notes={mockNotes} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
    });

    // Check for proper heading structure
    const mainHeading = screen.getByRole('heading', { level: 2 });
    expect(mainHeading).toHaveTextContent('Progress Tracking');
  });

  it('should handle empty notes array', () => {
    render(<ProgressTrackingDashboard notes={[]} />, { wrapper: createWrapper() });

    // Should still render the main structure
    expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    render(<ProgressTrackingDashboard notes={mockNotes} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
    });

    // Test tab navigation on export buttons
    const jsonButton = screen.getByText('JSON');
    jsonButton.focus();
    expect(jsonButton).toHaveFocus();
  });
}); 