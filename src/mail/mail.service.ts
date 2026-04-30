import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { buildDoctorInvitationTemplate } from './templates/doctor-invitation.template';

export interface DoctorInvitationEmailData {
    toEmail: string;
    token: string;
    expiresAt: Date;
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: nodemailer.Transporter | null;
    private readonly mailFrom?: string;
    private readonly frontendUrl?: string;

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('MAIL_HOST');
        const port = this.toNumber(this.configService.get<string>('MAIL_PORT'));
        const secure = this.toBoolean(this.configService.get<string>('MAIL_SECURE'));
        const user = this.configService.get<string>('MAIL_USER');
        const pass = this.configService.get<string>('MAIL_PASSWORD');

        this.mailFrom = this.configService.get<string>('MAIL_FROM');
        this.frontendUrl = this.configService.get<string>('FRONTEND_URL');

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
        const invitationLink = this.buildInvitationLink(data.token);
        if (!invitationLink) {
            this.logger.error('Unable to build doctor invitation link. Email not sent.');
            return;
        }

        const { html, text } = buildDoctorInvitationTemplate({
            invitationLink,
            expiresAt: data.expiresAt,
        });

        await this.sendMail({
            to: data.toEmail,
            subject: "You're invited to join Clinic System as a Doctor",
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

    private buildInvitationLink(token: string): string | null {
        if (!this.frontendUrl) {
            this.logger.error('FRONTEND_URL is not set.');
            return null;
        }

        const baseUrl = this.frontendUrl.replace(/\/$/, '');
        return `${baseUrl}/doctor-invite/${token}`;
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
