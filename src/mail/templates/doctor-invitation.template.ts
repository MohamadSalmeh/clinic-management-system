export interface DoctorInvitationTemplateData {
    invitationLink: string;
    expiresAt: Date;
}

export function buildDoctorInvitationTemplate(
    data: DoctorInvitationTemplateData,
): { html: string; text: string } {
    const formattedExpiresAt = formatExpirationDate(data.expiresAt);
    const safeExpiresAt = escapeHtml(formattedExpiresAt);
    const safeLink = escapeHtml(data.invitationLink);

    const text = [
        'Hello,',
        '',
        'You were invited by Clinic Admin to join Clinic System as a Doctor.',
        'Complete your registration using the link below:',
        data.invitationLink,
        '',
        `This invitation expires on ${formattedExpiresAt}.`,
        'If you did not expect this email, you can safely ignore it.',
    ].join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Doctor Invitation</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f6fb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6fb; padding: 24px 0;">
      <tr>
        <td align="center" style="padding: 0 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="padding: 32px 32px 24px 32px; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a;">
                <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700;">Clinic System</h1>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">Hello,</p>
                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">
                  You were invited by Clinic Admin to join Clinic System as a Doctor.
                </p>
                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                  Click the button below to complete your registration.
                </p>
                <p style="margin: 0 0 28px 0;">
                  <a href="${safeLink}" style="display: inline-block; padding: 12px 22px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                    Complete registration
                  </a>
                </p>
                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6;">
                  <a href="${safeLink}" style="color: #2563eb;">${safeLink}</a>
                </p>
                <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                  This invitation expires on <strong>${safeExpiresAt}</strong>.
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                  If you did not expect this email, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8; font-family: 'Segoe UI', Arial, sans-serif;">
            Clinic System
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    return { html, text };
}

function formatExpirationDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
    }).format(date);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
