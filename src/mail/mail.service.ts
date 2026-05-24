import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { buildDoctorInvitationTemplate } from './templates/doctor-invitation.template';

export interface DoctorInvitationEmailData {
    toEmail: string;
    token: string;
    expiresAt: Date;
}

export interface VerificationCodeEmailData {
    toEmail: string;
    code: string;
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: nodemailer.Transporter | null;
    private readonly mailFrom?: string;
    private readonly frontendUrl?: string;
    private readonly backendUrl?: string;

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('MAIL_HOST');
        const port = this.toNumber(this.configService.get<string>('MAIL_PORT'));
        const secure = this.toBoolean(this.configService.get<string>('MAIL_SECURE'));
        const user = this.configService.get<string>('MAIL_USER');
        const pass = this.configService.get<string>('MAIL_PASSWORD');

        this.mailFrom = this.configService.get<string>('MAIL_FROM');
        this.frontendUrl = this.configService.get<string>('FRONTEND_URL');
        this.backendUrl = this.configService.get<string>('BACKEND_URL');

        if (host && port && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure,
                auth: {
                    user,
                    pass,
                },
            });
        } else {
            this.transporter = null;
            this.logger.warn(
                'Mail transporter is not configured. Email sending will be skipped.',
            );
        }
    }

    async sendDoctorInvitationEmail(data: DoctorInvitationEmailData): Promise<void> {
        const acceptLink = this.buildInvitationAcceptLink(data.token);
        const rejectLink = this.buildInvitationRejectLink(data.token);

        if (!acceptLink || !rejectLink) {
            this.logger.error('Unable to build doctor invitation links. Email not sent.');
            return;
        }

        const { html, text } = buildDoctorInvitationTemplate({
            acceptLink,
            rejectLink,
            expiresAt: data.expiresAt,
        });

        await this.sendMail({
            to: data.toEmail,
            subject: "You're invited to join Clinic System as a Doctor",
            html,
            text,
        });
    }

    async sendVerificationCodeEmail(data: VerificationCodeEmailData): Promise<void> {
        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                <h2>Verification Code</h2>
                <p>Your verification code is:</p>
                <p style="font-size: 24px; font-weight: bold;">${data.code}</p>
                <p>This code expires in 15 minutes.</p>
            </div>
        `;

        const text = `Your verification code is: ${data.code}. This code expires in 15 minutes.`;

        await this.sendMail({
            to: data.toEmail,
            subject: 'Your verification code',
            html,
            text,
        });
    }

    private async sendMail(options: {
        to: string;
        subject: string;
        html: string;
        text?: string;
    }): Promise<void> {
        if (!this.transporter) {
            this.logger.error(
                `Mail transporter is not configured. Email to ${options.to} was skipped.`,
            );
            return;
        }

        if (!this.mailFrom) {
            this.logger.error('MAIL_FROM is not set. Email not sent.');
            return;
        }

        try {
            await this.transporter.sendMail({
                from: this.mailFrom,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Failed to send email to ${options.to}: ${message}`,
                stack,
            );
        }
    }

    private buildInvitationAcceptLink(token: string): string | null {
        if (!this.frontendUrl) {
            this.logger.error('FRONTEND_URL is not set.');
            return null;
        }

        const baseUrl = this.frontendUrl.replace(/\/$/, '');
        return `${baseUrl}/doctor-invite/${token}`;
    }

    private buildInvitationRejectLink(token: string): string | null {
        const baseUrl = this.backendUrl?.replace(/\/$/, '')
            ?? this.frontendUrl?.replace(/\/$/, '');

        if (!baseUrl) {
            this.logger.error('BACKEND_URL is not set for invitation rejection links.');
            return null;
        }

        if (!this.backendUrl) {
            this.logger.warn('BACKEND_URL is not set. Falling back to FRONTEND_URL for rejection links.');
        }

        return `${baseUrl}/auth/doctor-invite/${token}/reject`;
    }

    private toNumber(value: string | undefined): number | undefined {
        if (!value) {
            return undefined;
        }

        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
    }

    private toBoolean(value: string | undefined): boolean {
        return value === 'true' || value === '1';
    }
}
