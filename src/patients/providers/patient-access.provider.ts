import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActiveUserData } from '../../utils';

@Injectable()
export class PatientAccessProvider {
  assertCanAccessProfile(activeUser: ActiveUserData, targetUserId: number): void {
    const activeUserId = Number(activeUser.sub);

    if (activeUser.usertype === 'PATIENT' && activeUserId !== targetUserId) {
      throw new ForbiddenException('Patients can only access their own profile');
    }
  }
}
