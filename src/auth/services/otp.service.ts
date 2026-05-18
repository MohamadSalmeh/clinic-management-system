import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as otpGenerator from 'otp-generator';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly configService: ConfigService) {}

  generateOtp(length = 6): string {
    return otpGenerator.generate(length, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
  }

  async sendOtpWhatsApp(phoneNumber: string, otp: string): Promise<void> {
    const instanceId = this.configService.get<string>('ULTRAMSG_INSTANCE_ID');
    const token = this.configService.get<string>('ULTRAMSG_TOKEN');

    if (!instanceId || !token) {
      this.logger.error('Ultramsg configuration is missing in .env file');
      throw new InternalServerErrorException('Failed to send WhatsApp OTP');
    }

    // تنظيف رقم الهاتف ليكون أرقاماً فقط
    const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');

    if (!cleanPhoneNumber) {
      throw new InternalServerErrorException('Invalid phone number format');
    }

    // تجهيز البارامترز المطلوبة لـ Ultramsg
    const params = new URLSearchParams({
      token,
      to: cleanPhoneNumber,
      body: `🔐 *مركز العيادات الطبي*\n\nمرحباً بك! رمز التحقق الخاص بك لتأكيد حسابك هو: *${otp}*\n\nهذا الرمز صالح لمدة 15 دقيقة فقط. يرجى عدم مشاركته مع أحد.`,
    });

    try {
      // الرابط الموحد والثابت عالمياً لـ Ultramsg بدون تعقيد قنوات
      const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        this.logger.error(`Ultramsg Gate Error: ${response.status} - ${responseText}`);
        throw new InternalServerErrorException('Failed to send WhatsApp OTP');
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        'Failed to send WhatsApp OTP due to Ultramsg network error',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to send WhatsApp OTP');
    }
  }
}