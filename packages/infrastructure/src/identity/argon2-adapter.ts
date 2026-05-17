import argon2 from 'argon2';
import type { PasswordHashPort } from '@kawal/application';

export class Argon2Adapter implements PasswordHashPort {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    return argon2.verify(stored, plain);
  }
}
