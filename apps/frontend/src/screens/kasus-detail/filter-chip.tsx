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
          ? 'border-amber-pin bg-amber-pin text-board'
          : 'border-rule bg-board text-chalk-muted hover:border-chalk/40 hover:text-chalk')
      }
    >
      {label}
    </button>
  );
}
