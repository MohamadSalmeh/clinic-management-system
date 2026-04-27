import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthSessionProvider {
  private readonly revokedTokens = new Set<string>();

  revokeToken(token: string): void {
    this.revokedTokens.add(token);
  }

  isTokenRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }
}
