export interface PasswordHashPort {
  hash(plain: string): Promise<string>;
  verify(plain: string, stored: string): Promise<boolean>;
}
