import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Eye, 
  Download, 
  Trash2, 
  Mail, 
  Phone,
  Calendar,
  CheckCircle,
  AlertCircle,
  Globe,
  Lock
} from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  const [acceptedSections, setAcceptedSections] = useState<Set<string>>(new Set());
  const [showDataRequest, setShowDataRequest] = useState(false);

  const lastUpdated = "January 2025";

  const handleAcceptSection = (sectionId: string) => {
    setAcceptedSections(prev => new Set([...prev, sectionId]));
  };

  const privacySections = [
    {
      id: 'data-collection',
      title: 'Information We Collect',
      icon: Eye,
      content: `
        We collect information you provide directly to us, such as:
        
        **Personal Information:**
        • Name, email address, phone number
        • Professional credentials and certifications
        • Payment information (processed securely through Israeli payment providers)
        • Israeli ID number (for billing and tax compliance)
        
        **Coaching Data:**
        • Session notes and recordings (with explicit consent)
        • Reflection entries and progress tracking
        • Goals and coaching objectives
        • Communication preferences
        
        **Technical Information:**
        • Device information and browser type
        • IP address and location data
        • Usage patterns and feature interactions
        • Performance and error logs
        
        **Legal Basis (GDPR Article 6):**
        • Contract performance (providing coaching services)
        • Legitimate interests (improving our services)
        • Consent (for marketing communications)
        • Legal obligation (tax and regulatory compliance)
      `
    },
    {
      id: 'data-use',
      title: 'How We Use Your Information',
      icon: Shield,
      content: `
        We use your information to:
        
        **Service Delivery:**
        • Provide coaching platform functionality
        • Facilitate coach-client communication
        • Process payments and billing
        • Send service-related notifications
        
        **Platform Improvement:**
        • Analyze usage patterns to enhance features
        • Troubleshoot technical issues
        • Develop new coaching tools and resources
        
        **Legal Compliance:**
        • Meet Israeli tax and regulatory requirements
        • Comply with GDPR and data protection laws
        • Respond to legal requests when required
        
        **Marketing (with consent only):**
        • Send newsletters and product updates
        • Provide relevant coaching resources
        • Invite participation in surveys or research
        
        We will never sell your personal information to third parties.
      `
    },
    {
      id: 'data-sharing',
      title: 'Information Sharing',
      icon: Globe,
      content: `
        We may share your information in limited circumstances:
        
        **Within the Platform:**
        • Between assigned coaches and clients (as necessary for coaching)
        • With platform administrators (for support purposes only)
        
        **Service Providers:**
        • Israeli payment processors (Tranzila, Cardcom, etc.)
        • Cloud hosting providers (with GDPR compliance)
        • Email service providers (for transactional emails)
        • Analytics providers (with data anonymization)
        
        **Legal Requirements:**
        • To comply with Israeli law and regulations
        • In response to valid legal process
        • To protect rights, property, or safety
        
        **Business Transfers:**
        • In case of merger, acquisition, or sale of assets
        • Users will be notified of any ownership changes
        
        All third-party providers are contractually bound to protect your data
        and use it only for specified purposes.
      `
    },
    {
      id: 'data-security',
      title: 'Data Security',
      icon: Lock,
      content: `
        We implement comprehensive security measures:
        
        **Technical Safeguards:**
        • End-to-end encryption for sensitive data
        • Secure HTTPS connections for all communications
        • Regular security audits and penetration testing
        • Multi-factor authentication for admin access
        
        **Access Controls:**
        • Role-based access permissions
        • Regular access reviews and updates
        • Employee background checks and training
        • Confidentiality agreements for all staff
        
        **Data Protection:**
        • Regular automated backups
        • Secure data centers with physical security
        • Incident response and breach notification procedures
        • Data retention policies and secure deletion
        
        **Israeli Banking Standards:**
        • Payment data processed through PCI DSS certified providers
        • Compliance with Bank of Israel regulations
        • Local data residency options available
        
        While we implement strong security measures, no system is 100% secure.
        We encourage users to use strong passwords and report any security concerns.
      `
    },
    {
      id: 'user-rights',
      title: 'Your Rights',
      icon: CheckCircle,
      content: `
        Under GDPR and Israeli privacy law, you have the right to:
        
        **Access Rights:**
        • Request a copy of all personal data we hold about you
        • Receive data in a structured, machine-readable format
        • Understand how your data is being processed
        
        **Correction Rights:**
        • Update or correct inaccurate personal information
        • Complete incomplete data records
        • Request verification of data accuracy
        
        **Deletion Rights ("Right to be Forgotten"):**
        • Request deletion of your personal data
        • Exceptions: legal obligations, legitimate interests
        • Automatic deletion after account closure (subject to retention requirements)
        
        **Control Rights:**
        • Withdraw consent for marketing communications
        • Object to processing based on legitimate interests
        • Request restriction of processing in certain circumstances
        
        **Portability Rights:**
        • Export your data to another service provider
        • Receive data in common formats (JSON, CSV)
        • Transfer coaching records to new platforms
        
        To exercise these rights, contact us at privacy@satyacoaching.com
        or use the data management tools in your account settings.
      `
    },
    {
      id: 'retention',
      title: 'Data Retention',
      icon: Calendar,
      content: `
        We retain your information for different periods based on data type:
        
        **Account Information:**
        • Active accounts: Retained while account is active
        • Closed accounts: 30 days for recovery, then deleted
        • Legal hold: Extended retention if required by law
        
        **Coaching Data:**
        • Session notes: 7 years (professional standards requirement)
        • Reflections: Retained while account is active, then 1 year
        • Progress tracking: 3 years after last session
        
        **Communication Records:**
        • Platform messages: 2 years after last activity
        • Email communications: 1 year
        • Support tickets: 3 years for quality improvement
        
        **Financial Records:**
        • Payment information: As required by Israeli tax law (7 years)
        • Billing history: 7 years for accounting purposes
        • Refund records: 3 years
        
        **Technical Data:**
        • Usage logs: 12 months
        • Error logs: 6 months
        • Analytics data: Anonymized after 24 months
        
        Data is securely deleted at the end of retention periods using
        industry-standard data destruction methods.
      `
    },
    {
      id: 'international',
      title: 'International Transfers',
      icon: Globe,
      content: `
        As an Israeli-based service, we primarily process data within Israel:
        
        **Data Location:**
        • Primary servers located in Israel
        • EU data centers for European users (GDPR compliance)
        • US cloud services with Privacy Shield/Standard Contractual Clauses
        
        **Transfer Safeguards:**
        • Adequacy decisions where available
        • Standard Contractual Clauses (SCCs) for EU transfers
        • Binding Corporate Rules for internal transfers
        • User consent for specific transfer scenarios
        
        **Israeli Privacy Protection:**
        • Compliance with Israeli Privacy Protection Law
        • Registration with Israeli Privacy Protection Authority
        • Local data residency options available
        
        **GDPR Compliance:**
        • EU representative appointed
        • Data Protection Impact Assessments conducted
        • Privacy by Design implementation
        
        Users can request data localization to specific regions
        based on their privacy preferences and local requirements.
      `
    },
    {
      id: 'cookies',
      title: 'Cookies and Tracking',
      icon: Eye,
      content: `
        We use cookies and similar technologies:
        
        **Essential Cookies:**
        • Authentication and security
        • Session management
        • Platform functionality
        • Cannot be disabled
        
        **Performance Cookies:**
        • Usage analytics and optimization
        • Error tracking and debugging
        • A/B testing for feature improvements
        • Can be disabled in settings
        
        **Functional Cookies:**
        • User preferences and settings
        • Language and timezone selection
        • Accessibility accommodations
        • Can be managed in settings
        
        **Marketing Cookies (with consent):**
        • Personalized content recommendations
        • Email campaign effectiveness
        • Social media integration
        • Can be opted out anytime
        
        **Cookie Management:**
        • Granular consent options available
        • Browser settings respected
        • Consent withdrawal mechanisms
        • Regular consent refresh (12 months)
        
        We do not use third-party advertising cookies or sell data to advertisers.
      `
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-600">
          Last updated: {lastUpdated} • Effective for all users
        </p>
        <p className="text-sm text-gray-500 mt-2">
          GDPR Compliant • Israeli Privacy Law Compliant
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Your Privacy Matters:</strong> This policy explains how SatyaCoaching collects, uses, 
          and protects your personal information. We are committed to transparency and giving you control 
          over your data.
        </AlertDescription>
      </Alert>

      {/* Privacy Sections */}
      <div className="space-y-4">
        {privacySections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <section.icon className="h-5 w-5 text-blue-600" />
                {section.title}
                {acceptedSections.has(section.id) && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {section.content.split('\n').map((paragraph, index) => {
                  if (paragraph.trim() === '') return null;
                  
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    return (
                      <h4 key={index} className="font-semibold text-gray-900 mt-4 mb-2">
                        {paragraph.slice(2, -2)}
                      </h4>
                    );
                  }
                  
                  if (paragraph.startsWith('•')) {
                    return (
                      <li key={index} className="ml-4 text-gray-700">
                        {paragraph.slice(1).trim()}
                      </li>
                    );
                  }
                  
                  return (
                    <p key={index} className="text-gray-700 mb-2">
                      {paragraph.trim()}
                    </p>
                  );
                })}
              </div>
              
              {!acceptedSections.has(section.id) && (
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={() => handleAcceptSection(section.id)}
                    variant="outline"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    I understand this section
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Management Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Management Tools
          </CardTitle>
          <CardDescription>
            Exercise your privacy rights and manage your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => setShowDataRequest(true)}
            >
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="font-medium">Download My Data</span>
              </div>
              <span className="text-sm text-gray-600 text-left">
                Get a copy of all your personal data in machine-readable format
              </span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <span className="font-medium">Delete My Account</span>
              </div>
              <span className="text-sm text-gray-600 text-left">
                Permanently delete your account and associated data
              </span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="font-medium">Privacy Settings</span>
              </div>
              <span className="text-sm text-gray-600 text-left">
                Manage your privacy preferences and consent settings
              </span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="font-medium">Contact Privacy Team</span>
              </div>
              <span className="text-sm text-gray-600 text-left">
                Get help with privacy questions or data requests
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            Get in touch with questions about this privacy policy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Data Protection Officer</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>privacy@satyacoaching.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>+972-3-XXX-XXXX</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Israeli Privacy Authority</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>www.gov.il/privacy</span>
                </div>
                <p>You have the right to file a complaint with the Israeli Privacy Protection Authority</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policy Updates */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Policy Updates:</strong> We may update this privacy policy from time to time. 
          We will notify you of any material changes via email or platform notification. 
          Continued use of the service after changes constitutes acceptance of the updated policy.
        </AlertDescription>
      </Alert>

      {/* Data Request Modal */}
      {showDataRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Data Export Request</CardTitle>
              <CardDescription>
                We'll prepare your data export and send it to your registered email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  Your data export will include all personal information, coaching records, 
                  and communication history. This process may take up to 30 days as required by GDPR.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowDataRequest(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    // TODO: Implement data export request
                    setShowDataRequest(false);
                  }}
                >
                  Request Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PrivacyPolicy; 