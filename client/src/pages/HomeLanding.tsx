import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Shield, 
  Users, 
  FileText, 
  Mic, 
  CreditCard, 
  Download, 
  ArrowRight,
  Check,
  Star,
  Globe,
  Lock
} from 'lucide-react';

const HomeLanding: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const features = [
    {
      icon: <FileText className="h-8 w-8 text-lumea-primary" />,
      titleKey: 'home.features.secure_notes.title',
      descKey: 'home.features.secure_notes.desc'
    },
    {
      icon: <Mic className="h-8 w-8 text-lumea-primary" />,
      titleKey: 'home.features.audio_reflections.title', 
      descKey: 'home.features.audio_reflections.desc'
    },
    {
      icon: <CreditCard className="h-8 w-8 text-lumea-primary" />,
      titleKey: 'home.features.payment_automation.title',
      descKey: 'home.features.payment_automation.desc'
    },
    {
      icon: <Users className="h-8 w-8 text-lumea-primary" />,
      titleKey: 'home.features.client_onboarding.title',
      descKey: 'home.features.client_onboarding.desc'
    },
    {
      icon: <Download className="h-8 w-8 text-lumea-primary" />,
      titleKey: 'home.features.data_export.title',
      descKey: 'home.features.data_export.desc'
    },
    {
      icon: <Globe className="h-8 w-8 text-lumea-primary" />,
      titleKey: 'home.features.hebrew_first.title',
      descKey: 'home.features.hebrew_first.desc'
    }
  ];

  const steps = [
    {
      step: '1',
      titleKey: 'home.how_it_works.step1.title',
      descKey: 'home.how_it_works.step1.desc'
    },
    {
      step: '2', 
      titleKey: 'home.how_it_works.step2.title',
      descKey: 'home.how_it_works.step2.desc'
    },
    {
      step: '3',
      titleKey: 'home.how_it_works.step3.title', 
      descKey: 'home.how_it_works.step3.desc'
    }
  ];

  const plans = [
    {
      name: 'home.pricing.starter.name',
      price: '59',
      features: [
        'home.pricing.starter.feature1',
        'home.pricing.starter.feature2', 
        'home.pricing.starter.feature3',
        'home.pricing.starter.feature4'
      ],
      popular: false
    },
    {
      name: 'home.pricing.professional.name',
      price: '189',
      features: [
        'home.pricing.professional.feature1',
        'home.pricing.professional.feature2',
        'home.pricing.professional.feature3', 
        'home.pricing.professional.feature4',
        'home.pricing.professional.feature5'
      ],
      popular: true
    },
    {
      name: 'home.pricing.enterprise.name', 
      price: '220',
      features: [
        'home.pricing.enterprise.feature1',
        'home.pricing.enterprise.feature2',
        'home.pricing.enterprise.feature3',
        'home.pricing.enterprise.feature4',
        'home.pricing.enterprise.feature5',
        'home.pricing.enterprise.feature6'
      ],
      popular: false
    }
  ];

  const testimonials = [
    {
      nameKey: 'home.testimonials.coach1.name',
      textKey: 'home.testimonials.coach1.text',
      rating: 5
    },
    {
      nameKey: 'home.testimonials.coach2.name', 
      textKey: 'home.testimonials.coach2.text',
      rating: 5
    },
    {
      nameKey: 'home.testimonials.coach3.name',
      textKey: 'home.testimonials.coach3.text', 
      rating: 5
    }
  ];

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'he' ? 'en' : 'he');
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-lumea-bone to-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-lumea-primary/5 via-lumea-secondary/5 to-lumea-accent/5">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {t('home.hero.title')}
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t('home.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="bg-lumea-primary hover:bg-lumea-primary/90 text-white px-8 py-3 text-lg">
                {t('home.hero.cta_primary')}
                <ArrowRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
              <Button variant="outline" size="lg" className="border-lumea-primary text-lumea-primary hover:bg-lumea-primary/5 px-8 py-3 text-lg">
                {t('home.hero.cta_secondary')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="border-lumea-bone hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-lumea-primary/10 rounded-full w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900">
                    {t(feature.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 text-center">
                    {t(feature.descKey)}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 lg:py-24 bg-lumea-bone/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('home.how_it_works.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('home.how_it_works.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto mb-6 w-16 h-16 bg-lumea-primary text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {t(step.titleKey)}
                </h3>
                <p className="text-gray-600">
                  {t(step.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('home.pricing.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('home.pricing.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-lumea-primary shadow-lg scale-105' : 'border-gray-200'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-lumea-primary">
                    {t('home.pricing.popular')}
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {t(plan.name)}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-lumea-primary">₪{plan.price}</span>
                    <span className="text-gray-600">/{t('home.pricing.per_month')}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-lumea-primary mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{t(feature)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-lumea-primary hover:bg-lumea-primary/90' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
                  >
                    {t('home.pricing.get_started')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 lg:py-24 bg-lumea-bone/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('home.testimonials.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('home.testimonials.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-lumea-bone">
                <CardContent className="pt-6">
                  <div className="flex mb-4 justify-center">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-center mb-4 italic">
                    "{t(testimonial.textKey)}"
                  </p>
                  <p className="text-center font-semibold text-gray-900">
                    {t(testimonial.nameKey)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-lumea-primary/20 rounded-full">
                <Shield className="h-12 w-12 text-lumea-primary" />
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              {t('home.security.title')}
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              {t('home.security.description')}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="secondary" className="bg-lumea-primary/20 text-lumea-primary border-lumea-primary">
                <Lock className="h-4 w-4 mr-2" />
                {t('home.security.e2e_encryption')}
              </Badge>
              <Badge variant="secondary" className="bg-lumea-primary/20 text-lumea-primary border-lumea-primary">
                <Shield className="h-4 w-4 mr-2" />
                {t('home.security.gdpr_compliant')}
              </Badge>
              <Badge variant="secondary" className="bg-lumea-primary/20 text-lumea-primary border-lumea-primary">
                <Users className="h-4 w-4 mr-2" />
                {t('home.security.privacy_first')}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 text-lumea-primary">Lumea</h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              {t('home.footer.description')}
            </p>
            <div className="flex justify-center items-center gap-4 mb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Globe className="h-4 w-4 mr-2" />
                {i18n.language === 'he' ? 'English' : 'עברית'}
              </Button>
            </div>
            <div className="border-t border-gray-800 pt-8">
              <p className="text-gray-500 text-sm">
                {t('home.footer.copyright')}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomeLanding; 