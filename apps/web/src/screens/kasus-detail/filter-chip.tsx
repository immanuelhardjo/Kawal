interface FilterChipProps {
  readonly label: string;
  readonly active: boolean;
  readonly onToggle: () => void;
}

/**
 * Spec: relationship-graph "Certainty filter" / "Node-type filter",
 *       event-timeline "Timeline filters".
 *
 * A presentation chip with no `urgency` prop and no animation, per
 * presentation-principles "Cool institutional tone".
 */
export function FilterChip({ label, active, onToggle }: FilterChipProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs ' +
        (active
          ? 'border-ink bg-ink text-paper'
          : 'border-rule bg-paper text-muted hover:border-ink/40 hover:text-ink')
      }
    >
      {label}
    </button>
  );
}
