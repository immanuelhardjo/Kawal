/**
 * Spec: glosarium / "Tier-3 backlog scan is request-time and user-scoped".
 *
 * Tracer-bullet implementation: returns the empty list. The real
 * collector pulls Tier-3 social-trend signals and turns them into a
 * per-user backlog row; persistence lands in a follow-up change.
 *
 * The use case still exists at this seam so the HTTP route in section 5
 * can call it, and so the contract test in section 12.7 can prove that no
 * cross-user surface exists (the only allowed caller is the requesting
 * user).
 */
export interface ScanGlossaryBacklogDeps {
  // No external dependencies yet — the real version takes a Tier-3 collector
  // adapter that's not bundled into this tracer bullet.
}

export interface GlossaryBacklogEntry {
  readonly term: string;
  readonly hitCount: number;
}

export class ScanGlossaryBacklog {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly _deps: ScanGlossaryBacklogDeps = {}) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_input: { userId: string }): Promise<readonly GlossaryBacklogEntry[]> {
    return [];
  }
}
