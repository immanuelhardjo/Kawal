import type { User } from '@kawal/domain';

export interface UserRepo {
  findByGoogleSub(googleSub: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  /**
   * Cascade-delete: removes the User row and every aggregate, revision, session,
   * subscription, ingest-activity row, and audit-log entry owned by this user.
   * Implemented as a single transaction in the infrastructure adapter.
   */
  deleteCascade(userId: string): Promise<void>;
}
