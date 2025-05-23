import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: 'he' | 'en';
  isRTL: boolean;
  setLanguage: (lang: 'he' | 'en') => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation strings
const translations = {
  he: {
    // Navigation
    'nav.home': 'בית',
    'nav.dashboard': 'לוח בקרה',
    'nav.sessions': 'מפגשים',
    'nav.reflections': 'הרהורים',
    'nav.resources': 'משאבים',
    'nav.profile': 'פרופיל',
    'nav.settings': 'הגדרות',
    'nav.signOut': 'התנתק',
    'nav.signIn': 'התחבר',
    'nav.clients': 'לקוחות',
    
    // Homepage
    'home.hero.title': 'שנה את',
    'home.hero.subtitle': 'מסע החיים שלך',
    'home.hero.description': 'גלה את העצמי האותנטי שלך דרך מפגשי אימון מותאמים אישית שנועדו לפתוח את הפוטנציאל שלך וליצור שינוי משמעותי ומתמשך.',
    'home.hero.cta.primary': 'התחל את המסע שלך',
    'home.hero.cta.secondary': 'למד עוד',
    'home.hero.welcome': 'ברוך הבא,',
    'home.hero.continue': 'המשך את המסע שלך',
    
    // Features
    'home.features.title': 'למה לבחור ב-Lumea?',
    'home.features.subtitle': 'אנו מאמינים בכוח של טרנספורמציה אותנטית דרך גילוי עצמי מונחה ותמיכה מותאמת אישית.',
    'home.features.coaches.title': 'מאמנים מומחים',
    'home.features.coaches.description': 'עבוד עם מאמני חיים מוסמכים שמבינים את המסע הייחודי והמטרות שלך.',
    'home.features.scheduling.title': 'תיאום גמיש',
    'home.features.scheduling.description': 'הזמן מפגשים שמתאימים לאורח החיים שלך עם מערכת התיאום הקלה לשימוש שלנו.',
    'home.features.progress.title': 'מעקב התקדמות',
    'home.features.progress.description': 'עקוב אחר הצמיחה שלך עם תובנות מפורטות וכלי הרהור.',
    
    // Testimonials
    'home.testimonials.title': 'מה אומרים הלקוחות שלנו',
    'home.testimonials.subtitle': 'סיפורים אמיתיים של אנשים ששינו את חייהם דרך אימון.',
    'home.testimonials.1.content': 'Lumea עזרה לי למצוא בהירות במסלול הקריירה שלי. הגישה המותאמת אישית עשתה את כל ההבדל.',
    'home.testimonials.1.name': 'שרה מזרחי',
    'home.testimonials.1.role': 'מנהלת שיווק',
    'home.testimonials.2.content': 'מפגשי האימון נתנו לי כלים להתגבר על האמונות המגבילות שלי ולהשיג את המטרות שלי.',
    'home.testimonials.2.name': 'דוד כהן',
    'home.testimonials.2.role': 'יזם',
    'home.testimonials.3.content': 'צמחתי כל כך כאדם. כלי ההרהור והמפגשים המונחים חזקים בצורה מדהימה.',
    'home.testimonials.3.name': 'מירב לוי',
    'home.testimonials.3.role': 'מורה',
    
    // CTA
    'home.cta.title': 'מוכן להתחיל את הטרנספורמציה שלך?',
    'home.cta.subtitle': 'קח את הצעד הראשון ליצירת החיים שתמיד חלמת עליהם. העצמי האותנטי שלך מחכה להתגלות.',
    'home.cta.button': 'התחל היום',
    
    // Clients
    'clients.title': 'הלקוחות שלי',
    'clients.subtitle': 'נהל ועקוב אחר לקוחות האימון שלך',
    'clients.addClient': 'הוסף לקוח',
    'clients.searchPlaceholder': 'חפש לקוחות...',
    'clients.noClients': 'אין לקוחות עדיין',
    'clients.noSearchResults': 'לא נמצאו לקוחות',
    'clients.tryDifferentSearch': 'נסה לשנות את מונחי החיפוש',
    'clients.addFirstClient': 'הוסף את הלקוח הראשון שלך כדי להתחיל',
    'clients.unnamedClient': 'לקוח ללא שם',
    'clients.memberSince': 'חבר מאז:',
    'clients.sessions': 'מפגשים:',
    'clients.lastSession': 'מפגש אחרון:',
    'clients.message': 'הודעה',
    'clients.schedule': 'תזמן',
    
    // Reflections
    'reflections.title': 'הרהורים',
    'reflections.coachSubtitle': 'צפה ונהל הרהורי לקוחות',
    'reflections.clientSubtitle': 'ההרהורים והתובנות האישיות שלך',
    'reflections.newReflection': 'הרהור חדש',
    'reflections.searchPlaceholder': 'חפש הרהורים...',
    'reflections.allStatuses': 'כל הסטטוסים',
    'reflections.completed': 'הושלם',
    'reflections.shared': 'שותף',
    'reflections.draft': 'טיוטה',
    'reflections.noReflections': 'לא נמצאו הרהורים',
    'reflections.noSearchResults': 'נסה לשנות את מונחי החיפוש',
    'reflections.noReflectionsSubtitle': 'התחל ליצור הרהורים כדי לעקוב אחר ההתקדמות שלך',
    'reflections.viewDetails': 'צפה בפרטים',
    
    // Settings
    'settings.title': 'הגדרות',
    'settings.subtitle': 'נהל את החשבון וההעדפות שלך',
    'settings.profile': 'פרופיל',
    'settings.notifications': 'התראות',
    'settings.privacy': 'פרטיות',
    'settings.appearance': 'מראה',
    'settings.profileSaved': 'הפרופיל נשמר בהצלחה',
    'settings.notificationsSaved': 'הגדרות ההתראות נשמרו',
    'settings.privacySaved': 'הגדרות הפרטיות נשמרו',
    'settings.saving': 'שומר...',
    'settings.saveProfile': 'שמור פרופיל',
    'settings.saveNotifications': 'שמור התראות',
    'settings.savePrivacy': 'שמור פרטיות',
    'settings.noName': 'ללא שם',
    'settings.memberSince': 'חבר מאז',
    'settings.fullName': 'שם מלא',
    'settings.email': 'אימייל',
    'settings.phone': 'טלפון',
    'settings.location': 'מיקום',
    'settings.bio': 'ביוגרפיה',
    'settings.bioPlaceholder': 'ספר לנו על עצמך...',
    'settings.emailNotifications': 'התראות אימייל',
    'settings.emailNotificationsDesc': 'קבל התראות דרך אימייל',
    'settings.pushNotifications': 'התראות דחיפה',
    'settings.pushNotificationsDesc': 'קבל התראות דחיפה במכשיר שלך',
    'settings.sessionReminders': 'תזכורות מפגש',
    'settings.sessionRemindersDesc': 'קבל תזכורות על מפגשים קרובים',
    'settings.weeklyReports': 'דוחות שבועיים',
    'settings.weeklyReportsDesc': 'קבל דוחות התקדמות שבועיים',
    'settings.profileVisibility': 'נראות פרופיל',
    'settings.public': 'ציבורי',
    'settings.private': 'פרטי',
    'settings.connectionsOnly': 'חיבורים בלבד',
    'settings.showEmail': 'הצג אימייל',
    'settings.showEmailDesc': 'הצג את האימייל שלך בפרופיל',
    'settings.showPhone': 'הצג טלפון',
    'settings.showPhoneDesc': 'הצג את מספר הטלפון שלך בפרופיל',
    'settings.dataSharing': 'שיתוף נתונים',
    'settings.dataSharingDesc': 'אפשר שיתוף נתונים אנונימיים למחקר',
    'settings.language': 'שפה',
    'settings.darkMode': 'מצב חשוך',
    'settings.darkModeDesc': 'השתמש בנושא חשוך לממשק',
    
    // Common
    'common.loading': 'טוען...',
    'common.error': 'שגיאה',
    'common.success': 'הצלחה',
    'common.cancel': 'ביטול',
    'common.save': 'שמור',
    'common.edit': 'ערוך',
    'common.delete': 'מחק',
    'common.close': 'סגור',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.sessions': 'Sessions',
    'nav.reflections': 'Reflections',
    'nav.resources': 'Resources',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign Out',
    'nav.signIn': 'Sign In',
    'nav.clients': 'Clients',
    
    // Homepage
    'home.hero.title': 'Transform Your',
    'home.hero.subtitle': 'Life Journey',
    'home.hero.description': 'Discover your authentic self through personalized coaching sessions designed to unlock your potential and create lasting meaningful change.',
    'home.hero.cta.primary': 'Start Your Journey',
    'home.hero.cta.secondary': 'Learn More',
    'home.hero.welcome': 'Welcome back,',
    'home.hero.continue': 'Continue Your Journey',
    
    // Features
    'home.features.title': 'Why Choose Lumea?',
    'home.features.subtitle': 'We believe in the power of authentic transformation through guided self-discovery and personalized support.',
    'home.features.coaches.title': 'Expert Coaches',
    'home.features.coaches.description': 'Work with certified life coaches who understand your unique journey and goals.',
    'home.features.scheduling.title': 'Flexible Scheduling',
    'home.features.scheduling.description': 'Book sessions that fit your lifestyle with our easy-to-use scheduling system.',
    'home.features.progress.title': 'Track Progress',
    'home.features.progress.description': 'Monitor your growth with detailed insights and reflection tools.',
    
    // Testimonials
    'home.testimonials.title': 'What Our Clients Say',
    'home.testimonials.subtitle': 'Real stories from people who\'ve transformed their lives through coaching.',
    'home.testimonials.1.content': 'Lumea helped me find clarity in my career path. The personalized approach made all the difference.',
    'home.testimonials.1.name': 'Sarah Mitchell',
    'home.testimonials.1.role': 'Marketing Director',
    'home.testimonials.2.content': 'The coaching sessions gave me the tools to overcome my limiting beliefs and achieve my goals.',
    'home.testimonials.2.name': 'David Chen',
    'home.testimonials.2.role': 'Entrepreneur',
    'home.testimonials.3.content': 'I\'ve grown so much as a person. The reflective tools and guided sessions are incredibly powerful.',
    'home.testimonials.3.name': 'Emily Rodriguez',
    'home.testimonials.3.role': 'Teacher',
    
    // CTA
    'home.cta.title': 'Ready to Begin Your Transformation?',
    'home.cta.subtitle': 'Take the first step towards creating the life you\'ve always envisioned. Your authentic self is waiting to be discovered.',
    'home.cta.button': 'Get Started Today',
    
    // Clients
    'clients.title': 'My Clients',
    'clients.subtitle': 'Manage and track your coaching clients',
    'clients.addClient': 'Add Client',
    'clients.searchPlaceholder': 'Search clients...',
    'clients.noClients': 'No clients yet',
    'clients.noSearchResults': 'No clients found',
    'clients.tryDifferentSearch': 'Try adjusting your search terms',
    'clients.addFirstClient': 'Add your first client to get started',
    'clients.unnamedClient': 'Unnamed Client',
    'clients.memberSince': 'Member since:',
    'clients.sessions': 'Sessions:',
    'clients.lastSession': 'Last session:',
    'clients.message': 'Message',
    'clients.schedule': 'Schedule',
    
    // Reflections
    'reflections.title': 'Reflections',
    'reflections.coachSubtitle': 'View and manage client reflections',
    'reflections.clientSubtitle': 'Your personal reflections and insights',
    'reflections.newReflection': 'New Reflection',
    'reflections.searchPlaceholder': 'Search reflections...',
    'reflections.allStatuses': 'All Statuses',
    'reflections.completed': 'Completed',
    'reflections.shared': 'Shared',
    'reflections.draft': 'Draft',
    'reflections.noReflections': 'No reflections found',
    'reflections.noSearchResults': 'Try adjusting your search terms',
    'reflections.noReflectionsSubtitle': 'Start creating reflections to track your progress',
    'reflections.viewDetails': 'View Details',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account and preferences',
    'settings.profile': 'Profile',
    'settings.notifications': 'Notifications',
    'settings.privacy': 'Privacy',
    'settings.appearance': 'Appearance',
    'settings.profileSaved': 'Profile saved successfully',
    'settings.notificationsSaved': 'Notification settings saved',
    'settings.privacySaved': 'Privacy settings saved',
    'settings.saving': 'Saving...',
    'settings.saveProfile': 'Save Profile',
    'settings.saveNotifications': 'Save Notifications',
    'settings.savePrivacy': 'Save Privacy',
    'settings.noName': 'No Name',
    'settings.memberSince': 'Member since',
    'settings.fullName': 'Full Name',
    'settings.email': 'Email',
    'settings.phone': 'Phone',
    'settings.location': 'Location',
    'settings.bio': 'Bio',
    'settings.bioPlaceholder': 'Tell us about yourself...',
    'settings.emailNotifications': 'Email Notifications',
    'settings.emailNotificationsDesc': 'Receive notifications via email',
    'settings.pushNotifications': 'Push Notifications',
    'settings.pushNotificationsDesc': 'Receive push notifications on your device',
    'settings.sessionReminders': 'Session Reminders',
    'settings.sessionRemindersDesc': 'Get reminded about upcoming sessions',
    'settings.weeklyReports': 'Weekly Reports',
    'settings.weeklyReportsDesc': 'Receive weekly progress reports',
    'settings.profileVisibility': 'Profile Visibility',
    'settings.public': 'Public',
    'settings.private': 'Private',
    'settings.connectionsOnly': 'Connections Only',
    'settings.showEmail': 'Show Email',
    'settings.showEmailDesc': 'Display your email on your profile',
    'settings.showPhone': 'Show Phone',
    'settings.showPhoneDesc': 'Display your phone number on your profile',
    'settings.dataSharing': 'Data Sharing',
    'settings.dataSharingDesc': 'Allow sharing of anonymized data for research',
    'settings.language': 'Language',
    'settings.darkMode': 'Dark Mode',
    'settings.darkModeDesc': 'Use dark theme for the interface',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.close': 'Close',
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<'he' | 'en'>('he'); // Default to Hebrew
  const isRTL = language === 'he';

  const setLanguage = (lang: 'he' | 'en') => {
    setLanguageState(lang);
    localStorage.setItem('lumea-language', lang);
    
    // Update document direction
    document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('lumea-language') as 'he' | 'en';
    if (savedLanguage && (savedLanguage === 'he' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    } else {
      // Default to Hebrew
      setLanguage('he');
    }
  }, []);

  const value: LanguageContextType = {
    language,
    isRTL,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 