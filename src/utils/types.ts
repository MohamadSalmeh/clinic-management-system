import { UserRole } from './enums';

export type JWTPayloadType = {
  sub: number;
  email: string | null;
  usertype: Uppercase<`${UserRole}`>;
  version: number;
};

export type ActiveUserData = JWTPayloadType & {
  iat: number;
  exp: number;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string | null;
    phone: string | null;
    provider: string;
    role: UserRole;
    fullName: string;
  };
  profileCompleted: boolean;
};
