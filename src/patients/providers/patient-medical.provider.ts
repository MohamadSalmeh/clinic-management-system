import { ForbiddenException, Injectable } from '@nestjs/common';
import { MedicalProfile } from '../../medical-profiles/entities/medical-profile.entity';
import { ActiveUserData } from '../../utils';
import { PatientProfile } from '../entities/patient-profile.entity';
import { UpdatePatientDto } from '../dto';

@Injectable()
export class PatientMedicalProvider {
  assertPatientOwnership(activeUser: ActiveUserData, targetUserId: number): void {
    const activeUserId = Number(activeUser.sub);

    if (activeUser.usertype === 'PATIENT' && activeUserId !== targetUserId) {
      throw new ForbiddenException('Patients can only access their own medical data');
    }
  }

  buildPatientProfilePatch(updateData: UpdatePatientDto): Partial<PatientProfile> {
    const patch: Partial<PatientProfile> = {};

    if (updateData.maritalStatus !== undefined) {
      patch.maritalStatus = updateData.maritalStatus;
    }

    if (updateData.occupation !== undefined) {
      patch.occupation = updateData.occupation;
    }

    if (updateData.emergencyContactName !== undefined) {
      patch.emergencyContactName = updateData.emergencyContactName;
    }

    if (updateData.emergencyContactPhone !== undefined) {
      patch.emergencyContactPhone = updateData.emergencyContactPhone;
    }

    return patch;
  }

 

  
}
