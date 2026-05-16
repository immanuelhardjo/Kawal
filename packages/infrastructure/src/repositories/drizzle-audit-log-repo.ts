import type { AuditEntry, AuditLogRepo } from '@kawal/application';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { auditLog } from '../db/schema/pg.js';

export class DrizzleAuditLogRepo implements AuditLogRepo {
  constructor(private readonly db: Db) {}

  async append(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLog).values({
      id: entry.id,
      kind: entry.kind,
      userId: entry.userId,
      aggregateType: entry.aggregateType,
      aggregateId: entry.aggregateId,
      revisionNo: entry.revisionNo,
      ip: entry.ip,
      userAgent: entry.userAgent,
      reason: entry.reason,
      at: entry.at,
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.delete(auditLog).where(eq(auditLog.userId, userId));
  }
}
