import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, Database, ArrowRight, Table2, Sparkles, ShieldCheck, Loader2,
} from 'lucide-react';
import {
  PROVIDERS, SYNC_BATCH_SIZE, useIntegrations, type Connection, type Provider,
} from '../../contexts/IntegrationContext';
import { sampleValue } from './sampleData';

/** The whole show runs to 30s, then the overview takes over. */
const TOTAL_MS = 30_000;

type PhaseId = 'connect' | 'extract' | 'map' | 'write' | 'done';

const PHASES: { id: PhaseId; at: number; label: string; note: string }[] = [
  { id: 'connect', at: 0, label: 'Secure channel', note: 'Authenticating and opening a read-only session' },
  { id: 'extract', at: 3_000, label: 'Extract', note: 'Reading issues and their fields out of Jira' },
  { id: 'map', at: 12_000, label: 'Transform', note: 'Applying your field mapping, row by row' },
  { id: 'write', at: 20_000, label: 'Load', note: 'Writing records into your Query Results table' },
  { id: 'done', at: 27_000, label: 'Ready', note: 'Everything is in — opening your dashboard' },
];

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Progress of a single phase, 0-1. */
function phaseProgress(elapsed: number, i: number) {
  const start = PHASES[i].at;
  const end = i + 1 < PHASES.length ? PHASES[i + 1].at : TOTAL_MS;
  return Math.min(1, Math.max(0, (elapsed - start) / (end - start)));
}

export function MigrationTakeover() {
  const { migrating, connections, finishMigration } = useIntegrations();
  const conn = migrating ? connections[migrating] : undefined;
  const provider = PROVIDERS.find((p) => p.id === migrating);

  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);
  const finishRef = useRef(finishMigration);
  finishRef.current = finishMigration;

  /**
   * One clock drives every counter and reveal. It reads elapsed time from the
   * wall clock rather than accumulating frames, and a hard timeout guarantees
   * the finish — a background tab throttles timers, and rAF stops entirely, so
   * neither may be relied on to land the last tick.
   */
  useEffect(() => {
    if (!migrating) return;
    const start = Date.now();
    const done = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      finishRef.current();
    };
    const timer = window.setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      if (e >= TOTAL_MS) { window.clearInterval(timer); done(); }
    }, 40);
    const guard = window.setTimeout(done, TOTAL_MS + 200);
    return () => { window.clearInterval(timer); window.clearTimeout(guard); };
  }, [migrating]);

  // Nothing behind the takeover should scroll while it owns the screen.
  useEffect(() => {
    if (!migrating) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [migrating]);

  if (!migrating || !conn || !provider) return null;

  const phaseIndex = PHASES.reduce((acc, p, i) => (elapsed >= p.at ? i : acc), 0);
  const phase = PHASES[phaseIndex];
  const overall = Math.min(100, (elapsed / TOTAL_MS) * 100);

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-[#080b16] text-white">
      <Keyframes />

      {/* Depth: a slow drifting grid and two soft light sources */}
      <div className="qm-grid absolute inset-0 opacity-[0.18]" aria-hidden="true" />
      <div
        className="absolute -top-40 left-1/4 h-[34rem] w-[34rem] rounded-full blur-[130px] opacity-40"
        style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-52 right-1/5 h-[34rem] w-[34rem] rounded-full blur-[130px] opacity-30"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative h-full flex flex-col">
        <Header provider={provider} conn={conn} elapsed={elapsed} onSkip={() => {
          if (!doneRef.current) { doneRef.current = true; finishMigration(); }
        }} />

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-6 py-6 lg:py-10">
            <Rail conn={conn} provider={provider} elapsed={elapsed} phaseIndex={phaseIndex} />

            <div className="mt-8 lg:mt-10" role="status" aria-live="polite">
              <p className="text-xs font-semibold tracking-[0.2em] text-blue-300/80 uppercase">
                Step {phaseIndex + 1} of {PHASES.length} · {phase.label}
              </p>
              <h1 className="text-2xl lg:text-[32px] leading-tight font-semibold mt-2">
                {phase.id === 'connect' && 'Opening a secure channel to Jira'}
                {phase.id === 'extract' && 'Extracting your Jira issues'}
                {phase.id === 'map' && 'Mapping Jira fields onto your columns'}
                {phase.id === 'write' && 'Writing records into Query Results'}
                {phase.id === 'done' && 'Your Jira data has landed'}
              </h1>
              <p className="text-sm text-white/60 mt-2">{phase.note}</p>
            </div>

            <div className="mt-6">
              {phase.id === 'connect' && <ConnectStage conn={conn} p={phaseProgress(elapsed, 0)} />}
              {phase.id === 'extract' && <ExtractStage conn={conn} p={phaseProgress(elapsed, 1)} />}
              {phase.id === 'map' && <MapStage conn={conn} p={phaseProgress(elapsed, 2)} />}
              {phase.id === 'write' && <WriteStage conn={conn} p={phaseProgress(elapsed, 3)} />}
              {phase.id === 'done' && <DoneStage conn={conn} p={phaseProgress(elapsed, 4)} />}
            </div>
          </div>
        </div>

        <Footer elapsed={elapsed} overall={overall} phaseIndex={phaseIndex} />
      </div>
    </div>
  );
}

/* --------------------------------- Chrome --------------------------------- */

function Header({
  provider, conn, elapsed, onSkip,
}: {
  provider: Provider;
  conn: Connection;
  elapsed: number;
  onSkip: () => void;
}) {
  const project = conn.config.projects[0];
  return (
    <div className="shrink-0 border-b border-white/10">
      <div className="mx-auto w-full max-w-5xl px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-9 w-9 rounded-lg flex items-center justify-center text-[13px] font-bold shrink-0"
            style={{ backgroundColor: provider.color }}
          >
            {provider.initials}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              Migrating {project ? `${project.name} (${project.key})` : provider.name}
            </p>
            <p className="text-xs text-white/50 truncate">
              {conn.config.siteUrl.replace('https://', '')} → Query Management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <ShieldCheck className="h-3 w-3" />
            Read-only
          </span>
          <span className="text-xs tabular-nums text-white/40">
            {Math.min(30, Math.ceil(elapsed / 1000))}s / 30s
          </span>
          <button
            onClick={onSkip}
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

function Footer({ elapsed, overall, phaseIndex }: { elapsed: number; overall: number; phaseIndex: number }) {
  return (
    <div className="shrink-0 border-t border-white/10 bg-black/20">
      <div className="mx-auto w-full max-w-5xl px-6 py-4">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400"
            style={{ width: `${overall}%` }}
          />
        </div>
        <ol className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {PHASES.map((p, i) => {
            const done = i < phaseIndex || elapsed >= TOTAL_MS;
            const current = i === phaseIndex && elapsed < TOTAL_MS;
            return (
              <li key={p.id} className="flex items-center gap-1.5">
                <span
                  className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                    done
                      ? 'bg-emerald-400 text-[#080b16]'
                      : current
                        ? 'bg-white text-[#080b16]'
                        : 'border border-white/25 text-white/40'
                  }`}
                >
                  {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                </span>
                <span
                  className={`text-xs ${
                    current ? 'text-white font-medium' : done ? 'text-white/60' : 'text-white/35'
                  }`}
                >
                  {p.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------- The rail --------------------------------- */

function Rail({
  conn, provider, elapsed, phaseIndex,
}: {
  conn: Connection;
  provider: Provider;
  elapsed: number;
  phaseIndex: number;
}) {
  const project = conn.config.projects[0];
  const mapped = conn.config.mappings.filter((m) => m.source.trim() && m.target.trim());
  const issues = project?.issues ?? 1284;
  const scanned = Math.round(easeOut(phaseProgress(elapsed, 1)) * issues);
  const written = Math.round(easeOut(phaseProgress(elapsed, 3)) * SYNC_BATCH_SIZE);

  const nodes = [
    {
      key: 'source',
      icon: Database,
      title: provider.name,
      sub: project ? project.key : 'Source',
      stat: phaseIndex >= 1 ? `${scanned.toLocaleString()} issues read` : 'Connecting…',
      lit: phaseIndex >= 1,
    },
    {
      key: 'engine',
      icon: Sparkles,
      title: 'Mapping engine',
      sub: `${mapped.length} field${mapped.length === 1 ? '' : 's'}`,
      stat: phaseIndex >= 2 ? 'Transforming' : 'Waiting',
      lit: phaseIndex >= 2,
    },
    {
      key: 'target',
      icon: Table2,
      title: 'Query Results',
      sub: 'Your dashboard',
      stat: phaseIndex >= 3 ? `${written} records written` : 'Standing by',
      lit: phaseIndex >= 3,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
      {nodes.map((n, i) => (
        <div key={n.key} className="contents">
          <div
            className={`rounded-2xl border p-4 transition-colors duration-500 ${
              n.lit
                ? 'border-white/25 bg-white/[0.08] shadow-[0_0_40px_-12px_rgba(59,130,246,0.55)]'
                : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  n.lit ? 'bg-blue-500/90' : 'bg-white/10'
                }`}
              >
                <n.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{n.title}</p>
                <p className="text-[11px] text-white/45 truncate">{n.sub}</p>
              </div>
            </div>
            <p className={`text-xs mt-3 tabular-nums ${n.lit ? 'text-blue-200' : 'text-white/35'}`}>
              {n.stat}
            </p>
          </div>

          {i < nodes.length - 1 && (
            <Connector active={phaseIndex >= i + 1 && phaseIndex < 4} />
          )}
        </div>
      ))}
    </div>
  );
}

/** The travelling packets between two nodes. */
function Connector({ active }: { active: boolean }) {
  return (
    <div className="relative h-8 sm:h-10 sm:w-16 flex items-center justify-center" aria-hidden="true">
      <span className="absolute left-0 right-0 top-1/2 h-px bg-white/15 hidden sm:block" />
      <span className="absolute top-0 bottom-0 left-1/2 w-px bg-white/15 sm:hidden" />
      {active &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="qm-packet absolute h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_10px_2px_rgba(147,197,253,0.7)]"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        ))}
      <ArrowRight className={`relative h-3.5 w-3.5 ${active ? 'text-blue-300' : 'text-white/25'}`} />
    </div>
  );
}

/* -------------------------------- Stages ---------------------------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 lg:p-5">
      {children}
    </div>
  );
}

function ConnectStage({ conn, p }: { conn: Connection; p: number }) {
  const steps = [
    `Resolving ${conn.config.siteUrl.replace('https://', '')}`,
    `Authenticating as ${conn.config.account}`,
    'Verifying read-only scopes',
  ];
  return (
    <Card>
      <ul className="space-y-3">
        {steps.map((s, i) => {
          const done = p > (i + 1) / steps.length;
          const active = !done && p > i / steps.length;
          return (
            <li key={s} className="flex items-center gap-3">
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                  done ? 'bg-emerald-400 text-[#080b16]' : 'border border-white/25'
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              </span>
              <span className={`text-sm ${done || active ? 'text-white/90' : 'text-white/35'}`}>{s}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ExtractStage({ conn, p }: { conn: Connection; p: number }) {
  const project = conn.config.projects[0];
  const issues = project?.issues ?? 1284;
  const scanned = Math.round(easeOut(p) * issues);
  const key = project?.key ?? 'ITS';

  // A rolling window of issue keys, so the stream reads as continuous work.
  const stream = useMemo(() => Array.from({ length: 7 }, (_, i) => i), []);
  const head = Math.floor(p * 42);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-4">
      <Card>
        <p className="text-xs text-white/45">Issues read from {key}</p>
        <p className="text-[40px] leading-none font-semibold tabular-nums mt-2">
          {scanned.toLocaleString()}
        </p>
        <p className="text-xs text-white/40 mt-1">of {issues.toLocaleString()}</p>
        <div className="h-1 rounded-full bg-white/10 mt-4 overflow-hidden">
          <div className="h-full rounded-full bg-blue-400" style={{ width: `${easeOut(p) * 100}%` }} />
        </div>
        <p className="text-[11px] text-white/40 mt-3">
          Nothing is written back — Jira is only ever read.
        </p>
      </Card>

      <Card>
        <div className="space-y-1.5">
          {stream.map((i) => {
            const n = head + i;
            const summary = sampleValue('Summary', n);
            return (
              <div
                key={`${n}-${i}`}
                className="qm-rise flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className="text-[11px] font-mono text-blue-300 shrink-0 w-16 truncate">
                  {key}-{1024 + n}
                </span>
                <span className="text-xs text-white/80 truncate flex-1">{summary}</span>
                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function MapStage({ conn, p }: { conn: Connection; p: number }) {
  const mapped = conn.config.mappings.filter((m) => m.source.trim() && m.target.trim());
  const shown = mapped.slice(0, 9);
  return (
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {shown.map((m, i) => {
          const lit = p > i / Math.max(shown.length, 1);
          return (
            <div
              key={m.id}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 transition-all duration-500 ${
                lit ? 'bg-white/[0.06]' : 'opacity-30'
              }`}
            >
              <span className="text-xs text-white/70 truncate flex-1 text-right">{m.source}</span>
              <span className="relative h-px w-8 bg-white/20 shrink-0">
                <span
                  className={`absolute inset-y-0 left-0 bg-blue-400 transition-[width] duration-500 ${
                    lit ? 'w-full' : 'w-0'
                  }`}
                />
              </span>
              <ArrowRight className={`h-3 w-3 shrink-0 ${lit ? 'text-blue-300' : 'text-white/20'}`} />
              <span className={`text-xs truncate flex-1 ${lit ? 'text-white font-medium' : 'text-white/40'}`}>
                {m.target}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-white/40 mt-4">
        Emails are read from{' '}
        <span className="text-white/70">{conn.config.emailMapping.sourceField || 'your chosen field'}</span> and
        land in the Email column.
      </p>
    </Card>
  );
}

function WriteStage({ conn, p }: { conn: Connection; p: number }) {
  const columns = conn.config.mappings
    .filter((m) => m.visible && m.target.trim())
    .slice(0, 5);
  const written = Math.round(easeOut(p) * SYNC_BATCH_SIZE);
  const rows = 6;

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-white/70">
            <span className="text-xl font-semibold tabular-nums text-white">{written}</span> records written
          </p>
          <p className="text-[11px] text-white/40">
            First sync takes the most recent batch — later syncs pick up where this one stops.
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem]">
            <thead>
              <tr className="border-b border-white/10">
                {columns.map((m) => (
                  <th
                    key={m.id}
                    className="text-left px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 whitespace-nowrap"
                  >
                    {m.target}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, r) => {
                const visible = p > r / rows;
                return (
                  <tr
                    key={r}
                    className={`border-b border-white/5 transition-opacity duration-300 ${
                      visible ? 'qm-rise opacity-100' : 'opacity-0'
                    }`}
                  >
                    {columns.map((m) => (
                      <td
                        key={m.id}
                        className="px-2.5 py-2 text-xs text-white/75 whitespace-nowrap max-w-[13rem] truncate"
                      >
                        {sampleValue(m.source, r)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DoneStage({ conn, p }: { conn: Connection; p: number }) {
  const mapped = conn.config.mappings.filter((m) => m.source.trim() && m.target.trim());
  const filters = mapped.filter((m) => m.filterable);
  const tiles = [
    { label: 'Records imported', value: String(SYNC_BATCH_SIZE) },
    { label: 'Columns mapped', value: String(mapped.length) },
    { label: 'Filters added', value: String(filters.length) },
    { label: 'Written back to Jira', value: 'Nothing' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className="qm-rise rounded-2xl border border-white/12 bg-white/[0.06] p-4"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <p className="text-[11px] text-white/45">{t.label}</p>
            <p className="text-2xl font-semibold mt-1 tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3">
        <span className="h-8 w-8 rounded-full bg-emerald-400 text-[#080b16] flex items-center justify-center shrink-0">
          <Check className="h-4 w-4" />
        </span>
        <p className="text-sm text-emerald-100 flex-1 min-w-0">
          Migration complete. Opening your {conn.config.projects[0]?.name ?? 'integration'} overview…
        </p>
        <span className="relative h-7 w-7 shrink-0">
          <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-white/15" />
            <circle
              cx="18" cy="18" r="15" fill="none" strokeWidth="3" strokeLinecap="round"
              className="stroke-emerald-300"
              strokeDasharray={94.2}
              strokeDashoffset={94.2 * (1 - p)}
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

/** Keyframes kept with the component so the takeover is self-contained. */
function Keyframes() {
  return (
    <style>{`
      @keyframes qm-packet {
        0%   { transform: translateX(-28px); opacity: 0; }
        15%  { opacity: 1; }
        85%  { opacity: 1; }
        100% { transform: translateX(28px); opacity: 0; }
      }
      @keyframes qm-rise {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes qm-pan {
        from { background-position: 0 0; }
        to   { background-position: 44px 44px; }
      }
      .qm-packet { animation: qm-packet 1.35s linear infinite; }
      .qm-rise   { animation: qm-rise .45s ease-out both; }
      .qm-grid {
        background-image:
          linear-gradient(to right, rgba(255,255,255,.16) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,.16) 1px, transparent 1px);
        background-size: 44px 44px;
        animation: qm-pan 6s linear infinite;
        mask-image: radial-gradient(ellipse at 50% 40%, #000 20%, transparent 72%);
      }
      @media (prefers-reduced-motion: reduce) {
        .qm-packet, .qm-rise, .qm-grid { animation: none; }
        .qm-rise { opacity: 1; transform: none; }
      }
    `}</style>
  );
}
