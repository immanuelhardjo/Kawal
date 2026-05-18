import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCaseHistory, type CaseHistoryEntry } from '../lib/case-history.js';

export function CaseHistorySidebar(): JSX.Element {
  const [history, setHistory] = useState<CaseHistoryEntry[]>([]);
  const location = useLocation();

  // Re-read history whenever the route changes (a new case may have been pushed).
  useEffect(() => {
    setHistory(getCaseHistory());
  }, [location.pathname]);

  return (
    <nav
      className="hidden lg:flex w-52 shrink-0 flex-col border-r border-cork-shadow overflow-hidden"
      style={{
        backgroundColor: '#C19A6B',
        backgroundImage:
          'repeating-linear-gradient(92deg, transparent, transparent 2px, rgba(120,80,30,0.06) 2px, rgba(120,80,30,0.06) 3px)',
      }}
      aria-label="Riwayat kasus"
    >
      <div className="border-b border-cork-shadow px-3 py-3">
        <span className="text-xs font-medium uppercase tracking-widest text-wood">
          Riwayat
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {history.length === 0 ? (
          <li className="px-3 py-2 text-xs text-wood opacity-60">
            Belum ada kasus yang dibuka.
          </li>
        ) : (
          history.map((entry) => (
            <li key={entry.id}>
              <Link
                to={`/kasus/${entry.id}`}
                className="flex items-center gap-2 px-3 py-2 text-xs text-wood hover:bg-cork-shadow/20 transition-colors"
              >
                {/* Amber pin marker */}
                <span
                  className="inline-block shrink-0 rounded-full bg-amber-pin"
                  style={{ width: 7, height: 7 }}
                  aria-hidden="true"
                />
                <span className="truncate font-mono">{entry.name}</span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </nav>
  );
}
