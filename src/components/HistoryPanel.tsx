"use client";

import { useState, useEffect } from "react";

// Mirrors CalculationEntry interface (owned by database agent — do not redefine in db files)
interface CalculationEntry {
  id: string;
  expression: string;
  result: string;
  created_at: string;
}

// Mirrors ApiResponse<T> from api agent
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// ── Mock data shown when no API / database is available ──────────────────────
const MOCK_HISTORY: CalculationEntry[] = [
  {
    id: "mock-1",
    expression: "128 × 3",
    result: "384",
    created_at: new Date(Date.now() - 55_000).toISOString(),
  },
  {
    id: "mock-2",
    expression: "1024 ÷ 8",
    result: "128",
    created_at: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: "mock-3",
    expression: "99 + 1",
    result: "100",
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: "mock-4",
    expression: "500 - 75",
    result: "425",
    created_at: new Date(Date.now() - 11 * 60_000).toISOString(),
  },
  {
    id: "mock-5",
    expression: "12 × 12",
    result: "144",
    created_at: new Date(Date.now() - 22 * 60_000).toISOString(),
  },
  {
    id: "mock-6",
    expression: "3.14159 × 100",
    result: "314.159",
    created_at: new Date(Date.now() - 38 * 60_000).toISOString(),
  },
  {
    id: "mock-7",
    expression: "7 + 3",
    result: "10",
    created_at: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 5)    return "just now";
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface HistoryPanelProps {
  /** Entries saved by the Calculator in the current session — always shown fresh at the top. */
  localHistory: CalculationEntry[];
  /** Callback to use a past result as the new input. */
  onSelectEntry?: (result: string) => void;
}

export default function HistoryPanel({
  localHistory,
  onSelectEntry,
}: HistoryPanelProps) {
  const [apiHistory, setApiHistory]   = useState<CalculationEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [usingMock, setUsingMock]     = useState(false);

  // Fetch persisted history once on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/history");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiResponse<CalculationEntry[]>;
        if (json.error || !json.data) throw new Error(json.error ?? "Empty response");
        if (!cancelled) setApiHistory(json.data);
      } catch {
        // API not available — fall back to demo data so UI looks populated
        if (!cancelled) setUsingMock(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Merge: local session entries (top) + server/mock entries (deduped by id)
  const baseHistory = usingMock ? MOCK_HISTORY : apiHistory;
  const localIds    = new Set(localHistory.map((e) => e.id));
  const merged      = [
    ...localHistory,
    ...baseHistory.filter((e) => !localIds.has(e.id)),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700/70 flex-shrink-0">
        <h2 className="text-zinc-300 text-xs font-semibold uppercase tracking-widest">
          History
        </h2>
        {usingMock && (
          <span className="text-xs text-zinc-500 italic">demo data</span>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          /* Loading spinner */
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : merged.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-2 text-center">
            <span className="text-3xl opacity-30">🧮</span>
            <p className="text-zinc-500 text-sm">No calculations yet</p>
            <p className="text-zinc-600 text-xs">Your history will appear here</p>
          </div>
        ) : (
          /* History entries */
          <ul>
            {merged.map((entry, idx) => (
              <li
                key={entry.id}
                className={`
                  px-5 py-3.5 border-b border-zinc-700/40
                  hover:bg-zinc-700/40 transition-colors group
                  ${idx === 0 ? "animate-slide-down" : ""}
                  ${onSelectEntry ? "cursor-pointer" : ""}
                `}
                onClick={() => onSelectEntry?.(entry.result)}
                title={onSelectEntry ? "Tap to reuse this result" : undefined}
              >
                {/* Expression */}
                <p className="text-zinc-400 text-sm truncate group-hover:text-zinc-300 transition-colors leading-5">
                  {entry.expression}
                </p>
                {/* Result + timestamp */}
                <div className="flex items-baseline justify-between mt-0.5">
                  <p className="text-white text-xl font-light leading-7">
                    = {entry.result}
                  </p>
                  <span className="text-zinc-600 text-xs ml-3 flex-shrink-0">
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
