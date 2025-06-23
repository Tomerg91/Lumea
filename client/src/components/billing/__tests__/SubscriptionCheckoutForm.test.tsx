import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SubscriptionCheckoutForm from '../SubscriptionCheckoutForm';

describe('SubscriptionCheckoutForm', () => {
  const mockSubmit = vi.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it('renders all form fields and a submit button', () => {
    render(<SubscriptionCheckoutForm planName="Seeker" planPrice={59} onSubmit={mockSubmit} loading={false} />);
    
    expect(screen.getByLabelText(/Payment Provider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Card Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Card Holder Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Israeli ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expiry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CVV/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay ₪59/i })).toBeInTheDocument();
  });

  it('shows validation errors for invalid inputs', async () => {
    render(<SubscriptionCheckoutForm planName="Seeker" planPrice={59} onSubmit={mockSubmit} loading={false} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Pay ₪59/i }));

    // Using waitFor to allow for async validation to complete
    await waitFor(() => {
      expect(screen.getByText(/Invalid Israeli ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Card number must be 16 digits/i)).toBeInTheDocument();
      // Add other validation messages as needed
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('successfully submits with valid data', async () => {
    render(<SubscriptionCheckoutForm planName="Seeker" planPrice={59} onSubmit={mockSubmit} loading={false} />);
    
    // Simulate user input
    fireEvent.change(screen.getByLabelText(/Card Number/i), { target: { value: '1234123412341234' } });
    fireEvent.change(screen.getByLabelText(/Expiry/i), { target: { value: '12/25' } });
    fireEvent.change(screen.getByLabelText(/CVV/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/Card Holder Name/i), { target: { value: 'Yisrael Yisraeli' } });
    fireEvent.change(screen.getByLabelText(/Israeli ID/i), { target: { value: '123456789' } });
    // Note: Provider selection is harder to test without a proper Select component setup
    // We assume a default value or that the first option is selected.

    fireEvent.click(screen.getByRole('button', { name: /Pay ₪59/i }));

    await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
            cardNumber: '1234123412341234',
            holderName: 'Yisrael Yisraeli',
            holderId: '123456789',
        }));
    });
  });

  it('disables the submit button when loading', () => {
    render(<SubscriptionCheckoutForm planName="Seeker" planPrice={59} onSubmit={mockSubmit} loading={true} />);
    
    const submitButton = screen.getByRole('button', { name: /Processing.../i });
    expect(submitButton).toBeDisabled();
  });
}); 