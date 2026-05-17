import { User, type UserProps } from '@kawal/domain';
import type { UserRepo } from '@kawal/application';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { users } from '../db/schema/pg.js';

export class DrizzleUserRepo implements UserRepo {
  constructor(private readonly db: Db) {}

  async findByGoogleSub(googleSub: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.googleSub, googleSub),
    });
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });
    return row ? toUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, id) });
    return row ? toUser(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.db
      .insert(users)
      .values({
        id: user.id,
        googleSub: user.googleSub,
        email: user.email,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
        lastSignedInAt: user.lastSignedInAt,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          googleSub: user.googleSub,
          email: user.email,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          passwordHash: user.passwordHash,
          lastSignedInAt: user.lastSignedInAt,
        },
      });
  }

  /**
   * Spec: user-management / "Account deletion cascades through the user's
   * dossier". With ON DELETE CASCADE configured on every owner_user_id
   * foreign key (see schema.ts), deleting the User row removes the entire
   * dossier, every revision row, every session, every audit-log entry, and
   * every subscription in a single statement.
   */
  async deleteCascade(userId: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, userId));
  }
}

function toUser(row: typeof users.$inferSelect): User {
  const props: UserProps = {
    id: row.id,
    googleSub: row.googleSub,
    email: row.email,
    displayName: row.displayName,
    pictureUrl: row.pictureUrl,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    lastSignedInAt: row.lastSignedInAt,
  };
  return User.restore(props);
}
