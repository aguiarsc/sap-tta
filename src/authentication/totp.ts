import { authenticator } from 'otplib';

export class TOTPGenerator {
  private secret: string;

  constructor(secret: string) {
    if (!secret) {
      throw new Error('TOTP secret is required');
    }
    this.secret = secret;
  }

  generate(): string {
    try {
      return authenticator.generate(this.secret);
    } catch (error) {
      throw new Error(`Failed to generate TOTP code: ${(error as Error).message}`);
    }
  }

  verify(token: string): boolean {
    try {
      return authenticator.verify({ token, secret: this.secret });
    } catch (error) {
      throw new Error(`Failed to verify TOTP code: ${(error as Error).message}`);
    }
  }
}
