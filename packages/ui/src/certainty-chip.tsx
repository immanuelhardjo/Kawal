import type { CertaintyLabel } from '@kawal/contracts';

/**
 * Spec: visual-identity / "Certainty label rendered as rubber stamp".
 *
 * Stamp style: uppercase, wide tracking, zero border-radius, 2px solid border
 * in stamp colour, no filled background. No urgency/pulse props.
 */
const labelMap: Record<CertaintyLabel, string> = {
  established: 'Terverifikasi',
  alleged: 'Dugaan',
  reported: 'Dilaporkan',
  disputed: 'Disengketakan',
  unverified: 'Belum terverifikasi',
};

const classMap: Record<CertaintyLabel, string> = {
  established: 'border-stamp-verified text-stamp-verified',
  alleged: 'border-stamp-alleged text-stamp-alleged',
  reported: 'border-stamp-reported text-stamp-reported',
  disputed: 'border-stamp-disputed text-stamp-disputed',
  unverified: 'border-stamp-unverified text-stamp-unverified',
};

export interface CertaintyChipProps {
  readonly certainty: CertaintyLabel;
}

export function CertaintyChip({ certainty }: CertaintyChipProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center border-2 bg-transparent px-2 py-0.5 text-[10px] uppercase tracking-widest ${classMap[certainty]}`}
      aria-label={`Tingkat kepastian: ${labelMap[certainty]}`}
    >
      {labelMap[certainty]}
    </span>
  );
}
