import { useMemo } from 'react';
import { useKasusDetail } from './context.js';
import { useTimeline } from './hooks.js';
import { EVENT_TYPE_LABELS_BAHASA } from './labels.js';

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function GarisWaktu(): JSX.Element {
  const { selectedEventId, actions } = useKasusDetail();
  const timeline = useTimeline();

  const events = timeline.data?.events ?? [];

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [events],
  );

  if (timeline.loading) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-chalk-muted">Memuat…</p>
      </div>
    );
  }

  if (timeline.error) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-chalk-muted">
          Tidak dapat memuat timeline: {timeline.error}
        </p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-chalk-muted">Belum ada peristiwa tercatat.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <ol className="flex min-w-max" aria-label="Garis waktu peristiwa">
        {sortedEvents.map((event, idx) => {
          const selected = event.id === selectedEventId;
          const isFirst = idx === 0;
          const isLast = idx === sortedEvents.length - 1;

          const dotCls = selected
            ? 'border-amber-pin bg-amber-pin shadow-[0_0_6px_rgba(212,160,23,0.4)]'
            : 'border-chalk-muted/40 bg-board group-hover:border-amber-pin/60';
          const dateCls = selected
            ? 'text-amber-pin'
            : 'text-chalk-muted group-hover:text-chalk';
          const titleCls = selected
            ? 'text-chalk'
            : 'text-chalk-muted/80 group-hover:text-chalk';
          const typeCls = selected ? 'text-amber-pin' : 'text-chalk-muted/50';
          const lineCls = selected ? 'bg-amber-pin/30' : 'bg-rule';
          const leftLineCls = `h-px flex-1 transition-colors ${lineCls}${isFirst ? ' opacity-0' : ''}`;
          const rightLineCls = `h-px flex-1 transition-colors ${lineCls}${isLast ? ' opacity-0' : ''}`;

          return (
            <li key={event.id} className="flex w-36 shrink-0 flex-col">
              <button
                type="button"
                onClick={() => {
                  actions.selectEvent(event.id);
                  actions.setAsOfDate(new Date(event.date));
                }}
                aria-pressed={selected}
                className="group flex w-full flex-col items-center focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-pin focus-visible:ring-offset-1 focus-visible:ring-offset-board"
              >
                {/* Date */}
                <div className="flex h-10 w-full items-end justify-center px-2 pb-1">
                  <time
                    dateTime={event.date}
                    className={`text-center text-[10px] font-medium leading-tight transition-colors ${dateCls}`}
                  >
                    {dateFmt.format(new Date(event.date))}
                  </time>
                </div>

                {/* Track */}
                <div className="flex h-5 w-full shrink-0 items-center">
                  <div className={leftLineCls} />
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 transition-all ${dotCls}`} />
                  <div className={rightLineCls} />
                </div>

                {/* Title + type */}
                <div className="flex flex-col gap-0.5 px-2 pb-3 pt-1.5 text-center">
                  <p className={`line-clamp-3 text-xs leading-tight transition-colors ${titleCls}`}>
                    {event.title}
                  </p>
                  <span className={`mt-0.5 text-[10px] transition-colors ${typeCls}`}>
                    {EVENT_TYPE_LABELS_BAHASA[event.type] ?? event.type}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
