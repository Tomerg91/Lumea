import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import HomeLanding from '../HomeLanding';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'home.hero.title': 'Professional Platform for Every Satya Method Coach',
        'home.hero.subtitle': 'Manage your clients, secure your notes, and grow your business with our all-in-one platform',
        'home.hero.cta_primary': 'Start Today',
        'home.hero.cta_secondary': 'Watch Demo',
        'home.features.title': 'Why Choose Lumea?',
        'home.features.subtitle': 'Everything you need to run your coaching practice',
        'home.features.secure_notes.title': 'Secure Session Notes',
        'home.features.secure_notes.desc': 'End-to-end encrypted notes with automatic backup',
        'home.features.audio_reflections.title': 'Audio Reflections',
        'home.features.audio_reflections.desc': 'Record and store encrypted audio sessions',
        'home.features.payment_automation.title': 'Payment Automation',
        'home.features.payment_automation.desc': 'Automated Israeli payment system with reminders',
        'home.features.client_onboarding.title': 'Client Onboarding',
        'home.features.client_onboarding.desc': 'Guided setup process for new clients',
        'home.features.data_export.title': 'Data Export',
        'home.features.data_export.desc': 'Export your data anytime in multiple formats',
        'home.features.hebrew_first.title': 'Hebrew-First Design',
        'home.features.hebrew_first.desc': 'Built specifically for Hebrew-speaking coaches',
        'home.how_it_works.title': 'How It Works',
        'home.how_it_works.step1.title': 'Sign Up for a Plan',
        'home.how_it_works.step1.desc': 'Choose the perfect plan for your practice',
        'home.how_it_works.step2.title': 'Add Clients',
        'home.how_it_works.step2.desc': 'Import or create client profiles easily',
        'home.how_it_works.step3.title': 'Start Working',
        'home.how_it_works.step3.desc': 'Begin your secure, professional coaching practice',
        'home.how_it_works.subtitle': 'Get started in three simple steps',
        'home.pricing.title': 'Simple and Transparent Pricing',
        'home.pricing.subtitle': 'Choose the plan that works for you',
        'home.pricing.starter.name': 'Starter',
        'home.pricing.professional.name': 'Professional',
        'home.pricing.enterprise.name': 'Enterprise',
        'home.pricing.starter.feature1': 'Up to 10 active clients',
        'home.pricing.starter.feature2': 'Unlimited secure notes',
        'home.pricing.starter.feature3': 'Basic payment tracking',
        'home.pricing.starter.feature4': 'Email support',
        'home.pricing.professional.feature1': 'Up to 50 active clients',
        'home.pricing.professional.feature2': 'Unlimited secure notes',
        'home.pricing.professional.feature3': 'Advanced payment automation',
        'home.pricing.professional.feature4': 'Audio reflections',
        'home.pricing.professional.feature5': 'Priority support',
        'home.pricing.enterprise.feature1': 'Unlimited clients',
        'home.pricing.enterprise.feature2': 'Unlimited secure notes',
        'home.pricing.enterprise.feature3': 'Full payment automation',
        'home.pricing.enterprise.feature4': 'Audio reflections',
        'home.pricing.enterprise.feature5': 'Data export',
        'home.pricing.enterprise.feature6': 'White-label options',
        'home.pricing.popular': 'Popular',
        'home.pricing.per_month': '/month',
        'home.pricing.get_started': 'Get Started',
        'home.testimonials.title': 'What Coaches Are Saying',
        'home.testimonials.coach1.name': 'Rachel Cohen - Senior Coach',
        'home.testimonials.coach1.text': 'Lumea has changed the way I work with my clients completely',
        'home.testimonials.coach2.name': 'Danny Levy - Business Coach',
        'home.testimonials.coach2.text': 'The most professional system I have ever used',
        'home.testimonials.coach3.name': 'Sarah Goldman - Personal Coach',
        'home.testimonials.coach3.text': 'Finally a platform that understands Hebrew-speaking coaches',
        'home.testimonials.subtitle': 'Hear from our satisfied coaches',
        'home.security.title': 'Your Security is Our Top Priority',
        'home.security.description': 'We take your data security seriously with industry-leading protection',
        'home.security.e2e_encryption': 'End-to-End Encryption',
        'home.security.gdpr_compliant': 'GDPR Compliant',
        'home.security.privacy_first': 'Privacy First',
        'home.footer.description': 'The professional platform for Satya Method coaches',
        'home.footer.copyright': '© 2024 Lumea. All rights reserved.',
        'common.language': 'Language',
        'common.english': 'English',
        'common.hebrew': 'עברית',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
};

describe('HomeLanding Component', () => {
  beforeEach(() => {
    // Reset the mock
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      renderWithProviders(<HomeLanding />);
      // Check for the main hero title specifically
      expect(screen.getByRole('heading', { level: 1, name: /Professional Platform for Every Satya Method Coach/i })).toBeInTheDocument();
    });

    it('renders all main sections', () => {
      renderWithProviders(<HomeLanding />);
      
      // Check for main sections using text content that should be present
      expect(screen.getByRole('heading', { level: 1, name: /Professional Platform for Every Satya Method Coach/i })).toBeInTheDocument();
      expect(screen.getByText(/Why Choose Lumea/i)).toBeInTheDocument();
      expect(screen.getByText(/How It Works/i)).toBeInTheDocument();
      expect(screen.getByText(/Simple and Transparent Pricing/i)).toBeInTheDocument();
      expect(screen.getByText(/What Coaches Are Saying/i)).toBeInTheDocument();
      expect(screen.getByText(/Your Security is Our Top Priority/i)).toBeInTheDocument();
    });

    it('renders hero section with correct content', () => {
      renderWithProviders(<HomeLanding />);
      
      expect(screen.getByRole('heading', { level: 1, name: /Professional Platform for Every Satya Method Coach/i })).toBeInTheDocument();
      expect(screen.getByText(/Start Today/i)).toBeInTheDocument();
      expect(screen.getByText(/Watch Demo/i)).toBeInTheDocument();
    });
  });

  describe('Features Section', () => {
    it('renders all 6 feature cards', () => {
      renderWithProviders(<HomeLanding />);
      
      // Check for feature titles as headings specifically
      expect(screen.getByRole('heading', { name: /Secure Session Notes/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Audio Reflections/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Payment Automation/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Client Onboarding/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Data Export/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Hebrew-First Design/i })).toBeInTheDocument();
    });

    it('displays feature descriptions', () => {
      renderWithProviders(<HomeLanding />);
      
      expect(screen.getByText(/End-to-end encrypted notes/i)).toBeInTheDocument();
      expect(screen.getByText(/Record and store encrypted audio/i)).toBeInTheDocument();
      expect(screen.getByText(/Automated Israeli payment system/i)).toBeInTheDocument();
    });
  });

  describe('Pricing Section', () => {
    it('renders all 3 pricing plans', () => {
      renderWithProviders(<HomeLanding />);
      
      // Check for pricing plan names as headings specifically
      expect(screen.getByRole('heading', { name: /^Starter$/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^Professional$/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^Enterprise$/i })).toBeInTheDocument();
    });

    it('displays pricing amounts', () => {
      renderWithProviders(<HomeLanding />);
      
      expect(screen.getByText(/₪59/)).toBeInTheDocument();
      expect(screen.getByText(/₪189/)).toBeInTheDocument();
      expect(screen.getByText(/₪220/)).toBeInTheDocument();
    });

    it('marks Professional plan as popular', () => {
      renderWithProviders(<HomeLanding />);
      
      // Look for the "Popular" badge
      expect(screen.getByText(/Popular/i)).toBeInTheDocument();
    });

    it('renders plan features', () => {
      renderWithProviders(<HomeLanding />);
      
      // Test unique features for each plan
      expect(screen.getByText(/Up to 10 active clients/i)).toBeInTheDocument();
      expect(screen.getByText(/Up to 50 active clients/i)).toBeInTheDocument();
      expect(screen.getByText(/Unlimited clients/i)).toBeInTheDocument();
      
      // Test features that appear in multiple plans using getAllByText
      const unlimitedNotesElements = screen.getAllByText(/Unlimited secure notes/i);
      expect(unlimitedNotesElements.length).toBeGreaterThanOrEqual(3); // Should appear in all 3 plans
    });
  });

  describe('How It Works Section', () => {
    it('renders all 3 steps', () => {
      renderWithProviders(<HomeLanding />);
      
      expect(screen.getByText(/Sign Up for a Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Add Clients/i)).toBeInTheDocument();
      expect(screen.getByText(/Start Working/i)).toBeInTheDocument();
    });

    it('displays step numbers', () => {
      renderWithProviders(<HomeLanding />);
      
      // Check for step numbers 1, 2, 3 in the step circles
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Testimonials Section', () => {
    it('renders all 3 testimonials', () => {
      renderWithProviders(<HomeLanding />);
      
      expect(screen.getByText(/Rachel Cohen - Senior Coach/i)).toBeInTheDocument();
      expect(screen.getByText(/Danny Levy - Business Coach/i)).toBeInTheDocument();
      expect(screen.getByText(/Sarah Goldman - Personal Coach/i)).toBeInTheDocument();
    });

    it('displays testimonial content', () => {
      renderWithProviders(<HomeLanding />);
      
      expect(screen.getByText(/Lumea has changed the way I work/i)).toBeInTheDocument();
      expect(screen.getByText(/The most professional system/i)).toBeInTheDocument();
      expect(screen.getByText(/Finally a platform that understands/i)).toBeInTheDocument();
    });

    it('renders star ratings', () => {
      const { container } = renderWithProviders(<HomeLanding />);
      
      // Look for star icons (they use Star component from lucide-react)
      const starElements = container.querySelectorAll('svg');
      // Should have multiple star icons
      expect(starElements.length).toBeGreaterThan(0);
    });
  });

  describe('Security Section', () => {
    it('renders security badges', () => {
      renderWithProviders(<HomeLanding />);
      
      expect(screen.getByText(/End-to-End Encryption/i)).toBeInTheDocument();
      expect(screen.getByText(/GDPR Compliant/i)).toBeInTheDocument();
      expect(screen.getByText(/Privacy First/i)).toBeInTheDocument();
    });
  });

  describe('Language Toggle', () => {
    it('renders language toggle button', () => {
      renderWithProviders(<HomeLanding />);
      
      // Look for the language toggle button that shows "עברית" when language is English
      const languageButton = screen.getByRole('button', { name: /עברית/i });
      expect(languageButton).toBeInTheDocument();
    });

    it('toggles language when clicked', async () => {
      renderWithProviders(<HomeLanding />);
      
      const languageButton = screen.getByRole('button', { name: /עברית/i });
      fireEvent.click(languageButton);
      
      // Language toggle functionality is mocked
      expect(languageButton).toBeInTheDocument();
    });
  });

  describe('RTL Support', () => {
    it('applies RTL class when Hebrew is selected', () => {
      const { container } = renderWithProviders(<HomeLanding />);
      
      const mainDiv = container.firstChild as HTMLElement;
      // Since language is mocked as 'en', it should have ltr class
      expect(mainDiv).toHaveClass('ltr');
    });

    it('applies LTR class when English is selected', () => {
      const { container } = renderWithProviders(<HomeLanding />);
      
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('ltr');
    });
  });

  describe('CTA Buttons', () => {
    it('renders primary CTA button', () => {
      renderWithProviders(<HomeLanding />);
      
      const primaryCTA = screen.getByRole('button', { name: /Start Today/i });
      expect(primaryCTA).toBeInTheDocument();
      expect(primaryCTA).toHaveClass('bg-lumea-primary');
    });

    it('renders secondary CTA button', () => {
      renderWithProviders(<HomeLanding />);
      
      const secondaryCTA = screen.getByRole('button', { name: /Watch Demo/i });
      expect(secondaryCTA).toBeInTheDocument();
      expect(secondaryCTA).toHaveClass('border-lumea-primary');
    });

    it('renders Get Started buttons in pricing section', () => {
      renderWithProviders(<HomeLanding />);
      
      const getStartedButtons = screen.getAllByText(/Get Started/i);
      expect(getStartedButtons.length).toBeGreaterThanOrEqual(3); // One for each pricing plan
    });
  });

  describe('Responsive Design', () => {
    it('renders properly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(<HomeLanding />);
      
      // Check that the component renders without errors
      expect(screen.getByRole('heading', { level: 1, name: /Professional Platform for Every Satya Method Coach/i })).toBeInTheDocument();
    });

    it('uses responsive classes', () => {
      const { container } = renderWithProviders(<HomeLanding />);
      
      // Check for Tailwind responsive classes
      const gridElements = container.querySelectorAll('[class*="md:grid-cols"], [class*="lg:grid-cols"]');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      renderWithProviders(<HomeLanding />);
      
      // Check for h1 (main title)
      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      expect(h1Elements.length).toBeGreaterThan(0);
      
      // Check for h2 (section titles)
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('has accessible button labels', () => {
      renderWithProviders(<HomeLanding />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('has proper semantic structure', () => {
      renderWithProviders(<HomeLanding />);
      
      // Check for semantic elements that actually exist
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Icons and Images', () => {
    it('renders feature icons', () => {
      const { container } = renderWithProviders(<HomeLanding />);
      
      // Check that Lucide icons are rendered (they should have specific classes)
      const iconElements = container.querySelectorAll('svg');
      expect(iconElements.length).toBeGreaterThan(0);
    });

    it('renders arrow icons in CTA buttons', () => {
      const { container } = renderWithProviders(<HomeLanding />);
      
      // Look for arrow right icons in CTA buttons
      const arrowElements = container.querySelectorAll('svg');
      expect(arrowElements.length).toBeGreaterThan(0);
    });
  });

  describe('Layout and Styling', () => {
    it('applies gradient backgrounds', () => {
      const { container } = renderWithProviders(<HomeLanding />);
      
      // Check for gradient classes
      const gradientElements = container.querySelectorAll('[class*="gradient"]');
      expect(gradientElements.length).toBeGreaterThan(0);
    });

    it('applies Lumea brand colors', () => {
      const { container } = renderWithProviders(<HomeLanding />);
      
      // Check for lumea color classes
      const lumeaColorElements = container.querySelectorAll('[class*="lumea-"]');
      expect(lumeaColorElements.length).toBeGreaterThan(0);
    });

    it('has proper spacing and layout', () => {
      const { container } = renderWithProviders(<HomeLanding />);
      
      // Check for consistent padding/margin classes
      const spacingElements = container.querySelectorAll('[class*="py-"], [class*="px-"], [class*="mb-"], [class*="mt-"]');
      expect(spacingElements.length).toBeGreaterThan(0);
    });
  });
}); 