import type { CertaintyLabel, EntityTypeDto, EventTypeDto } from '@kawal/contracts';

/**
 * Bahasa labels for filter chips and section headings. Per
 * presentation-principles, all visible strings are Bahasa Indonesia.
 */

export const CERTAINTY_LABELS_BAHASA: Record<CertaintyLabel, string> = {
  established: 'Terverifikasi',
  alleged: 'Dugaan',
  reported: 'Dilaporkan',
  disputed: 'Disengketakan',
  unverified: 'Belum terverifikasi',
};

export const NODE_TYPE_LABELS_BAHASA: Record<EntityTypeDto, string> = {
  person: 'Tokoh',
  institution: 'Institusi',
  company: 'Perusahaan',
  document: 'Dokumen',
};

export const EVENT_TYPE_LABELS_BAHASA: Record<EventTypeDto, string> = {
  hearing: 'Sidang',
  indictment: 'Dakwaan',
  verdict: 'Putusan',
  asset_seizure: 'Penyitaan',
  public_statement: 'Pernyataan publik',
  other: 'Lainnya',
};

export const ALL_CERTAINTIES: readonly CertaintyLabel[] = [
  'established',
  'alleged',
  'reported',
  'disputed',
  'unverified',
];
export const ALL_NODE_TYPES: readonly EntityTypeDto[] = ['person', 'institution', 'company', 'document'];
export const ALL_EVENT_TYPES: readonly EventTypeDto[] = [
  'hearing',
  'indictment',
  'verdict',
  'asset_seizure',
  'public_statement',
  'other',
];
