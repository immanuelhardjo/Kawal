import type { CertaintyLabel } from '@kawal/contracts';
import type { ReactNode } from 'react';
import { CertaintyChip } from './certainty-chip.js';
import { SourceLink } from './source-link.js';

/**
 * Spec: presentation-principles D7 + "Sumber dulu, opini belakangan".
 *
 * Every fact-bearing record renders via one of these primitives. The
 * `certainty` and `source` props are required at the type level; the DOM
 * order places the chip and source link BEFORE the summary text.
 */

export interface FactSourceRef {
  readonly id: string;
  readonly publisher: string;
}

interface FactRowProps {
  readonly certainty: CertaintyLabel;
  readonly sources: readonly [FactSourceRef, ...FactSourceRef[]];
  readonly children: ReactNode;
  readonly onSourceOpen?: (sourceId: string) => void;
}

function FactRow({ certainty, sources, children, onSourceOpen }: FactRowProps): JSX.Element {
  return (
    <article className="border-b border-rule py-3">
      <header className="mb-1.5 flex flex-wrap items-center gap-2">
        <CertaintyChip certainty={certainty} />
        {sources.map((s) => (
          <SourceLink key={s.id} sourceId={s.id} publisher={s.publisher} onOpen={onSourceOpen} />
        ))}
      </header>
      <div className="prose-doc text-ink">{children}</div>
    </article>
  );
}

export const Fact = {
  Claim: FactRow,
  Event: FactRow,
  RelationshipEdge: FactRow,
};
