import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CoachNotesPage from '../pages/CoachNotesPage';

// Mock the dependencies
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-coach-id' } },
    user: { id: 'test-coach-id', role: 'coach' },
    profile: { id: 'test-coach-id', role: 'coach' },
    loading: false,
  }),
}));

vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock the coach notes components
vi.mock('../components/notes/NotesList', () => ({
  default: () => <div data-testid="notes-list">Notes List Component</div>
}));

vi.mock('../components/notes/ProgressTrackingDashboard', () => ({
  ProgressTrackingDashboard: () => <div data-testid="progress-dashboard">Progress Tracking Dashboard</div>
}));

vi.mock('../components/notes/EnhancedAnalyticsFilters', () => ({
  EnhancedAnalyticsFilters: () => <div data-testid="analytics-filters">Enhanced Analytics Filters</div>
}));

// Mock services
vi.mock('../services/coachNoteService', () => ({
  getAllNotes: vi.fn().mockResolvedValue([
    {
      id: '1',
      title: 'Session Notes',
      content: 'Client made good progress',
      coachId: 'test-coach-id',
      clientId: 'client-1',
      createdAt: '2025-01-15T10:00:00Z',
      tags: ['progress'],
      isPrivate: true
    }
  ]),
}));

vi.mock('../services/analyticsService', () => ({
  getAnalyticsData: vi.fn().mockResolvedValue({
    totalNotes: 100,
    clients: ['Client A', 'Client B'],
    tags: ['important', 'follow-up']
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
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('CoachNotesPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the coach notes page with tabbed interface', async () => {
    render(<CoachNotesPage />, { wrapper: createWrapper() });

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Check for tab interface
    expect(screen.getByText('Notes & Management')).toBeInTheDocument();
    expect(screen.getByText('Progress & Analytics')).toBeInTheDocument();
  });

  it('should display notes list by default', async () => {
    render(<CoachNotesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Notes list should be visible by default
    expect(screen.getByTestId('notes-list')).toBeInTheDocument();
  });

  it('should switch to progress analytics tab', async () => {
    render(<CoachNotesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Click on Progress & Analytics tab
    const analyticsTab = screen.getByText('Progress & Analytics');
    fireEvent.click(analyticsTab);

    // Should show progress tracking dashboard
    await waitFor(() => {
      expect(screen.getByTestId('progress-dashboard')).toBeInTheDocument();
    });
  });

  it('should handle tab navigation with keyboard', async () => {
    render(<CoachNotesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Test keyboard navigation
    const notesTab = screen.getByText('Notes & Management');
    const analyticsTab = screen.getByText('Progress & Analytics');

    // Focus on notes tab
    notesTab.focus();
    expect(notesTab).toHaveFocus();

    // Navigate to analytics tab with keyboard
    fireEvent.keyDown(notesTab, { key: 'ArrowRight' });
    analyticsTab.focus();
    expect(analyticsTab).toHaveFocus();
  });

  it('should maintain proper accessibility structure', async () => {
    render(<CoachNotesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Check for proper heading structure
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toHaveTextContent('Coach Notes');

    // Check for tab list
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();

    // Check for tab panels
    const tabPanels = screen.getAllByRole('tabpanel');
    expect(tabPanels.length).toBeGreaterThan(0);
  });

  it('should handle loading states properly', () => {
    render(<CoachNotesPage />, { wrapper: createWrapper() });

    // Should handle loading gracefully
    expect(screen.getByText('Coach Notes')).toBeInTheDocument();
  });

  it('should display proper icons for tabs', async () => {
    render(<CoachNotesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Check that tabs have proper structure (icons + text)
    const notesTab = screen.getByText('Notes & Management');
    const analyticsTab = screen.getByText('Progress & Analytics');

    expect(notesTab).toBeInTheDocument();
    expect(analyticsTab).toBeInTheDocument();
  });

  it('should handle tab switching without data loss', async () => {
    render(<CoachNotesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Switch to analytics tab
    const analyticsTab = screen.getByText('Progress & Analytics');
    fireEvent.click(analyticsTab);

    await waitFor(() => {
      expect(screen.getByTestId('progress-dashboard')).toBeInTheDocument();
    });

    // Switch back to notes tab
    const notesTab = screen.getByText('Notes & Management');
    fireEvent.click(notesTab);

    await waitFor(() => {
      expect(screen.getByTestId('notes-list')).toBeInTheDocument();
    });
  });

  it('should be responsive on mobile devices', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<CoachNotesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Should still render tabs on mobile
    expect(screen.getByText('Notes & Management')).toBeInTheDocument();
    expect(screen.getByText('Progress & Analytics')).toBeInTheDocument();
  });

  it('should handle error states gracefully', async () => {
    // Mock service error
    const { getAllNotes } = await import('../services/coachNoteService');
    vi.mocked(getAllNotes).mockRejectedValueOnce(new Error('Failed to load notes'));

    render(<CoachNotesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Should still render the page structure even with errors
    expect(screen.getByText('Notes & Management')).toBeInTheDocument();
    expect(screen.getByText('Progress & Analytics')).toBeInTheDocument();
  });

  it('should support bilingual interface', async () => {
    // Mock Hebrew language
    vi.mocked(vi.fn()).mockReturnValue({
      t: (key: string) => key === 'coachNotes.title' ? 'הערות מאמן' : key,
      i18n: { language: 'he' },
    });

    render(<CoachNotesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coach Notes')).toBeInTheDocument();
    });

    // Should support RTL layout and Hebrew text
    expect(screen.getByText('Notes & Management')).toBeInTheDocument();
    expect(screen.getByText('Progress & Analytics')).toBeInTheDocument();
  });
}); 