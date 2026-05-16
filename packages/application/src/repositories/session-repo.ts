export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

export interface SessionRepo {
  create(input: {
    id: string;
    userId: string;
    now: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<SessionRecord>;
  findById(sessionId: string): Promise<SessionRecord | null>;
  touch(sessionId: string, now: Date): Promise<void>;
  deleteById(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(beforeLastSeenAt: Date): Promise<number>;
}
