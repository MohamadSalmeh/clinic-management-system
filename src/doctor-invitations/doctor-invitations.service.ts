import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { DoctorInvitation } from './entities/doctor-invitation.entity';
import { DoctorInvitationStatus } from './enums/doctor-invitation-status.enum';

const INVITATION_TTL_DAYS = parseInt(process.env.DOCTOR_INVITATION_TTL_DAYS || '7', 10);
const TOKEN_GENERATION_MAX_ATTEMPTS = 3;

@Injectable()
export class DoctorInvitationsService {
    constructor(
        @InjectRepository(DoctorInvitation)
        private readonly invitationRepository: Repository<DoctorInvitation>,
        private readonly mailService: MailService,
    ) { }

    async createInvitation(
        email: string,
        invitedByAdminId: number | null,
    ): Promise<DoctorInvitation> {
        const normalizedEmail = this.normalizeEmail(email);

        const existingInvitation = await this.invitationRepository.findOne({
            where: {
                email: normalizedEmail,
                status: DoctorInvitationStatus.PENDING,
            },
        });

        if (existingInvitation) {
            throw new ConflictException('An active invitation already exists for this email');
        }

        const invitation = this.invitationRepository.create({
            email: normalizedEmail,
            token: await this.generateUniqueToken(),
            status: DoctorInvitationStatus.PENDING,
            expiresAt: this.getExpirationDate(),
            invitedByAdminId,
        });

        const savedInvitation = await this.invitationRepository.save(invitation);
        await this.sendInvitationEmail(savedInvitation);

        return savedInvitation;
    }

    async listInvitations(): Promise<DoctorInvitation[]> {
        return this.invitationRepository.find({
            order: { created_at: 'DESC' },
        });
    }

    async cancelInvitation(id: number): Promise<DoctorInvitation> {
        const invitation = await this.invitationRepository.findOne({ where: { id } });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.status !== DoctorInvitationStatus.PENDING) {
            throw new BadRequestException('Only pending invitations can be cancelled');
        }

        invitation.status = DoctorInvitationStatus.CANCELLED;

        return this.invitationRepository.save(invitation);
    }

    async getValidInvitationByToken(token: string): Promise<DoctorInvitation> {
        const invitation = await this.invitationRepository.findOne({
            where: { token },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.status !== DoctorInvitationStatus.PENDING) {
            throw new BadRequestException('Invitation is not pending');
        }

        if (this.isExpired(invitation)) {
            invitation.status = DoctorInvitationStatus.EXPIRED;
            await this.invitationRepository.save(invitation);
            throw new BadRequestException('Invitation has expired');
        }

        return invitation;
    }

    async markAccepted(
        invitation: DoctorInvitation,
        doctorUserId: number,
    ): Promise<DoctorInvitation> {
        invitation.status = DoctorInvitationStatus.ACCEPTED;
        invitation.doctorUserId = doctorUserId;

        return this.invitationRepository.save(invitation);
    }

    async sendInvitationEmail(invitation: DoctorInvitation): Promise<void> {
        await this.mailService.sendDoctorInvitationEmail({
            toEmail: invitation.email,
            token: invitation.token,
            expiresAt: invitation.expiresAt,
        });
    }

    private normalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    private getExpirationDate(): Date {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);
        return expiresAt;
    }

    private isExpired(invitation: DoctorInvitation): boolean {
        return invitation.expiresAt.getTime() <= Date.now();
    }

    private async generateUniqueToken(): Promise<string> {
        for (let attempt = 0; attempt < TOKEN_GENERATION_MAX_ATTEMPTS; attempt += 1) {
            const token = randomBytes(32).toString('hex');
            const existing = await this.invitationRepository.findOne({
                where: { token },
            });

            if (!existing) {
                return token;
            }
        }

        throw new ConflictException('Failed to generate invitation token');
    }
}
