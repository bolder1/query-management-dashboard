import { useEffect, useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, RotateCw, CheckCircle2, XCircle, Loader2,
  Clock, Download, AlertTriangle, Search, Inbox, Timer, FileText, type LucideIcon,
} from 'lucide-react';
import { Button } from '../ui/button';
import type { Connection, SyncRun } from '../../contexts/IntegrationContext';
import { formatTime } from './shared';
import { Pill } from '../ui/pill';

/** "Today" / "Yesterday" / "12 Feb" — the day header a run sits under. */
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS = {
  completed: { icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Completed', tone: 'ok' as const },
  running: { icon: Loader2, cls: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', label: 'Running', tone: 'info' as const },
  failed: { icon: XCircle, cls: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', label: 'Failed', tone: 'error' as const },
} as const;

/** One fact about a run, small enough to sit four-across. */
function Metric({ icon: Icon, value, tone }: { icon: LucideIcon; value: string; tone?: 'error' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
        tone === 'error'
          ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
          : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800'
      }`}
    >
      <Icon className="h-2.5 w-2.5" />
      {value}
    </span>
  );
}

/**
 * The run log, as a right-hand drawer with a list → detail push. Keeping it out
 * of the page means history is always one click away without owning a tab that
 * is empty most of the time.
 */
export function SyncHistoryDrawer({
  conn,
  open,
  onClose,
  onRetry,
}: {
  conn: Connection;
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [openRun, setOpenRun] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  /** Held separately from `open` so the panel can animate out before unmounting. */
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) { setShown(false); return; }
    // A frame's delay lets the browser paint the off-screen position first.
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (openRun) setOpenRun(null);
      else onClose();
    };
    document.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prev;
    };
  }, [open, openRun, onClose]);

  // Coming back to a closed drawer should start at the list, not the last run.
  useEffect(() => { if (!open) setOpenRun(null); }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const runs = q
    ? conn.runs.filter((r) =>
        STATUS[r.status].label.toLowerCase().includes(q) ||
        formatTime(r.startedAt).toLowerCase().includes(q) ||
        dayLabel(r.startedAt).toLowerCase().includes(q))
    : conn.runs;
  const run = runs.find((r) => r.id === openRun);

  /** Runs bucketed under their day, newest first, order preserved. */
  const groups: { day: string; runs: SyncRun[] }[] = [];
  runs.forEach((r) => {
    const day = dayLabel(r.startedAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.runs.push(r);
    else groups.push({ day, runs: [r] });
  });

  const totalImported = runs.reduce((n, r) => n + r.imported, 0);
  const totalFailed = runs.reduce((n, r) => n + r.failed, 0);

  return (
    <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-label="Sync history">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-gray-900/40 dark:bg-black/60 transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute right-0 top-0 h-full w-full max-w-[30rem] bg-white dark:bg-gray-950 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ---------------------------------- Header --------------------------------- */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 px-4 py-3">
            {run ? (
              <button
                onClick={() => setOpenRun(null)}
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                All runs
              </button>
            ) : (
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sync history</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {runs.length} run{runs.length === 1 ? '' : 's'} · {totalImported.toLocaleString()} imported
                  {totalFailed > 0 && ` · ${totalFailed} failed`}
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              aria-label="Close sync history"
              className="ml-auto h-8 w-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ----------------------------------- Body ---------------------------------- */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {runs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <span className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Clock className="h-5 w-5 text-gray-400" />
              </span>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">No syncs yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[15rem]">
                Every run will be listed here with its counts and full log.
              </p>
            </div>
          ) : run ? (
            <RunDetail run={run} onRetry={onRetry} />
          ) : (
            <>
              {/* Search, borrowed from incident.io's activity log — a long history
                  is only useful if you can find the run you remember. */}
              <div className="px-4 pt-3 pb-2 sticky top-0 z-20 bg-white dark:bg-gray-950">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search runs by status or time"
                    className="w-full h-9 pl-9 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--pill-accent-icon)] focus:border-transparent"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {groups.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  No run matches “{query.trim()}”.
                </p>
              ) : (
                groups.map((g) => (
                  <div key={g.day}>
                    <div className="sticky top-[3.75rem] z-10 flex items-center gap-2 px-4 py-1.5 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur border-y border-gray-100 dark:border-gray-800">
                      <p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">
                        {g.day.toUpperCase()}
                      </p>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {g.runs.length} run{g.runs.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {/* A timeline rail, so a day of runs reads as a sequence
                        rather than a stack of unrelated rows. */}
                    <ol className="relative pl-9 pr-4 py-3 space-y-2.5">
                      <span
                        className="absolute left-[1.4rem] top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-800"
                        aria-hidden="true"
                      />
                      {g.runs.map((r) => {
                        const s = STATUS[r.status];
                        return (
                          <li key={r.id} className="relative">
                            <span
                              className={`absolute -left-[1.35rem] top-4 h-2 w-2 rounded-full ring-4 ring-white dark:ring-gray-950 ${s.dot} ${
                                r.status === 'running' ? 'animate-pulse' : ''
                              }`}
                              aria-hidden="true"
                            />
                            <button
                              onClick={() => setOpenRun(r.id)}
                              className="group w-full text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <Pill tone={s.tone} size="xs" icon={s.icon}>{s.label}</Pill>
                                <span className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                                  {formatTime(r.startedAt)}
                                </span>
                                <ChevronRight className="ml-auto h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                              </div>

                              {/* The metric row, ElevenLabs style: everything you
                                  need to triage a run without opening it. */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <Metric icon={Inbox} value={`${r.imported} imported`} />
                                {r.failed > 0 && <Metric icon={AlertTriangle} value={`${r.failed} failed`} tone="error" />}
                                {r.durationMs > 0 && <Metric icon={Timer} value={`${(r.durationMs / 1000).toFixed(1)}s`} />}
                                <Metric icon={FileText} value={`${r.logs.length} log lines`} />
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Run detail -------------------------------- */

function RunDetail({ run, onRetry }: { run: SyncRun; onRetry: () => void }) {
  const s = STATUS[run.status];
  const Icon = s.icon;

  const copyLog = () => {
    const text = run.logs
      .map((l) => `${formatTime(l.time)} [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard?.writeText(text);
  };

  return (
    <div>
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${s.cls} ${run.status === 'running' ? 'animate-spin' : ''}`} />
          <p className={`text-sm font-semibold ${s.cls}`}>{s.label}</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {new Date(run.startedAt).toLocaleString()}
        </p>

        <dl className="grid grid-cols-3 gap-2 mt-3.5">
          {[
            { label: 'Imported', value: run.imported.toLocaleString() },
            { label: 'Failed', value: run.failed.toLocaleString() },
            { label: 'Duration', value: run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—' },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-gray-200 dark:border-gray-800 px-2.5 py-2">
              <dt className="text-[11px] text-gray-400 dark:text-gray-500">{m.label}</dt>
              <dd className="text-base font-semibold text-gray-900 dark:text-white tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>

        {run.failed > 0 && run.status === 'completed' && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 flex-1">
              {run.failed} record{run.failed > 1 ? 's' : ''} had no email address to thread onto.
            </p>
            <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={onRetry}>
              <RotateCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <p className="text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500">
          LOG · {run.logs.length} LINES
        </p>
        <button
          onClick={copyLog}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          <Download className="h-3 w-3" />
          Copy
        </button>
      </div>

      <ol className="px-4 pb-6 space-y-1">
        {run.logs.map((l, i) => (
          <li
            key={i}
            className={`font-mono text-[11px] leading-relaxed flex gap-2 ${
              l.level === 'error'
                ? 'text-red-600 dark:text-red-400'
                : l.level === 'warn'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <span className="text-gray-400 dark:text-gray-600 shrink-0">{formatTime(l.time)}</span>
            <span className="min-w-0 break-words">{l.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
