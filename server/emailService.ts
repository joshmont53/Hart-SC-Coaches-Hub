// Email service for sending invitations and verification emails
// This will be connected to SendGrid or Resend in Phase 2

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email (placeholder - will be implemented with SendGrid/Resend in Phase 2)
 * @param options - Email options
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  console.log('📧 Email Service (NOT YET CONFIGURED):');
  console.log('To:', options.to);
  console.log('Subject:', options.subject);
  console.log('Body:', options.html);
  console.log('---');
  
  // TODO: Implement actual email sending in Phase 2
  // Will use SendGrid or Resend integration
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
  const registrationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/register?token=${inviteToken}`;
  
  await sendEmail({
    to: email,
    subject: 'You\'ve been invited to Hart SC Coaches Hub',
    html: `
      <h2>Welcome to Hart SC Coaches Hub, ${coachName}!</h2>
      <p>You've been invited to join the coaching team platform.</p>
      <p>Click the link below to create your account:</p>
      <a href="${registrationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4B9A4A; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
        Create Account
      </a>
      <p style="color: #666; font-size: 14px;">This invitation link expires in 48 hours.</p>
      <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, please ignore this email.</p>
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
      <h2>Welcome ${firstName}!</h2>
      <p>Please verify your email address to activate your account:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4B9A4A; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
        Verify Email
      </a>
      <p style="color: #666; font-size: 14px;">This verification link expires in 24 hours.</p>
      <p style="color: #666; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
    `,
  });
}
