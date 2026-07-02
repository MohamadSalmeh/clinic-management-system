import { Entity, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { DoctorProfile } from '../../doctors/entities/doctor-profile.entity';
import { PatientProfile } from '../../patients/entities/patient-profile.entity';

@Entity({ name: 'favorite_doctors' })
@Unique(['patient', 'doctor'])
export class FavoriteDoctor extends BaseEntity {
    @ManyToOne(
        () => PatientProfile,
        (patient) => patient.favoriteDoctors,
        {
            onDelete: 'CASCADE',
        },
    )
    patient!: PatientProfile;

    @ManyToOne(
        () => DoctorProfile,
        (doctor) => doctor.favoriteByPatients,
        {
            onDelete: 'CASCADE',
        },
    )
    doctor!: DoctorProfile;
}