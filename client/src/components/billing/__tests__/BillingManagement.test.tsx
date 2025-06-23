import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import BillingManagement from '../BillingManagement';
import { api } from '@/lib/api'; // We will mock this

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe('BillingManagement', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows plan selector when no subscription exists', async () => {
    (mockedApi.get as Mock).mockResolvedValue({ data: { hasSubscription: false } });
    render(<BillingManagement />);

    await waitFor(() => {
      expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
      expect(screen.getByText('Seeker Coach')).toBeInTheDocument();
    });
  });

  it('shows active subscription details when a subscription exists', async () => {
    const mockSubscription = {
      hasSubscription: true,
      subscription: {
        id: 'sub-123',
        planCode: 'explorer',
        status: 'active',
        amount: 18900,
        currency: 'ILS',
        currentPeriodEnd: '2025-02-15T00:00:00.000Z',
        clientLimit: 30,
      }
    };
    (mockedApi.get as Mock).mockResolvedValue({ data: mockSubscription });
    render(<BillingManagement />);

    await waitFor(() => {
      expect(screen.getByText('Explorer Coach Plan')).toBeInTheDocument();
      expect(screen.getByText(/Active/i)).toBeInTheDocument();
      expect(screen.getByText(/₪189.00/i)).toBeInTheDocument();
    });
  });

  it('handles the full subscription creation flow', async () => {
    // 1. Start with no subscription
    (mockedApi.get as Mock).mockResolvedValueOnce({ data: { hasSubscription: false } });
    render(<BillingManagement />);

    // 2. Wait for plan selector and choose a plan
    await waitFor(() => expect(screen.getByText('Choose Your Plan')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Select Seeker/i }));

    // 3. Wait for checkout form and fill it out
    await waitFor(() => expect(screen.getByText('Complete Your Seeker Coach Subscription')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Card Number/i), { target: { value: '1234123412341234' } });
    fireEvent.change(screen.getByLabelText(/Israeli ID/i), { target: { value: '123456789' } });
    // ... fill other fields as necessary

    // 4. Mock the create subscription call
    const newSubscription = {
        id: 'sub-new',
        planCode: 'seeker',
        status: 'active',
        // ... other details
    };
    (mockedApi.post as Mock).mockResolvedValueOnce({ data: { success: true, subscription: newSubscription } });

    // 5. Mock the refetch of the current subscription
    (mockedApi.get as Mock).mockResolvedValueOnce({ data: { hasSubscription: true, subscription: newSubscription } });

    // 6. Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Pay ₪59/i }));

    // 7. Wait for the new subscription details to be displayed
    await waitFor(() => {
        expect(screen.getByText('Seeker Coach Plan')).toBeInTheDocument();
        expect(screen.getByText(/Active/i)).toBeInTheDocument();
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/subscriptions/create', expect.any(Object));
    expect(mockedApi.get).toHaveBeenCalledWith('/subscriptions/current');
    expect(mockedApi.get).toHaveBeenCalledTimes(2); // Initial load + refetch
  });
}); 