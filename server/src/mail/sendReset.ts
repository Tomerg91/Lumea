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
 * Send a password reset email
 *
 * @param email The recipient's email address
 * @param token The password reset token
 * @param userName The name of the user (optional)
 */
export async function sendReset(email: string, token: string, userName?: string): Promise<void> {
  const resetLink = `${APP_URL}/reset-password/${token}`;
  const greeting = userName ? userName : 'שלום | Hello';

  // Hebrew RTL content
  const hebrewHtml = `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
      <h2>איפוס סיסמה לחשבון סאטיה קואצ'ינג</h2>
      <p>שלום ${userName || ''},</p>
      <p>קיבלנו בקשה לאיפוס הסיסמה לחשבונך בפלטפורמת סאטיה קואצ'ינג.</p>
      <p>לחץ על הקישור הבא כדי לאפס את הסיסמה שלך:</p>
      <p><a href="${resetLink}">איפוס סיסמה</a></p>
      <p>הקישור תקף ל-30 דקות בלבד.</p>
      <p>אם לא ביקשת לאפס את הסיסמה שלך, אנא התעלם מאימייל זה.</p>
      <p>בברכה,<br>צוות סאטיה קואצ'ינג</p>
    </div>
  `;

  // Plain text fallback (bilingual)
  const plainText = `
איפוס סיסמה לחשבון סאטיה קואצ'ינג

שלום ${userName || ''},

קיבלנו בקשה לאיפוס הסיסמה לחשבונך בפלטפורמת סאטיה קואצ'ינג.
לחץ על הקישור הבא כדי לאפס את הסיסמה שלך:
${resetLink}

הקישור תקף ל-30 דקות בלבד.
אם לא ביקשת לאפס את הסיסמה שלך, אנא התעלם מאימייל זה.

בברכה,
צוות סאטיה קואצ'ינג

-------------------------------

Password Reset for Satya Coaching Account

Hello ${userName || ''},

We received a request to reset your password for your Satya Coaching platform account.
Click the following link to reset your password:
${resetLink}

This link is valid for 30 minutes only.
If you did not request a password reset, please ignore this email.

Best regards,
The Satya Coaching Team
  `;

  // Send the email
  await transporter.sendMail({
    from: `"Satya Coaching" <${FROM_EMAIL}>`,
    to: email,
    subject: 'איפוס סיסמה | Password Reset - Satya Coaching',
    text: plainText,
    html: hebrewHtml,
  });
}
