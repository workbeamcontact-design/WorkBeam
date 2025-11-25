// Email utility functions for WorkBeam
// Uses Resend API for professional email delivery

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from = 'WorkBeam <noreply@workbeam.co.uk>' }: SendEmailParams) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || 'Failed to send email');
    }

    return { success: true, id: data.id };
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

// Generate a 6-digit OTP code
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create professional HTML email template for password reset OTP
export function createPasswordResetEmail(otpCode: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your WorkBeam Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with WorkBeam branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); padding: 48px 32px; text-align: center;">
              <div style="display: inline-block;">
                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.8px;">
                  Work
                </h1>
                <div style="margin-top: 8px; display: flex; gap: 4px; justify-content: center;">
                  <div style="width: 60px; height: 4px; background: #0A84FF; border-radius: 2px; transform: rotate(-2deg);"></div>
                  <div style="width: 60px; height: 4px; background: #10B981; border-radius: 2px; transform: rotate(2deg);"></div>
                </div>
                <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.8); font-size: 13px; letter-spacing: 0.5px;">
                  TRADES BUSINESS MANAGEMENT
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">
                Reset Your Password
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #6B7280; font-size: 16px; line-height: 24px;">
                We received a request to reset your WorkBeam password. Use the verification code below to complete the process:
              </p>
              
              <!-- OTP Code Display -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #F3F4F6; border: 2px solid #E5E7EB; border-radius: 12px; padding: 24px 48px;">
                      <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Verification Code
                      </p>
                      <p style="margin: 0; color: #0A84FF; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${otpCode}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 20px;">
                This code will expire in <strong style="color: #111827;">10 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
              </p>
              
              <!-- Security Notice -->
              <div style="margin-top: 32px; padding: 16px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px;">
                <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 20px;">
                  <strong>Security tip:</strong> Never share this code with anyone. WorkBeam will never ask for your verification code.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 32px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">
                Need help? Contact WorkBeam Support
              </p>
              <p style="margin: 8px 0 0 0; color: #9CA3AF; font-size: 12px;">
                © ${new Date().getFullYear()} WorkBeam. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Create team invitation email
export function createTeamInvitationEmail(
  inviterName: string,
  organizationName: string,
  role: 'admin' | 'member',
  invitationUrl: string
): string {
  const roleDescription = role === 'admin' 
    ? 'You will have administrative access to manage the team and organization settings.'
    : 'You will be able to view and manage jobs, clients, invoices, and quotes.';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${organizationName} on WorkBeam</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with WorkBeam branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); padding: 48px 32px; text-align: center;">
              <div style="display: inline-block;">
                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.8px;">
                  Work
                </h1>
                <div style="margin-top: 8px; display: flex; gap: 4px; justify-content: center;">
                  <div style="width: 60px; height: 4px; background: #0A84FF; border-radius: 2px; transform: rotate(-2deg);"></div>
                  <div style="width: 60px; height: 4px; background: #10B981; border-radius: 2px; transform: rotate(2deg);"></div>
                </div>
                <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.8); font-size: 13px; letter-spacing: 0.5px;">
                  TRADES BUSINESS MANAGEMENT
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">
                You're Invited to Join ${organizationName}
              </h2>
              
              <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 16px; line-height: 24px;">
                <strong style="color: #111827;">${inviterName}</strong> has invited you to join <strong style="color: #111827;">${organizationName}</strong> on WorkBeam.
              </p>
              
              <p style="margin: 0 0 24px 0; color: #6B7280; font-size: 16px; line-height: 24px;">
                ${roleDescription}
              </p>
              
              <!-- Role Badge -->
              <div style="margin: 24px 0;">
                <div style="display: inline-block; padding: 8px 16px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px;">
                  <p style="margin: 0; color: #1E40AF; font-size: 14px; font-weight: 600;">
                    Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
                  </p>
                </div>
              </div>
              
              <!-- Accept Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationUrl}" style="display: inline-block; padding: 16px 32px; background-color: #0A84FF; color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(10, 132, 255, 0.3);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 20px;">
                This invitation will expire in <strong style="color: #111827;">7 days</strong>. If you don't want to join this organization, you can safely ignore this email.
              </p>
              
              <!-- Security Notice -->
              <div style="margin-top: 32px; padding: 16px; background-color: #F3F4F6; border-left: 4px solid #6B7280; border-radius: 8px;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 20px;">
                  <strong>Note:</strong> You'll need to create a WorkBeam account or sign in if you already have one.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 32px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">
                Need help? Contact WorkBeam Support
              </p>
              <p style="margin: 8px 0 0 0; color: #9CA3AF; font-size: 12px;">
                © ${new Date().getFullYear()} WorkBeam. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Create welcome email for new users
export function createWelcomeEmail(userName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to WorkBeam</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1F2937 0%, #111827 100%); padding: 48px 32px; text-align: center;">
              <div style="display: inline-block;">
                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.8px;">
                  Work
                </h1>
                <div style="margin-top: 8px; display: flex; gap: 4px; justify-content: center;">
                  <div style="width: 60px; height: 4px; background: #0A84FF; border-radius: 2px; transform: rotate(-2deg);"></div>
                  <div style="width: 60px; height: 4px; background: #10B981; border-radius: 2px; transform: rotate(2deg);"></div>
                </div>
                <p style="margin: 16px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                  Welcome!
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">
                Hi ${userName}!
              </h2>
              
              <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 16px; line-height: 24px;">
                We're excited to have you on board. WorkBeam is your complete business management solution for trades professionals.
              </p>
              
              <p style="margin: 0 0 24px 0; color: #6B7280; font-size: 16px; line-height: 24px;">
                Start managing your clients, bookings, quotes, and invoices all in one place.
              </p>
              
              <div style="margin: 32px 0; padding: 24px; background-color: #F3F4F6; border-radius: 12px;">
                <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 18px; font-weight: 600;">
                  Get Started:
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #6B7280; font-size: 14px; line-height: 24px;">
                  <li>Add your first client</li>
                  <li>Create a booking or quote</li>
                  <li>Customize your business details</li>
                  <li>Send your first invoice</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 32px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">
                Questions? Contact WorkBeam Support
              </p>
              <p style="margin: 8px 0 0 0; color: #9CA3AF; font-size: 12px;">
                © ${new Date().getFullYear()} WorkBeam. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
