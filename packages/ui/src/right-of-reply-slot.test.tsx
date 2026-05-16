import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RightOfReplySlot } from './right-of-reply-slot.js';

/**
 * Spec: presentation-principles / "Right-of-reply asymmetry never silently rendered",
 *       entity-dossier / "Right-of-reply auto-population".
 *
 * The slot must always render — even when no statement is on file — with a
 * dated empty fallback in Bahasa Indonesia.
 */
describe('RightOfReplySlot', () => {
  it('renders the dated empty fallback in Bahasa when no statement is present', () => {
    render(<RightOfReplySlot statement={null} asOf={new Date('2024-06-15T00:00:00Z')} />);
    expect(
      screen.getByText(/Belum ada tanggapan publik tercatat per/i),
    ).toBeInTheDocument();
  });

  it('exposes the section landmark for screen readers', () => {
    const { container } = render(
      <RightOfReplySlot statement={null} asOf={new Date('2024-06-15T00:00:00Z')} />,
    );
    expect(container.querySelector('section[aria-label="Hak jawab"]')).not.toBeNull();
  });

  it('renders the statement when provided', () => {
    render(
      <RightOfReplySlot
        statement={{
          text: 'Saya membantah tuduhan tersebut.',
          sourceId: 'src_1',
          publisher: 'Kompas',
          publishedAt: new Date('2024-06-01T00:00:00Z'),
        }}
        asOf={new Date('2024-06-15T00:00:00Z')}
      />,
    );
    expect(screen.getByText('Saya membantah tuduhan tersebut.')).toBeInTheDocument();
  });
});
