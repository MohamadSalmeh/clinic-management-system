import { Expose } from 'class-transformer';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { BaseEntity } from '../../common/entities/base.entity';
import { DoctorClinic } from '../../doctor-clinics/entities/doctor-clinic.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { ClinicStatus } from '../enums/clinic-status.enum';
import { DoctorSchedule } from '../../doctor-schedules/entities/doctor-schedule.entity';
import { Queue } from '../../queues/entities/queue.entity';

@Entity({ name: 'clinics' })
export class Clinic extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'text' })
    description!: string;

    @Column({ type: 'text' })
    location!: string;

    @Column({ type: 'enum', enum: ClinicStatus, default: ClinicStatus.ACTIVE })
    status!: ClinicStatus;

    @OneToMany(() => DoctorClinic, (assignment) => assignment.clinic)
    doctorAssignments!: DoctorClinic[];

    @OneToMany(() => DoctorSchedule, (schedule) => schedule.clinic)
    schedules!: DoctorSchedule[];

    @OneToMany(() => Appointment, (appointment) => appointment.clinic)
    appointments!: Appointment[];

    @OneToMany(() => Queue, (queue) => queue.clinic)
    queues!: Queue[];

    @Expose({ name: 'doctors_count' })
    get doctorsCount(): number {
        return this.doctorAssignments?.length || 0;
    }
}
