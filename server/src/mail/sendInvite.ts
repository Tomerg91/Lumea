import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Load environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.example.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@satyacoaching.com';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Send an invitation email to a client
 * 
 * @param email The recipient's email address
 * @param token The invitation token
 * @param coachName The name of the coach who sent the invitation
 */
export async function sendInvite(email: string, token: string, coachName: string): Promise<void> {
  const inviteLink = `${APP_URL}/signup/${token}`;
  
  // Hebrew RTL content
  const hebrewHtml = `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
      <h2>הזמנה לפלטפורמת סאטיה קואצ'ינג</h2>
      <p>שלום,</p>
      <p>הקואצ' <strong>${coachName}</strong> הזמין אותך להצטרף לפלטפורמת סאטיה קואצ'ינג.</p>
      <p>לחץ על הקישור הבא כדי להשלים את ההרשמה שלך:</p>
      <p><a href="${inviteLink}">הירשם עכשיו</a></p>
      <p>הקישור תקף ל-30 דקות בלבד.</p>
      <p>אם לא ביקשת הזמנה זו, אנא התעלם מאימייל זה.</p>
      <p>בברכה,<br>צוות סאטיה קואצ'ינג</p>
    </div>
  `;
  
  // Plain text fallback (bilingual)
  const plainText = `
הזמנה לפלטפורמת סאטיה קואצ'ינג

שלום,

הקואצ' ${coachName} הזמין אותך להצטרף לפלטפורמת סאטיה קואצ'ינג.
לחץ על הקישור הבא כדי להשלים את ההרשמה שלך:
${inviteLink}

הקישור תקף ל-30 דקות בלבד.
אם לא ביקשת הזמנה זו, אנא התעלם מאימייל זה.

בברכה,
צוות סאטיה קואצ'ינג

-------------------------------

Invitation to Satya Coaching Platform

Hello,

Coach ${coachName} has invited you to join the Satya Coaching platform.
Click the following link to complete your registration:
${inviteLink}

This link is valid for 30 minutes only.
If you did not request this invitation, please ignore this email.

Best regards,
The Satya Coaching Team
  `;
  
  // Send the email
  await transporter.sendMail({
    from: `"Satya Coaching" <${FROM_EMAIL}>`,
    to: email,
    subject: "הזמנה לפלטפורמת סאטיה קואצ'ינג | Invitation to Satya Coaching",
    text: plainText,
    html: hebrewHtml,
  });
} 