import type {
  AIScope,
  AudioBriefing,
  BriefingPort,
  ReconciliationPort,
} from '@kawal/application';

/**
 * NotebookLM does not currently expose a stable public SDK; this adapter
 * implements the port shape so the application layer can call it, and the
 * audio path falls back to text per the ai-assistance spec.
 *
 * Real wiring will land in a follow-up change.
 */
export class StubNotebookLMAdapter implements ReconciliationPort, BriefingPort {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async reconcile(_scope: AIScope) {
    return { mergeProposals: [], conflictProposals: [] };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generate(_scope: AIScope): Promise<AudioBriefing> {
    return {
      kind: 'text_fallback',
      textBahasa:
        'Tidak ada perubahan baru pada dossier kasus ini sejak terakhir kali Anda meninjau.',
      audioUrl: null,
      durationSeconds: null,
    };
  }
}
