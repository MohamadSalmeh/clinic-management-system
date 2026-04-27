import { UserRole } from './enums';

export type JWTPayloadType = {
  sub: number;
  email: string;
  usertype: Uppercase<`${UserRole}`>;
  version: number;
};

export type ActiveUserData = JWTPayloadType & {
  iat: number;
  exp: number;
};

export type AuthResponse = {
  accessToken: string;
  user: {
    id: number;
    email: string;
    role: UserRole;
    fullName: string;
  };
};
