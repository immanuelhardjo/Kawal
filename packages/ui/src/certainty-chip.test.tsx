import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CertaintyChip } from './certainty-chip.js';

/**
 * Spec: presentation-principles + ai-assistance Bahasa labels.
 */
describe('<CertaintyChip>', () => {
  it('renders the Bahasa label for each certainty value', () => {
    const cases = [
      ['established', 'Terverifikasi'],
      ['alleged', 'Dugaan'],
      ['reported', 'Dilaporkan'],
      ['disputed', 'Disengketakan'],
      ['unverified', 'Belum terverifikasi'],
    ] as const;
    for (const [value, label] of cases) {
      const { unmount } = render(<CertaintyChip certainty={value} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });
});
