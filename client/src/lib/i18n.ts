// Simple translation function for Hebrew text
export const t = (key: string): string => {
  const translations: Record<string, string> = {
    // Landing page
    "landing.welcome": "ברוכים הבאים לשיטת סאטיה",
    "landing.subtitle": "פלטפורמה לאימון אישי שתעזור לך להגיע לשלב הבא בהתפתחות האישית והמקצועית שלך",
    "landing.login": "התחברות",
    "landing.signup": "הרשמה",
    "landing.features.title": "למה לבחור בשיטת סאטיה?",
    "landing.features.personal.title": "קשר אישי",
    "landing.features.personal.description": "קשר ישיר ורציף עם המאמן האישי שלך בכל שלב בתהליך",
    "landing.features.resources.title": "חומרי לימוד",
    "landing.features.resources.description": "גישה למגוון חומרי לימוד והעשרה באופן מותאם אישית",
    "landing.features.progress.title": "מעקב התקדמות",
    "landing.features.progress.description": "כלים למעקב אחר ההתקדמות האישית שלך לאורך הדרך",
    "landing.testimonials.title": "לקוחות מספרים",
    "landing.cta.title": "מוכנים להתחיל את המסע?",
    "landing.cta.subtitle": "הצטרפו עכשיו ותתחילו לראות שינוי אמיתי בחיים שלכם",
    "landing.cta.signup": "הרשמה עכשיו",
    "landing.cta.login": "התחברות",
    
    // Auth
    "auth.login.title": "התחברות",
    "auth.login.email": "דוא\"ל",
    "auth.login.password": "סיסמה",
    "auth.login.rememberMe": "זכור אותי",
    "auth.login.forgotPassword": "שכחת סיסמה?",
    "auth.login.submit": "התחברות",
    "auth.login.noAccount": "אין לך חשבון?",
    "auth.login.signupLink": "להרשמה",
    
    "auth.signup.title": "הרשמה",
    "auth.signup.fullName": "שם מלא",
    "auth.signup.email": "דוא\"ל",
    "auth.signup.password": "סיסמה",
    "auth.signup.confirmPassword": "אימות סיסמה",
    "auth.signup.roleSelect": "בחר תפקיד",
    "auth.signup.roleClient": "מתאמן/נת",
    "auth.signup.roleCoach": "מאמן/נת",
    "auth.signup.submit": "הרשמה",
    "auth.signup.hasAccount": "כבר יש לך חשבון?",
    "auth.signup.loginLink": "להתחברות",
    
    // Dashboard - Common
    "dashboard.title": "לוח בקרה",
    "dashboard.logout": "התנתקות",
    "dashboard.settings": "הגדרות",
    
    // Dashboard - Coach
    "coach.sidebar.dashboard": "לוח בקרה",
    "coach.sidebar.clients": "מתאמנים",
    "coach.sidebar.sessions": "פגישות",
    "coach.sidebar.resources": "חומרי לימוד",
    "coach.sidebar.payments": "תשלומים",
    
    "coach.dashboard.activeClients": "מתאמנים פעילים",
    "coach.dashboard.weekSessions": "פגישות השבוע",
    "coach.dashboard.newReflections": "רפלקציות חדשות",
    "coach.dashboard.upcomingSessions": "פגישות קרובות",
    "coach.dashboard.viewAllSessions": "צפייה בכל הפגישות",
    "coach.dashboard.startSession": "התחל פגישה",
    "coach.dashboard.editSession": "ערוך פגישה",
    "coach.dashboard.clientActivity": "פעילות מתאמנים אחרונה",
    "coach.dashboard.upcomingPayments": "תשלומים קרובים",
    
    // Dashboard - Client
    "client.sidebar.dashboard": "לוח בקרה",
    "client.sidebar.sessions": "הפגישות שלי",
    "client.sidebar.reflections": "רפלקציות",
    "client.sidebar.resources": "חומרי לימוד",
    "client.sidebar.payments": "תשלומים",
    
    "client.dashboard.myCoach": "המאמן/ת שלי",
    "client.dashboard.sendMessage": "שליחת הודעה",
    "client.dashboard.contact": "יצירת קשר",
    "client.dashboard.nextSession": "הפגישה הבאה שלך",
    "client.dashboard.joinSession": "הצטרפות לפגישה",
    "client.dashboard.submitReflection": "הגשת רפלקציה",
    "client.dashboard.reflectionTitle": "כותרת",
    "client.dashboard.reflectionContent": "התוכן שלך",
    "client.dashboard.audioRecording": "הוספת הקלטה קולית (אופציונלי)",
    "client.dashboard.startRecording": "לחץ להתחלת הקלטה",
    "client.dashboard.shareWithCoach": "שתף עם המאמן/ת שלי",
    "client.dashboard.submit": "שליחה",
    "client.dashboard.learningResources": "חומרי לימוד",
    "client.dashboard.recentActivity": "הפעילות האחרונה שלי",
    
    // Errors and Messages
    "error.required": "שדה חובה",
    "error.email": "נא להזין כתובת דוא\"ל תקינה",
    "error.passwordMatch": "הסיסמאות אינן תואמות",
    "error.minLength": "מינימום {{count}} תווים",
    "success.login": "התחברות בוצעה בהצלחה",
    "success.register": "הרשמה בוצעה בהצלחה",
    "success.logout": "התנתקות בוצעה בהצלחה"
  };

  return translations[key] || key;
};
