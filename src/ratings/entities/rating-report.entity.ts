import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';
import { Rating } from './rating.entity';
import { ReportReason, ReportStatus } from '../enums/report-status.enum';
@Entity({ name: 'rating_reports' })
@Unique(['ratingId', 'reporterPatientId']) // منع نفس المريض من الإبلاغ عن نفس التقييم مرتين
export class RatingReport extends BaseEntity {
  @Index()
  @Column({ name: 'rating_id', type: 'bigint' })
  ratingId!: number;

  @Index()
  @Column({ name: 'reporter_patient_id', type: 'bigint' })
  reporterPatientId!: number;

  @Column({ type: 'enum', enum: ReportReason })
  reason!: ReportReason;

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status!: ReportStatus;

  // أضف هذين العمودين داخل كلاس RatingReport
  @Column({
    name: 'resolved_at',
    type: 'timestamp',
    nullable: true,
  })
  resolvedAt!: Date | null;

  @Column({
    name: 'resolved_by_admin_id',
    type: 'bigint',
    nullable: true,
  })
  resolvedByAdminId!: number | null;

  @ManyToOne(() => Rating)
  @JoinColumn({ name: 'rating_id' })
  rating!: Rating;

  @ManyToOne(() => PatientProfile)
  @JoinColumn({ name: 'reporter_patient_id' })
  reporterPatient!: PatientProfile;
}
