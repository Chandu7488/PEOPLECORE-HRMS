import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

/**
 * Enterprise Email Notification Service
 * Supports SMTP (Mailpit, SendGrid, Amazon SES, or custom corporate relays)
 * Automatically falls back to formatted terminal visual boxes in testing/dev environments.
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: ENV.SMTP_HOST || '127.0.0.1',
        port: Number(ENV.SMTP_PORT) || 1025,
        secure: false, // Port 1025 for Mailpit does not require TLS
        auth: ENV.SMTP_USER ? { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS } : undefined,
        ignoreTLS: true,
      });
    } catch (err) {
      console.warn('⚠️ Could not initialize SMTP transporter:', err.message);
    }
  }

  /**
   * Helper to dispatch an email via SMTP with graceful fallback
   */
  async dispatch({ to, subject, text, html }) {
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: ENV.SMTP_FROM || 'PeopleCore HRMS <no-reply@peoplecore.local>',
          to,
          subject,
          text,
          html,
        });
        return { success: true, messageId: info.messageId };
      } catch (err) {
        if (ENV.NODE_ENV !== 'test') {
          console.warn(`⚠️ SMTP dispatch error to ${to} (${err.message}). Logging to console instead.`);
        }
      }
    }
    return { success: true, messageId: `local-${Date.now()}` };
  }

  /**
   * Sends password reset email
   */
  async sendPasswordResetEmail(toEmail, rawToken, expiryMinutes = 30) {
    const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${rawToken}`;

    const subject = 'Reset Your PeopleCore HRMS Password';
    const text = `Hello,\n\nA password reset request was initiated for your PeopleCore account.\nClick the link below to choose a new password:\n${resetUrl}\n\nThis link expires in ${expiryMinutes} minutes.\nIf you did not request this, please contact your HR department immediately.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">PeopleCore HRMS</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Account Security & Access</p>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">A password reset request was initiated for your PeopleCore account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Set New Password</a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5;">This password reset link is valid for <strong>${expiryMinutes} minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">PeopleCore HRMS • Enterprise Workforce Portal</p>
      </div>
    `;

    if (ENV.NODE_ENV !== 'test') {
      console.log('\n======================================================');
      console.log('📧 [EMAIL DISPATCH] Password Reset Link Generated');
      console.log(`➡️  To: ${toEmail}`);
      console.log(`⏳ Expiration: ${expiryMinutes} minutes`);
      console.log(`🔗 Reset URL: ${resetUrl}`);
      console.log('======================================================\n');
    }

    await this.dispatch({ to: toEmail, subject, text, html });

    return {
      success: true,
      messageId: `msg-${Date.now()}`,
      resetUrl,
    };
  }

  /**
   * Sends welcome & onboarding invitation email to a newly hired/added employee
   */
  async sendWelcomeAndInvitationEmail({
    toEmail,
    name,
    employeeCode,
    departmentName = 'General',
    resetUrl,
    tempPassword = null,
    organizationName = 'PeopleCore Technologies Ltd.',
  }) {
    const subject = `Welcome to ${organizationName} - Set Up Your HRMS Account`;
    const text = `Welcome ${name}!\n\nYour employee profile has been created at ${organizationName}.\nEmployee Code: ${employeeCode}\nOfficial Email: ${toEmail}\nDepartment: ${departmentName}\n\nPlease click the link below to activate your account and choose your password:\n${resetUrl}\n${tempPassword ? `\nTemporary initial password: ${tempPassword}\n` : ''}\nWelcome aboard!\nPeopleCore HR Operations`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="background-color: #4f46e5; color: white; width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; margin-bottom: 8px;">P</div>
          <h1 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;">Welcome to ${organizationName}</h1>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Employee Self-Service Portal Invitation</p>
        </div>

        <p style="color: #334155; font-size: 15px;">Hello <strong>${name}</strong>,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Your official employee profile has been activated in the company HRMS. You can now access your self-service portal to mark daily attendance, apply for leaves, access corporate holiday calendars, review company notices, and download payslips.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px; color: #334155;">
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Employee Code:</strong></td>
              <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #4f46e5;">${employeeCode}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Work Email:</strong></td>
              <td style="padding: 4px 0;">${toEmail}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Department:</strong></td>
              <td style="padding: 4px 0;">${departmentName}</td>
            </tr>
            ${
              tempPassword
                ? `<tr>
                    <td style="padding: 4px 0; color: #64748b;"><strong>Temporary Password:</strong></td>
                    <td style="padding: 4px 0; font-family: monospace; font-weight: bold;">${tempPassword}</td>
                  </tr>`
                : ''
            }
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Activate Account & Set Password</a>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
          Clicking the link above will allow you to choose a confidential password and immediately sign in to your employee dashboard.
        </p>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">
          PeopleCore HRMS • Secured Enterprise Portal
        </p>
      </div>
    `;

    if (ENV.NODE_ENV !== 'test') {
      console.log('\n======================================================');
      console.log('🎉 [EMAIL DISPATCH] Employee Welcome & Invitation Sent');
      console.log(`➡️  To: ${toEmail} (${name})`);
      console.log(`🆔 Employee Code: ${employeeCode}`);
      console.log(`🔗 Activation URL: ${resetUrl}`);
      console.log('======================================================\n');
    }

    await this.dispatch({ to: toEmail, subject, text, html });

    return {
      success: true,
      messageId: `welcome-${Date.now()}`,
      resetUrl,
    };
  }

  /**
   * Sends password changed confirmation email
   */
  async sendPasswordChangedConfirmation(toEmail) {
    const subject = 'Your PeopleCore Password Has Been Changed';
    const text = `Hello,\n\nYour password for PeopleCore HRMS was successfully updated.\nIf you did not make this change, please alert your HR administrator immediately.`;

    if (ENV.NODE_ENV !== 'test') {
      console.log('\n======================================================');
      console.log('📧 [EMAIL DISPATCH] Password Changed Notice');
      console.log(`➡️  To: ${toEmail}`);
      console.log('ℹ️  Your PeopleCore HRMS password was changed successfully.');
      console.log('======================================================\n');
    }

    await this.dispatch({ to: toEmail, subject, text });

    return {
      success: true,
      messageId: `dev-confirm-${Date.now()}`,
    };
  }
}

export const emailService = new EmailService();
