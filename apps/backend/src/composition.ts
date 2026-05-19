import {
  AdvanceLifecycle,
  AskQuestion,
  ComputeWhatChanged,
  CreateCase,
  DeleteAccount,
  ExplainTerm,
  ExportMyDossier,
  GenerateBriefing,
  GenerateScenarios,
  GetConversationHistory,
  GetTimeline,
  GetVisibleGraph,
  LabelClusters,
  ScanGlossaryBacklog,
  SignInWithGoogle,
  SignInWithPassword,
  SignOut,
  SignUpWithPassword,
  SubscribeToCase,
  VerifyClaim,
  type ClusterLabelPort,
  type ConversationPort,
  type GlossaryPort,
  type IdentityProviderPort,
  type ScenarioPort,
  type VerificationPort,
} from '@kawal/application';
import {
  Argon2Adapter,
  DrizzleAuditLogRepo,
  DrizzleCaseRepo,
  DrizzleClaimRepo,
  DrizzleConversationHistoryRepo,
  DrizzleEntityRepo,
  DrizzleEventRepo,
  DrizzleRelationshipRepo,
  DrizzleSessionStore,
  DrizzleSourceRepo,
  DrizzleSubscriptionRepo,
  DrizzleUserRepo,
  GeminiAdapter,
  GoogleOidcAdapter,
  StubImageCardAdapter,
  StubNotebookLMAdapter,
  createDb,
} from '@kawal/infrastructure';
import type { Env } from './env.js';
import { newId } from './util/id.js';

export interface Composition {
  readonly env: Env;
  readonly idp: GoogleOidcAdapter | null;
  readonly sessions: DrizzleSessionStore;
  readonly users: DrizzleUserRepo;
  readonly cases: DrizzleCaseRepo;
  readonly subscriptions: DrizzleSubscriptionRepo;
  readonly entities: DrizzleEntityRepo;
  readonly sources: DrizzleSourceRepo;
  readonly claims: DrizzleClaimRepo;
  readonly events: DrizzleEventRepo;
  readonly relationships: DrizzleRelationshipRepo;
  readonly audit: DrizzleAuditLogRepo;
  readonly gemini: GeminiAdapter | null;
  readonly notebookLm: StubNotebookLMAdapter;
  readonly cards: StubImageCardAdapter;

  readonly signInWithGoogle: SignInWithGoogle;
  readonly signInWithPassword: SignInWithPassword;
  readonly signUpWithPassword: SignUpWithPassword;
  readonly signOut: SignOut;
  readonly deleteAccount: DeleteAccount;
  readonly exportMyDossier: ExportMyDossier;
  readonly createCase: CreateCase;
  readonly advanceLifecycle: AdvanceLifecycle;
  readonly subscribeToCase: SubscribeToCase;
  readonly computeWhatChanged: ComputeWhatChanged;
  readonly getTimeline: GetTimeline;
  readonly getVisibleGraph: GetVisibleGraph;
  readonly conversationHistory: DrizzleConversationHistoryRepo;
  readonly verifyClaim: VerifyClaim;
  readonly askQuestion: AskQuestion;
  readonly getConversationHistory: GetConversationHistory;
  readonly generateBriefing: GenerateBriefing;
  readonly generateScenarios: GenerateScenarios;
  readonly labelClusters: LabelClusters;
  readonly explainTerm: ExplainTerm;
  readonly scanGlossaryBacklog: ScanGlossaryBacklog;
}

/**
 * Fallback AI ports used when GEMINI_API_KEY is not set in the env. Each
 * fallback satisfies the spec's "every AI call is scoped" requirement by
 * being a deterministic no-op rather than an unscoped call — the application
 * layer already validated (user, case) before reaching the port.
 */
const noopIdp: IdentityProviderPort = {
  beginAuthorization: async () => {
    throw new Error('Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.');
  },
  completeAuthorization: async () => {
    throw new Error('Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.');
  },
};

const noopVerification: VerificationPort = {
  verify: async () => ({
    certainty: 'unverified',
    supportingSourceIds: [],
    contradictingClaimIds: [],
    rationaleBahasa: 'Modul verifikasi AI belum aktif untuk dossier ini.',
  }),
};
const noopConversation: ConversationPort = {
  ask: async () => ({
    textBahasa: 'Modul tanya jawab AI belum aktif untuk dossier ini.',
    citedClaimIds: [],
    citedEventIds: [],
    citedSourceIds: [],
  }),
};
const noopScenarios: ScenarioPort = {
  generate: async () => [],
};
interface ClusterLabelInput {
  readonly scope: { userId: string; caseId: string };
  readonly clusters: readonly { signatureHash: string; memberEntityIds: readonly string[] }[];
}
const noopClusterLabel: ClusterLabelPort = {
  label: async (input: ClusterLabelInput) =>
    input.clusters.map((c) => ({
      signatureHash: c.signatureHash,
      labelBahasa: `Kelompok (${c.memberEntityIds.length} entitas)`,
      memberEntityIds: [...c.memberEntityIds],
    })),
};
interface GlossaryInput {
  readonly term: string;
  readonly scope: { userId: string; caseId: string } | null;
}
const noopGlossary: GlossaryPort = {
  explain: async (input: GlossaryInput) => ({
    term: input.term,
    explainerBahasa: `Penjelasan untuk "${input.term}" belum tersedia.`,
    statuteCitations: [],
    caseExampleEventId: null,
  }),
};

export interface CompositionWithClose extends Composition {
  readonly close: () => Promise<void>;
}

export function compose(env: Env): CompositionWithClose {
  const { db, close } = createDb(env.DATABASE_URL, env.DATABASE_TYPE);
  const users = new DrizzleUserRepo(db);
  const sessions = new DrizzleSessionStore(db);
  const cases = new DrizzleCaseRepo(db);
  const subscriptions = new DrizzleSubscriptionRepo(db);
  const audit = new DrizzleAuditLogRepo(db);
  const entities = new DrizzleEntityRepo(db);
  const sources = new DrizzleSourceRepo(db);
  const claims = new DrizzleClaimRepo(db);
  const events = new DrizzleEventRepo(db);
  const relationships = new DrizzleRelationshipRepo(db);
  const conversationHistory = new DrizzleConversationHistoryRepo(db);

  const idp =
    env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REDIRECT_URI
      ? new GoogleOidcAdapter({
          clientId: env.GOOGLE_OAUTH_CLIENT_ID,
          clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
          redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
        })
      : null;

  const gemini = env.GEMINI_API_KEY ? new GeminiAdapter(env.GEMINI_API_KEY) : null;
  const notebookLm = new StubNotebookLMAdapter();
  const cards = new StubImageCardAdapter();

  const verifier: VerificationPort = gemini ?? noopVerification;
  const conversation: ConversationPort = gemini ?? noopConversation;
  const scenarios: ScenarioPort = gemini ?? noopScenarios;
  const clusterLabeler: ClusterLabelPort = noopClusterLabel;
  const glossary: GlossaryPort = gemini ?? noopGlossary;

  const now = () => new Date();

  return {
    env,
    idp,
    sessions,
    users,
    cases,
    subscriptions,
    entities,
    sources,
    claims,
    events,
    relationships,
    audit,
    conversationHistory,
    gemini,
    notebookLm,
    cards,

    signInWithGoogle: new SignInWithGoogle({ idp: idp ?? noopIdp, users, sessions, audit, newId, now }),
    signInWithPassword: new SignInWithPassword({ users, sessions, audit, passwordHash: new Argon2Adapter(), newId, now }),
    signUpWithPassword: new SignUpWithPassword({ users, sessions, audit, passwordHash: new Argon2Adapter(), newId, now }),
    signOut: new SignOut({ sessions, audit, newId, now }),
    deleteAccount: new DeleteAccount({ users, audit, newId, now }),
    exportMyDossier: new ExportMyDossier({ cases, subscriptions }),
    createCase: new CreateCase({ cases, audit, newId, now }),
    advanceLifecycle: new AdvanceLifecycle({ cases, audit, newId, now }),
    subscribeToCase: new SubscribeToCase({ cases, subscriptions, newId, now }),
    computeWhatChanged: new ComputeWhatChanged({ cases, subscriptions, events }),
    verifyClaim: new VerifyClaim({ cases, verifier }),
    askQuestion: new AskQuestion({ cases, conversation, conversationHistory, newId }),
    getConversationHistory: new GetConversationHistory({ cases, conversationHistory }),
    generateBriefing: new GenerateBriefing({ cases, briefer: notebookLm }),
    generateScenarios: new GenerateScenarios({ cases, scenarios }),
    labelClusters: new LabelClusters({ cases, clusterLabeler }),
    explainTerm: new ExplainTerm({ cases, glossary }),
    scanGlossaryBacklog: new ScanGlossaryBacklog(),
    getTimeline: new GetTimeline({ cases, events }),
    getVisibleGraph: new GetVisibleGraph({ cases, entities, relationships }),
    close,
  };
}
