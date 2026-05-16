import type { CertaintyLabel } from '@kawal/contracts';

/**
 * Spec: presentation-principles / D7.
 *
 * Calm institutional pills. No animation, no urgency prop.
 */
const labelMap: Record<CertaintyLabel, string> = {
  established: 'Terverifikasi',
  alleged: 'Dugaan',
  reported: 'Dilaporkan',
  disputed: 'Disengketakan',
  unverified: 'Belum terverifikasi',
};

const classMap: Record<CertaintyLabel, string> = {
  established: 'bg-certainty-established/10 text-certainty-established border-certainty-established/30',
  alleged: 'bg-certainty-alleged/10 text-certainty-alleged border-certainty-alleged/30',
  reported: 'bg-certainty-reported/10 text-certainty-reported border-certainty-reported/30',
  disputed: 'bg-certainty-disputed/10 text-certainty-disputed border-certainty-disputed/30',
  unverified: 'bg-certainty-unverified/10 text-certainty-unverified border-certainty-unverified/30',
};

export interface CertaintyChipProps {
  readonly certainty: CertaintyLabel;
}

export function CertaintyChip({ certainty }: CertaintyChipProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${classMap[certainty]}`}
      aria-label={`Tingkat kepastian: ${labelMap[certainty]}`}
    >
      {labelMap[certainty]}
    </span>
  );
}
