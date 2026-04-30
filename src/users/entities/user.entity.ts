import {
	Column,
	Entity,
	OneToMany,
	OneToOne,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { AdminProfile } from '../../admins/entities/admin-profile.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';
import { AgeGroup } from '../enums/age-group.enum';
import { Gender } from '../enums/gender.enum';
import { PreferredLanguage } from '../enums/preferredLanguage.enum';
import { ThemeMode } from '../enums/themeMode.enum';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { MedicalProfileLog } from '../../medical-profile-logs/entities/medical-profile-log.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';

@Entity({ name: 'users' })
export class User extends BaseEntity {

	@Column({ type: 'varchar', length: 255, unique: true })
	email!: string;

	@Column({ type: 'varchar', length: 50, default: 'local' })
	provider!: string;

	@Column({
		name: 'provider_id',
		type: 'varchar',
		length: 255,
		nullable: true,
		unique: true,
	})
	providerId!: string | null;

	@Column({ type: 'varchar', select: false, nullable: true })
	@Exclude({ toPlainOnly: true })
	password!: string | null;

	@Column({ type: 'varchar', length: 20, nullable: true })
	phone!: string | null;

	@Column({ name: 'preferred_language', type: 'enum', enum: PreferredLanguage, default: PreferredLanguage.AR })
	preferredLanguage!: PreferredLanguage;

	@Column({ name: 'theme_mode', type: 'enum', enum: ThemeMode, default: ThemeMode.SYSTEM })
	themeMode!: ThemeMode;

	@Column({ name: 'first_name', type: 'varchar', length: 100 })
	firstName!: string;

	@Column({ name: 'father_name', type: 'varchar', length: 100, nullable: true })
	fatherName!: string | null;

	@Column({ name: 'last_name', type: 'varchar', length: 100 })
	lastName!: string;

	@Column({ name: 'birth_date', type: 'date', nullable: true })
	birthDate!: Date | null;

	@Column({ type: 'enum', enum: Gender, nullable: true })
	gender!: Gender | null;

	@Column({ type: 'text', nullable: true })
	address!: string | null;

	@Column({ name: 'avatar_url', type: 'text', nullable: true })
	avatarUrl?: string | null;

	@Column({ name: 'is_verified', type: 'boolean', default: false })
	isVerified!: boolean;

	@Column({
		type: 'enum',
		enum: UserRole,
		default: UserRole.PATIENT,
	})
	role!: UserRole;

	@Column({
		type: 'enum',
		enum: UserStatus,
		default: UserStatus.ACTIVE,
	})
	status!: UserStatus;

	@Expose({ name: 'full_name' })
	get fullName(): string {
		const nameParts = [this.firstName, this.fatherName, this.lastName].filter(
			(part): part is string => Boolean(part),
		);

		return nameParts.join(' ').replace(/\s+/g, ' ').trim();
	}

	@Expose()
	get age(): number {
		if (!this.birthDate) {
			return 0;
		}
		const birthDate = new Date(this.birthDate);
		const now = new Date();
		let age = now.getFullYear() - birthDate.getFullYear();
		const monthDiff = now.getMonth() - birthDate.getMonth();

		if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
			age -= 1;
		}

		return Math.max(age, 0);
	}

	@Expose({ name: 'age_group' })
	get ageGroup(): AgeGroup {
		const currentAge = this.age;

		if (currentAge < 13) {
			return AgeGroup.CHILD;
		}

		if (currentAge < 20) {
			return AgeGroup.TEEN;
		}

		if (currentAge < 60) {
			return AgeGroup.ADULT;
		}

		return AgeGroup.SENIOR;
	}

	@OneToOne(
		() => PatientProfile,
		(patientProfile) => patientProfile.user,
		{ nullable: true },
	)
	patientProfile?: PatientProfile | null;

	@OneToOne(
		() => DoctorProfile,
		(doctorProfile) => doctorProfile.user,
		{ nullable: true },
	)
	doctorProfile?: DoctorProfile | null;

	@OneToOne(
		() => AdminProfile,
		(adminProfile) => adminProfile.user,
		{ nullable: true },
	)
	adminProfile?: AdminProfile | null;

	@OneToMany(() => Notification, (notification) => notification.user)
	notifications!: Notification[];

	@OneToOne(
		() => Wallet,
		(wallet) => wallet.user
	)
	wallet?: Wallet | null;

	
}
