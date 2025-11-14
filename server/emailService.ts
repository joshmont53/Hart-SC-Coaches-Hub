// Email service for sending invitations and verification emails using Resend
import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let connectionSettings: any;

/**
 * Get Resend API credentials from Replit Connectors
 */
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

/**
 * Get Resend client with fresh credentials
 * WARNING: Never cache this client. Access tokens expire.
 */
async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    // Force use of Resend's test domain for development
    fromEmail: process.env.NODE_ENV === 'development' ? 'onboarding@resend.dev' : (fromEmail || 'onboarding@resend.dev')
  };
}

/**
 * Send an email using Resend API
 * @param options - Email options
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('✅ Email sent successfully:', data?.id);
  } catch (error: any) {
    console.error('❌ Email service error:', error);
    throw error;
  }
}

/**
 * Send invitation email with registration link
 * @param email - Recipient email
 * @param inviteToken - Unique invitation token
 * @param coachName - Name of the coach being invited
 */
export async function sendInvitationEmail(
  email: string, 
  inviteToken: string,
  coachName: string
): Promise<void> {
  // Use Replit dev domain in development, or APP_URL in production
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : (process.env.APP_URL || 'http://localhost:5000');
  const registrationUrl = `${baseUrl}/register?token=${inviteToken}`;
  
  await sendEmail({
    to: email,
    subject: 'You\'ve been invited to Hart SC Coaches Hub',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Hart SC Coaches Hub Invitation</title>
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Hart SC Coaches Hub</h1>
          </div>
          
          <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e40af; margin-top: 0;">Welcome, ${coachName}!</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              You've been invited to join the Hart Swimming Club coaching team platform. 
              This platform helps you manage training sessions, track swimmer attendance, and collaborate with fellow coaches.
            </p>
            
            <p style="font-size: 16px; color: #4b5563;">
              Click the button below to create your account and get started:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${registrationUrl}" 
                 style="display: inline-block; 
                        padding: 14px 32px; 
                        background-color: #1e40af; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: 600;
                        font-size: 16px;">
                Create Your Account
              </a>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⏰ This invitation expires in 48 hours.</strong>
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
              If you can't click the button, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 8px; border-radius: 4px;">
              ${registrationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              If you didn't expect this invitation, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });
}

/**
 * Send email verification link
 * @param email - Recipient email
 * @param verificationToken - Unique verification token
 * @param firstName - User's first name
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  firstName: string
): Promise<void> {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
  
  await sendEmail({
    to: email,
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #1e40af; margin-top: 0;">Welcome ${firstName}!</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              Please verify your email address to activate your account:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; 
                        padding: 14px 32px; 
                        background-color: #1e40af; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: 600;
                        font-size: 16px;">
                Verify Email
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              This verification link expires in 24 hours.
            </p>
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px;">
              If you didn't create this account, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
  });
}
