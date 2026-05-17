import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CertaintyChip } from './certainty-chip.js';

/**
 * Spec: presentation-principles + visual-identity stamp convention.
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

  it('renders as a stamp: uppercase tracking, border-2, no rounded corners, no bg', () => {
    render(<CertaintyChip certainty="established" />);
    const chip = screen.getByText('Terverifikasi');
    expect(chip.className).toMatch(/uppercase/);
    expect(chip.className).toMatch(/tracking-widest/);
    expect(chip.className).toMatch(/border-2/);
    expect(chip.className).toMatch(/bg-transparent/);
    expect(chip.className).not.toMatch(/rounded/);
  });

  it('applies the correct stamp colour class per certainty level', () => {
    const cases = [
      ['established', 'border-stamp-verified'],
      ['alleged', 'border-stamp-alleged'],
      ['reported', 'border-stamp-reported'],
      ['disputed', 'border-stamp-disputed'],
      ['unverified', 'border-stamp-unverified'],
    ] as const;
    for (const [value, expectedClass] of cases) {
      const { unmount } = render(<CertaintyChip certainty={value} />);
      const chip = screen.getByRole('generic', { name: new RegExp(value === 'established' ? 'Terverifikasi' : value === 'alleged' ? 'Dugaan' : value === 'reported' ? 'Dilaporkan' : value === 'disputed' ? 'Disengketakan' : 'Belum terverifikasi') });
      expect(chip.className).toMatch(expectedClass);
      unmount();
    }
  });
});
