import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as otpGenerator from 'otp-generator';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OtpService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const portRaw = this.configService.get<string>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    const port = portRaw && /^\d+$/.test(portRaw) ? Number(portRaw) : 587;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  generateOtp(length = 6): string {
    return otpGenerator.generate(length, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
  }
  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') ??
      '"Clinic Medical Center" <no-reply@clinic.com>';

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to: email,
      subject: 'Your verification code - Account confirmation',
      text: `Hello,\n\nYour verification code is: ${otp}\n\nThis code is valid for 15 minutes only.\n\nIf you did not request this code, please ignore this email.\n\nThank you,\nThe Clinic Team`,
      html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Code</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden;">
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                          <span style="font-size: 36px; color: white;">🔐</span>
                        </div>
                        <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Verification Code</h1>
                        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">Secure identity confirmation</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 50px 40px;">
                        <div style="text-align: center;">
                          <h2 style="margin: 0 0 20px; color: #2d3748; font-size: 24px; font-weight: 600;">Welcome!</h2>
                          <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                            Use the following verification code to complete your account verification securely.
                          </p>
                          <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px dashed #cbd5e0; border-radius: 12px; padding: 30px; margin: 30px 0; position: relative; overflow: hidden;">
                            <p style="margin: 0 0 10px; color: #718096; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
                            <div style="font-size: 36px; font-weight: 800; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(102,126,234,0.2); position: relative; z-index: 1;">${otp}</div>
                          </div>
                          <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 20px; margin: 30px 0;">
                            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                              <span style="font-size: 20px; margin-right: 8px;">⏰</span>
                              <span style="color: #c53030; font-weight: 600; font-size: 16px;">Time sensitive</span>
                            </div>
                            <p style="margin: 0; color: #742a2a; font-size: 14px; line-height: 1.5;">
                              This code is valid for <strong>15 minutes only</strong> from the time this email was sent.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="background: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 15px; color: #718096; font-size: 14px; line-height: 1.6;">
                          If you did not request this verification code, you can safely ignore this message.
                        </p>
                        <div style="height: 1px; background: #e2e8f0; margin: 20px 0;"></div>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                          This is an automated message. Please do not reply.<br>
                          <strong style="color: #667eea;">Clinic Management Team</strong> &copy; 2026
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new InternalServerErrorException('Failed to send OTP email');
    }
  }
}
