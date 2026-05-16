import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Fact } from './fact.js';

/**
 * Spec: presentation-principles / "Sumber dulu, opini belakangan" + D7.
 *
 * The `<Fact.*>` primitive must place the certainty chip and the source
 * link BEFORE the summary text in DOM order, so a screen reader (and
 * sighted reader) encounters the provenance before any interpretation.
 */
describe('<Fact.Claim>', () => {
  it('renders certainty + source before the summary text in DOM order', () => {
    const { container } = render(
      <Fact.Claim
        certainty="established"
        sources={[{ id: 'src_1', publisher: 'Kompas' }]}
      >
        <p>Klaim ini terverifikasi melalui dokumen resmi.</p>
      </Fact.Claim>,
    );
    const root = container.querySelector('article');
    expect(root).not.toBeNull();
    const certaintyChip = root!.querySelector('[aria-label^="Tingkat kepastian"]');
    const sourceLink = root!.querySelector('[aria-label^="Lihat sumber"]');
    const summary = root!.querySelector('p');
    expect(certaintyChip).not.toBeNull();
    expect(sourceLink).not.toBeNull();
    expect(summary).not.toBeNull();
    const order = [...root!.querySelectorAll('*')];
    const certaintyIndex = order.indexOf(certaintyChip!);
    const sourceIndex = order.indexOf(sourceLink!);
    const summaryIndex = order.indexOf(summary!);
    expect(certaintyIndex).toBeLessThan(summaryIndex);
    expect(sourceIndex).toBeLessThan(summaryIndex);
  });
});
