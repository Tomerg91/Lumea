import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SubscriptionPlanSelector from '../SubscriptionPlanSelector';

describe('SubscriptionPlanSelector', () => {
  it('renders all three subscription plans', () => {
    render(<SubscriptionPlanSelector onSelectPlan={() => {}} />);

    expect(screen.getByText('Seeker Coach')).toBeInTheDocument();
    expect(screen.getByText('Explorer Coach')).toBeInTheDocument();
    expect(screen.getByText('Navigator Coach')).toBeInTheDocument();
  });

  it('calls onSelectPlan with the correct plan id when a plan is selected', () => {
    const handleSelectPlan = vi.fn();
    render(<SubscriptionPlanSelector onSelectPlan={handleSelectPlan} />);

    fireEvent.click(screen.getByRole('button', { name: /Select Seeker/i }));
    expect(handleSelectPlan).toHaveBeenCalledWith('seeker');

    fireEvent.click(screen.getByRole('button', { name: /Select Explorer/i }));
    expect(handleSelectPlan).toHaveBeenCalledWith('explorer');

    fireEvent.click(screen.getByRole('button', { name: /Select Navigator/i }));
    expect(handleSelectPlan).toHaveBeenCalledWith('navigator');
  });

  it('highlights the selected plan', () => {
    const { rerender } = render(<SubscriptionPlanSelector onSelectPlan={() => {}} selectedPlan={null} />);
    
    const seekerButton = screen.getByRole('button', { name: /Select Seeker/i });
    expect(seekerButton).not.toHaveClass('ring-2');

    rerender(<SubscriptionPlanSelector onSelectPlan={() => {}} selectedPlan={'seeker'} />);
    expect(seekerButton).toHaveClass('ring-2');
  });
}); 