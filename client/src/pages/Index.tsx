import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  Users, 
  Calendar, 
  TrendingUp, 
  Star, 
  Shield, 
  Heart, 
  MessageSquare, 
  BarChart3, 
  Lock,
  Globe,
  Zap,
  Award,
  Target,
  BookOpen
} from 'lucide-react';

const HomePage = () => {
  const { session, profile } = useAuth();
  const { isRTL, t } = useLanguage();
  const navigate = useNavigate();

  const navigateToLogin = () => {
    navigate('/auth');
  };

  const navigateToDashboard = () => {
    if (profile?.role === 'coach') {
      navigate('/coach/dashboard');
    } else if (profile?.role === 'client') {
      navigate('/client/dashboard');
    }
  };

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: t('home.features.coaches.title'),
      description: t('home.features.coaches.description'),
      color: 'from-teal-500 to-teal-600'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: t('home.features.scheduling.title'),
      description: t('home.features.scheduling.description'),
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: t('home.features.progress.title'),
      description: t('home.features.progress.description'),
      color: 'from-green-500 to-green-600'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Privacy & Security',
      description: 'HIPAA-compliant platform with enterprise-grade encryption',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Secure Communication',
      description: 'Encrypted messaging and reflection tools for safe conversations',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Progress Analytics',
      description: 'Detailed insights and tracking for your personal growth journey',
      color: 'from-pink-500 to-pink-600'
    }
  ];

  const testimonials = [
    {
      name: t('home.testimonials.1.name'),
      role: t('home.testimonials.1.role'),
      content: t('home.testimonials.1.content'),
      rating: 5,
      avatar: '👨‍💼'
    },
    {
      name: t('home.testimonials.2.name'),
      role: t('home.testimonials.2.role'),
      content: t('home.testimonials.2.content'),
      rating: 5,
      avatar: '👩‍🎓'
    },
    {
      name: t('home.testimonials.3.name'),
      role: t('home.testimonials.3.role'),
      content: t('home.testimonials.3.content'),
      rating: 5,
      avatar: '👨‍🔬'
    }
  ];

  const stats = [
    { 
      label: 'Active Coaches', 
      value: '150+',
      icon: <Users className="w-5 h-5" />
    },
    { 
      label: 'Sessions Completed', 
      value: '5,000+',
      icon: <Calendar className="w-5 h-5" />
    },
    { 
      label: 'Client Satisfaction', 
      value: '98%',
      icon: <Star className="w-5 h-5" />
    },
    { 
      label: 'Countries', 
      value: '25+',
      icon: <Globe className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-pattern-dots opacity-20"></div>
        
        {/* Clean Background Elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-teal-50 to-teal-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full blur-3xl opacity-30"></div>

        <div className="container-wide space-section relative">
          <div className={`grid lg:grid-cols-2 gap-16 items-center ${isRTL ? 'lg:grid-flow-col-dense' : ''}`}>
            {/* Content */}
            <div className={`${isRTL ? 'lg:order-2' : ''} animate-fade-in`}>
              <div className="mb-8">
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-teal-50 text-teal-700 text-sm font-medium border border-teal-100">
                  <Heart className="w-4 h-4 mr-2" />
                  Satya Method Coaching
                </span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-8 text-balance leading-tight">
                <span className="text-gradient">{t('home.hero.title')}</span>
                <br />
                <span className="text-gray-800">{t('home.hero.subtitle')}</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl">
                {t('home.hero.description')}
              </p>

              {!session ? (
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <button
                    onClick={navigateToLogin}
                    className="btn btn-primary group px-8 py-4 text-base"
                  >
                    <span>{t('home.hero.cta.primary')}</span>
                    <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rtl-flip' : ''}`} />
                  </button>
                  <button className="btn btn-secondary px-8 py-4 text-base">
                    {t('home.hero.cta.secondary')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 mb-12">
                  <div className="card p-6 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100">
                    <p className="text-lg text-gray-700 mb-4">
                      {t('home.hero.welcome')} <span className="font-semibold text-teal-700">{String(profile?.full_name || profile?.name || profile?.email || 'User')}</span>!
                    </p>
                    <button
                      onClick={navigateToDashboard}
                      className="btn btn-primary group px-6 py-3"
                    >
                      <span>{t('home.hero.continue')}</span>
                      <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rtl-flip' : ''}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Trust Indicators */}
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>HIPAA Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Enterprise Security</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4" />
                  <span>Certified Coaches</span>
                </div>
              </div>
            </div>

            {/* Hero Visual - Clean Dashboard Preview */}
            <div className={`relative ${isRTL ? 'lg:order-1' : ''} animate-slide-up`}>
              <div className="relative">
                {/* Main Dashboard Card */}
                <div className="card p-8 bg-white shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                          <Heart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">Active Session</h3>
                          <p className="text-sm text-gray-500">Personal Growth Journey</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-500">Live</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {[
                        { icon: <Target className="w-4 h-4" />, text: 'Goal Achievement Tracking' },
                        { icon: <BookOpen className="w-4 h-4" />, text: 'Reflection & Journaling' },
                        { icon: <BarChart3 className="w-4 h-4" />, text: 'Progress Analytics' },
                        { icon: <Users className="w-4 h-4" />, text: 'Coach Collaboration' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center space-x-3 text-sm">
                          <div className="text-teal-500 flex-shrink-0">
                            {item.icon}
                          </div>
                          <span className="text-gray-700">{item.text}</span>
                          <CheckCircle className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Session Progress</span>
                        <span className="font-medium text-gray-900">75%</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 card p-4 bg-white shadow-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-600">98%</div>
                    <div className="text-xs text-gray-500">Satisfaction</div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 card p-4 bg-white shadow-lg">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <div className="text-xs text-gray-500">
                      <div className="font-medium text-gray-900">2.5K</div>
                      <div>Active Users</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-white rounded-xl shadow-sm">
                  <div className="text-teal-600">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-section">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Everything you need for <span className="text-gradient">personal growth</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools and support you need for meaningful personal development
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-8 hover:shadow-lg transition-all duration-300 group">
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Trusted by <span className="text-gradient">thousands</span> worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what our community says about their transformation journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card p-8 bg-white">
                <div className="flex items-center mb-6">
                  <div className="text-3xl mr-4">{testimonial.avatar}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                  <div className="ml-auto flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed italic">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="container-wide text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Ready to start your <span className="text-gradient">transformation</span>?
            </h2>
            <p className="text-xl text-gray-600 mb-10">
              Join thousands of people who have already begun their personal growth journey with our expert coaches
            </p>
            
            {!session ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={navigateToLogin}
                  className="btn btn-primary group px-8 py-4 text-base"
                >
                  <span>Get Started Today</span>
                  <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rtl-flip' : ''}`} />
                </button>
                <button className="btn btn-secondary px-8 py-4 text-base">
                  Schedule a Demo
                </button>
              </div>
            ) : (
              <button
                onClick={navigateToDashboard}
                className="btn btn-primary group px-8 py-4 text-base"
              >
                <span>Continue Your Journey</span>
                <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rtl-flip' : ''}`} />
              </button>
            )}

            {/* Decorative Element */}
            <div className="mt-12 flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No setup fees</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>30-day guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container-wide">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold">Lumea</span>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-md">
                Empowering personal transformation through the proven Satya Method. 
                Your journey to growth starts here.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-6">Platform</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-6">Company</h3>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Lumea. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Shield className="w-4 h-4" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Lock className="w-4 h-4" />
                <span>HIPAA Certified</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

