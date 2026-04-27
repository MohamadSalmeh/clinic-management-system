import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActiveUserData } from '../../utils';

@Injectable()
export class UserAccessProvider {
  assertCanUpdateTarget(currentUser: ActiveUserData, targetUserId: number): void {
    const currentUserId = Number(currentUser.sub);

    if (currentUser.usertype === 'PATIENT' && currentUserId !== targetUserId) {
      throw new ForbiddenException('Patients can only update their own profile');
    }
  }
}
