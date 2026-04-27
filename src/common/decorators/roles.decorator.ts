import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { UserRole } from '../../utils';

export const ROLES_KEY = 'roles' as const;

export const Roles = (
  ...roles: readonly UserRole[]
): CustomDecorator<typeof ROLES_KEY> => SetMetadata(ROLES_KEY, roles);

