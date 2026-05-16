import type {
  AIScope,
  ConversationAnswer,
  ConversationPort,
  ExtractedRecord,
  ExtractionPort,
  GlossaryAnswer,
  GlossaryPort,
  ProjectedScenario,
  ScenarioPort,
  VerificationOutcome,
  VerificationPort,
} from '@kawal/application';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Real Gemini SDK wiring. The structured prompts and JSON-schema responses
 * are intentionally left as TODO so the prompt design can be reviewed
 * separately; the goal here is to prove the adapter type-checks and can be
 * composed with the rest of the application.
 *
 * Every call enforces a (user, case) retrieval scope at the application
 * layer — this adapter trusts that scope and only adds the model dispatch.
 */
export class GeminiAdapter
  implements ExtractionPort, VerificationPort, ConversationPort, ScenarioPort, GlossaryPort {
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extract(_input: {
    scope: AIScope;
    sourceId: string;
    sourceTier: 'tier_1' | 'tier_2';
    documentText: string;
  }): Promise<ExtractedRecord[]> {
    // TODO: structured-output prompt for entity/claim/event/relationship extraction.
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verify(_input: { scope: AIScope; claimText: string }): Promise<VerificationOutcome> {
    // TODO: retrieval over user's dossier, then certainty classification.
    return {
      certainty: 'unverified',
      supportingSourceIds: [],
      contradictingClaimIds: [],
      rationaleBahasa: 'Dossier belum memiliki rujukan untuk klaim ini.',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async ask(_input: { scope: AIScope; question: string }): Promise<ConversationAnswer> {
    return {
      textBahasa: 'Dossier belum memuat informasi terkait pertanyaan ini.',
      citedClaimIds: [],
      citedEventIds: [],
      citedSourceIds: [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generate(_scope: AIScope): Promise<readonly ProjectedScenario[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async explain(_input: { term: string; scope: AIScope | null }): Promise<GlossaryAnswer> {
    return {
      term: _input.term,
      explainerBahasa: `Penjelasan untuk "${_input.term}" belum tersedia.`,
      statuteCitations: [],
      caseExampleEventId: null,
    };
  }
}
