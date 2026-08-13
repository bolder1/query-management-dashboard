import { useEffect, useRef, useState } from 'react';
import {
  Check, ShieldCheck, Loader2, Minimize2, X, ArrowRight, PartyPopper, AlertTriangle,
} from 'lucide-react';
import {
  PROVIDERS, SYNC_PHASES, useIntegrations, type SyncPhase,
} from '../../contexts/IntegrationContext';
import { sampleValue } from './sampleData';

/**
 * The first import, reported rather than performed.
 *
 * What this replaces was a fourteen-second cinematic: a fixed timeline of
 * captions and flying cards that ran to completion and *then* did the work.
 * That is fine for a job that takes fourteen seconds and a lie for one that
 * takes ten minutes — the bar would fill, the confetti would land, and the
 * import would not have started.
 *
 * So the run starts with the screen and the screen reads it. Every number here
 * is the actual run: the stage it is in, the records it has written, how long
 * it has taken, and — from those two — a remaining estimate that is a division
 * rather than a guess.
 *
 * The other thing every serious importer does, and this did not: let you
 * leave. Zoho emails you, Contractbook puts the run in the sidebar, HubSpot
 * tells you to get on with your day. Nobody is asked to watch a progress bar
 * for ten minutes. "Run in the background" closes this and the import carries
 * on; the integration's page keeps reporting it.
 */

/** The stages, minus the terminal one — that is the done state, not a step. */
const STAGES = SYNC_PHASES.filter((p) => p.id !== 'done');

/** Rows visible in the "filling up" table. */
const PREVIEW_ROWS = 6;

function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

/** Rounded up and hedged — a precise estimate from a moving average is a lie. */
function remaining(ms: number) {
  const s = Math.round(ms / 1000);
  if (s <= 5) return 'almost done';
  if (s < 60) return `about ${Math.ceil(s / 5) * 5} seconds left`;
  const m = Math.ceil(s / 60);
  return `about ${m} minute${m === 1 ? '' : 's'} left`;
}

export function MigrationTakeover() {
  const { migrating, connections, finishMigration, cancelSync } = useIntegrations();
  const conn = migrating ? connections[migrating] : undefined;
  const provider = PROVIDERS.find((p) => p.id === migrating);

  const [now, setNow] = useState(() => Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!migrating) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [migrating]);

  useEffect(() => {
    if (!migrating) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [migrating]);

  const processed = conn?.processed ?? 0;

  /** Keep the newest row in view as the table fills. */
  useEffect(() => {
    const box = scroller.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [processed]);

  if (!migrating || !conn || !provider) return null;

  const done = !conn.syncing && conn.progress >= 100;
  const stopped = !conn.syncing && conn.progress < 100;
  const stageIndex = STAGES.findIndex((s) => s.id === conn.phase);
  const current = stageIndex < 0 ? STAGES.length - 1 : stageIndex;

  /*
   * Elapsed comes off the run, not off this component. This is mounted for the
   * whole session and only renders when a migration is on, so timing it from
   * first render clocked the age of the browser tab — and the estimate divided
   * by it, which is how a twenty-second import came to claim two minutes.
   */
  const run = conn.runs.find((r) => r.status === 'running') ?? conn.runs[0];
  const startedAt = run ? new Date(run.startedAt).getTime() : now;
  const elapsed = !conn.syncing && run?.durationMs ? run.durationMs : now - startedAt;
  const eta = conn.progress > 4 && conn.syncing
    ? (elapsed / conn.progress) * (100 - conn.progress)
    : null;

  const project = conn.config.projects[0];
  const columns = conn.config.mappings.filter((m) => m.visible && m.source.trim()).slice(0, 4);
  const landed = Math.min(processed, PREVIEW_ROWS);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#080b12] text-white">
      {/* One idea only: a flow axis, left to right, with a light travelling it. */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ background: 'radial-gradient(120% 90% at 50% 0%, #101828 0%, #080b12 60%)' }}
      />

      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* --------------------------------- Header ------------------------------- */}
        <header className="shrink-0 flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: provider.color }}
            >
              {provider.initials}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                Importing from {provider.name}
              </p>
              <p className="text-xs text-white/45 truncate">
                {project ? `${project.name} (${project.key})` : 'Your project'} · read-only
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/80 shrink-0">
            <ShieldCheck className="h-3 w-3" />
            Nothing is written back to {provider.name}
          </span>
        </header>

        {/* --------------------------------- Body --------------------------------- */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          <div className="mx-auto w-full max-w-3xl">
            {/* Headline: what is happening, and how far in */}
            <div className="pt-6 sm:pt-10">
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-blue-300/70">
                {done ? 'Finished' : stopped ? 'Stopped' : `Step ${current + 1} of ${STAGES.length}`}
              </p>
              <h1 className="text-2xl lg:text-[30px] leading-tight font-semibold mt-2 flex items-center gap-3">
                {done
                  ? 'Your dashboard is ready'
                  : stopped
                    ? 'Import stopped'
                    : STAGES[current].label}
                {conn.syncing && <Loader2 className="h-5 w-5 animate-spin text-blue-300 shrink-0" />}
              </h1>
              <p className="text-sm text-white/50 mt-2">
                {done
                  ? `${conn.totalImported.toLocaleString()} records are on your dashboard.`
                  : stopped
                    ? `${processed.toLocaleString()} records were written before it stopped. They are safe — you can run the sync again whenever you like.`
                    : 'You can leave this running and carry on — we will keep importing in the background.'}
              </p>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="tabular-nums font-semibold">{Math.round(conn.progress)}%</span>
                <span className="text-white/45 tabular-nums">
                  {conn.syncing ? (eta ? remaining(eta) : 'estimating…') : clock(elapsed)}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                    stopped ? 'bg-amber-400' : 'bg-gradient-to-r from-blue-400 to-emerald-400'
                  }`}
                  style={{ width: `${Math.max(2, conn.progress)}%` }}
                />
              </div>
            </div>

            {/* The numbers — the thing you actually want during a long wait */}
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-6 rounded-xl overflow-hidden bg-white/10">
              <Stat label="In scope" value={project ? project.issues.toLocaleString() : '—'} />
              <Stat
                label="Imported"
                value={conn.target ? `${processed.toLocaleString()} / ${conn.target.toLocaleString()}` : processed.toLocaleString()}
                live={conn.syncing}
              />
              <Stat label="Columns" value={String(conn.config.mappings.filter((m) => m.source.trim()).length)} />
              <Stat label="Elapsed" value={clock(elapsed)} />
            </dl>

            {/* Stages */}
            <ol className="mt-6 rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
              {STAGES.map((stage, i) => {
                const state = done || i < current ? 'done' : i === current && conn.syncing ? 'running' : 'waiting';
                return (
                  <li key={stage.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="shrink-0">
                      {state === 'done' ? (
                        <span className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </span>
                      ) : state === 'running' ? (
                        <Loader2 className="h-5 w-5 text-blue-300 animate-spin" />
                      ) : (
                        <span className="h-5 w-5 rounded-full border border-white/20" />
                      )}
                    </span>
                    <span
                      className={`text-sm flex-1 min-w-0 truncate ${
                        state === 'waiting' ? 'text-white/35' : 'text-white/90'
                      }`}
                    >
                      {stage.label}
                    </span>
                    <span className="text-xs text-white/40 tabular-nums shrink-0 hidden sm:block">
                      {stageNote(stage.id, conn.config.account, project?.issues, conn.config.mappings.length, processed)}
                    </span>
                  </li>
                );
              })}
            </ol>

            {/* The table filling up — the same one they built, now with real rows */}
            {columns.length > 0 && (
              <div className="mt-6 rounded-xl border border-white/10 overflow-hidden">
                <p className="px-4 py-2 text-xs text-white/45 border-b border-white/10">
                  {done ? 'What landed' : 'Landing in Query Results…'}
                </p>
                <div ref={scroller} className="max-h-52 overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {columns.map((m) => (
                          <th
                            key={m.id}
                            className="sticky top-0 z-10 bg-[#0d1220] text-left px-3 py-2 text-[11px] font-semibold text-white/55 whitespace-nowrap border-b border-white/10"
                          >
                            {m.label || m.target}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: landed }).map((_, i) => (
                        <tr key={i} className="qm-row-in border-b border-white/5 last:border-0">
                          {columns.map((m) => (
                            <td
                              key={m.id}
                              className="px-3 py-2 text-[13px] text-white/75 whitespace-nowrap max-w-[14rem] truncate"
                            >
                              {sampleValue(m.source, i)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {landed === 0 && (
                        <tr>
                          <td colSpan={columns.length} className="px-3 py-6 text-center text-[13px] text-white/30">
                            Waiting for the first records…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --------------------------------- Footer -------------------------------- */}
        <footer className="shrink-0 border-t border-white/10 bg-black/20">
          <div className="mx-auto w-full max-w-3xl flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
            {done ? (
              <>
                <p className="flex items-center gap-2 text-sm text-emerald-300 min-w-0">
                  <PartyPopper className="h-4 w-4 shrink-0" />
                  Imported in {clock(elapsed)}
                </p>
                <button
                  onClick={finishMigration}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90 transition-colors"
                >
                  See your dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : stopped ? (
              <>
                <p className="flex items-center gap-2 text-sm text-amber-300 min-w-0">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Stopped at {Math.round(conn.progress)}%
                </p>
                <button
                  onClick={finishMigration}
                  className="shrink-0 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 hover:bg-white/90 transition-colors"
                >
                  Back to the integration
                </button>
              </>
            ) : confirmCancel ? (
              <>
                <p className="text-sm text-white/70 min-w-0">
                  Stop the import? The {processed.toLocaleString()} records already written will stay.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Keep going
                  </button>
                  <button
                    onClick={() => { cancelSync(migrating); setConfirmCancel(false); }}
                    className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
                  >
                    Stop import
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-white/45 min-w-0 truncate">
                  This keeps running if you close it.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Stop
                  </button>
                  <button
                    onClick={finishMigration}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                    Run in the background
                  </button>
                </div>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="bg-[#0b101c] px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-white/40 flex items-center gap-1.5">
        {label}
        {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      </dt>
      <dd className="text-lg font-semibold tabular-nums mt-0.5">{value}</dd>
    </div>
  );
}

/** The detail under each stage — what it actually did, not a generic caption. */
function stageNote(
  id: SyncPhase,
  account: string,
  inScope: number | undefined,
  columns: number,
  processed: number,
) {
  switch (id) {
    case 'connecting': return 'Secure channel';
    case 'authenticating': return account;
    case 'fetching': return inScope ? `${inScope.toLocaleString()} issues` : '';
    case 'mapping': return `${columns} column${columns === 1 ? '' : 's'}`;
    case 'importing': return processed ? `${processed.toLocaleString()} written` : '';
    default: return '';
  }
}
