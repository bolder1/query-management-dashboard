import { useMemo, type ReactNode } from 'react';
import {
  RotateCw, ExternalLink, CheckCircle2, AlertTriangle, Mail, Columns3, Filter,
  UserRound, Folder, ArrowRight, Table2, Activity, Clock, ShieldCheck, X, PartyPopper,
  Inbox, ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import {
  EMAIL_SOURCE_FIELDS, EMAIL_TARGET, useIntegrations,
  type Connection, type Provider, type ProviderId,
} from '../../contexts/IntegrationContext';
import { useFilters } from '../../contexts/FilterContext';
import { relativeTime } from './shared';
import { SyncPipeline } from './SyncPipeline';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parses the dashboard's own "04-Aug-2026" format. */
function parseDate(v: string): Date | null {
  const [d, m, y] = v.split('-');
  const mi = MONTHS.indexOf(m);
  if (!d || mi < 0 || !y) return null;
  return new Date(Number(y), mi, Number(d));
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function IntegrationOverview({
  provider,
  providerId,
  conn,
  onEditStep,
  onOpenHistory,
  onOpenConfiguration,
  onViewQueries,
}: {
  provider: Provider;
  providerId: ProviderId;
  conn: Connection;
  onEditStep: (step: number) => void;
  onOpenHistory: () => void;
  onOpenConfiguration: () => void;
  onViewQueries: () => void;
}) {
  const { runSync, firstSyncDone, acknowledgeFirstSync } = useIntegrations();
  const { allData } = useFilters();

  const lastRun = conn.runs[0];
  const mapped = conn.config.mappings.filter((m) => m.source.trim() && m.target.trim());
  const unmapped = conn.config.mappings.filter((m) => m.source.trim() && !m.target.trim());
  const filterable = mapped.filter((m) => m.filterable);
  const emailSource = EMAIL_SOURCE_FIELDS.find((f) => f.field === conn.config.emailMapping.sourceField);
  const project = conn.config.projects[0];
  const celebrate = firstSyncDone === providerId && !conn.syncing;

  /** Everything this integration has actually put on the dashboard. */
  const rows = useMemo(
    () => allData.filter((q) => q.source === provider.name),
    [allData, provider.name],
  );

  /** Records per day for the last nine days — the shape of what's arriving. */
  const series = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      const d = parseDate(r.createDate);
      if (d) counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1);
    });
    const out: { label: string; short: string; count: number }[] = [];
    for (let i = 8; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({
        label: `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}`,
        short: String(d.getDate()),
        count: counts.get(dayKey(d)) ?? 0,
      });
    }
    return out;
  }, [rows]);

  const peak = Math.max(1, ...series.map((s) => s.count));

  /** The mix that arrived, so the numbers say something about the work. */
  const byType = useMemo(() => tally(rows.map((r) => r.type)), [rows]);
  const byPriority = useMemo(() => tally(rows.map((r) => r.priority)), [rows]);
  const openReplies = rows.filter((r) => r.replyPending).length;

  const checks = buildChecks({
    emailCoverage: emailSource?.coverage,
    emailField: conn.config.emailMapping.sourceField,
    failed: lastRun?.failed ?? 0,
    unmapped: unmapped.length,
    mapped: mapped.length,
    filters: filterable.length,
    missingRequired: ['Query Title', 'Created Date', EMAIL_TARGET].filter(
      (t) => !mapped.some((m) => m.target === t),
    ),
  });
  const needsAttention = checks.filter((c) => c.tone !== 'ok');

  return (
    <div className="mt-5 space-y-4">
      {celebrate && (
        <div className="relative rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-900/25 dark:to-gray-900 p-4">
          <button
            onClick={acknowledgeFirstSync}
            aria-label="Dismiss"
            className="absolute right-3 top-3 text-emerald-600/60 hover:text-emerald-700 dark:text-emerald-400/60"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <span className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <PartyPopper className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Migration finished — {conn.totalImported} records are on your dashboard
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                Emails were read from {conn.config.emailMapping.sourceField}, {mapped.length} fields were mapped
                {filterable.length > 0 && `, and ${filterable.length} new filter${filterable.length > 1 ? 's are' : ' is'} live on Reports`}.
                From here you can watch every sync, check the data quality and change anything.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={onViewQueries}
                >
                  View imported queries
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={onOpenHistory}>
                  See the sync log
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {conn.syncing && <SyncPipeline provider={provider} conn={conn} />}

      {/* ------------------------------ Status band ----------------------------- */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-800">
          <BandCell
            label="Pipeline"
            value={conn.syncing ? 'Syncing now' : needsAttention.length ? 'Needs a look' : 'Healthy'}
            hint={
              conn.syncing
                ? `${conn.progress}% complete`
                : needsAttention.length
                  ? `${needsAttention.length} thing${needsAttention.length > 1 ? 's' : ''} to check`
                  : 'Everything mapped and flowing'
            }
            tone={conn.syncing ? 'info' : needsAttention.length ? 'warn' : 'ok'}
            icon={Activity}
          />
          <BandCell
            label="On the dashboard"
            value={conn.totalImported.toLocaleString()}
            hint={`from ${project ? project.key : provider.name} · ${rows.length} live in Query Results`}
            icon={Inbox}
          />
          <BandCell
            label="Last sync"
            value={relativeTime(lastRun?.startedAt)}
            hint={
              lastRun
                ? `${lastRun.imported} in · ${lastRun.failed} failed · ${(lastRun.durationMs / 1000).toFixed(1)}s`
                : 'No run yet'
            }
            icon={Clock}
          />
          <BandCell
            label="Access"
            value="Read-only"
            hint={`${conn.config.authMethod === 'atlassian' ? 'Atlassian sign-in' : 'API token'} · nothing written back`}
            icon={ShieldCheck}
          />
        </div>
      </div>

      {/* ------------------------------ Main / side ----------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {/* Arrival volume */}
          <Panel
            title="What's arriving"
            subtitle={`${rows.length} records from ${project ? project.name : provider.name} over the last 9 days`}
            action={<PanelLink label="Open in Query Results" onClick={onViewQueries} />}
          >
            <div className="flex items-end gap-1.5 h-28">
              {series.map((s) => (
                <div key={s.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      title={`${s.count} record${s.count === 1 ? '' : 's'} on ${s.label}`}
                      className={`w-full rounded-t transition-all ${
                        s.count ? 'bg-blue-500/85 dark:bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                      style={{ height: `${Math.max(4, (s.count / peak) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums truncate">
                    {s.short}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Split label="By type" entries={byType} />
              <Split label="By priority" entries={byPriority} />
              <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Awaiting a reply</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1.5">
                  {openReplies} of {rows.length}
                </p>
                <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${rows.length ? (openReplies / rows.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Panel>

          {/* Latest records, in the user's own columns */}
          <Panel
            title="Latest records"
            subtitle="Exactly as they landed, in the columns you mapped"
            action={<PanelLink label="Change mapping" onClick={() => onEditStep(4)} />}
          >
            {rows.length === 0 ? (
              <Empty icon={Table2} title="Nothing imported yet" body="Run a sync and the newest records show up here." />
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full min-w-[36rem]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {project ? project.key : 'Issue'}
                      </th>
                      {mapped.filter((m) => m.visible).slice(0, 4).map((m) => (
                        <th
                          key={m.id}
                          className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap"
                        >
                          {m.target}
                          {m.filterable && <Filter className="inline h-2.5 w-2.5 ml-1 text-blue-500" />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={`${r.externalId}-${i}`} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <td className="py-2 pr-3 text-xs font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {r.externalId}
                        </td>
                        {mapped.filter((m) => m.visible).slice(0, 4).map((m) => (
                          <td
                            key={m.id}
                            className="py-2 pr-3 text-xs text-gray-700 dark:text-gray-300 max-w-[14rem] truncate"
                          >
                            {cellFor(m.target, r)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Data quality */}
          <Panel
            title="Data quality"
            subtitle={
              needsAttention.length
                ? `${needsAttention.length} of ${checks.length} checks want your attention`
                : `All ${checks.length} checks are clean`
            }
          >
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 -my-1">
              {checks.map((c) => (
                <li key={c.title} className="flex items-start gap-3 py-2.5">
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      c.tone === 'ok'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : c.tone === 'warn'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {c.tone === 'ok' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-gray-900 dark:text-white">{c.title}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.body}</span>
                  </span>
                  {c.fix && (
                    <button
                      onClick={
                        c.fix.kind === 'retry'
                          ? () => { runSync(providerId, true); toast.info('Retrying failed records'); }
                          : c.fix.kind === 'configuration'
                            ? onOpenConfiguration
                            : () => onEditStep(c.fix!.step ?? 4)
                      }
                      className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                    >
                      {c.fix.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          {/* Recent runs */}
          <Panel
            title="Recent syncs"
            subtitle={conn.runs.length ? `${conn.runs.length} run${conn.runs.length > 1 ? 's' : ''} so far` : 'No runs yet'}
            action={conn.runs.length > 0 ? <PanelLink label="Full history" onClick={onOpenHistory} /> : undefined}
          >
            {conn.runs.length === 0 ? (
              <Empty icon={RotateCw} title="No syncs yet" body="Start a sync and every run is logged here." />
            ) : (
              <ul className="space-y-2">
                {conn.runs.slice(0, 3).map((run) => (
                  <li
                    key={run.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
                  >
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        run.status === 'completed' ? 'bg-emerald-500' : run.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200 min-w-0 flex-1 truncate">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                      {run.imported} in
                      {run.failed > 0 && <span className="text-red-500"> · {run.failed} failed</span>}
                      {run.durationMs > 0 && ` · ${(run.durationMs / 1000).toFixed(1)}s`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* --------------------------------- Sidebar -------------------------------- */}
        <div className="space-y-4 min-w-0">
          <Panel title="The connection" subtitle="Where the data comes from">
            <dl className="space-y-3">
              <SideRow icon={UserRound} label="Account" value={conn.config.account} onEdit={() => onEditStep(0)} />
              <SideRow icon={ExternalLink} label="Site" value={conn.config.siteUrl.replace('https://', '')} />
              <SideRow
                icon={Folder}
                label="Project"
                value={project ? `${project.name} (${project.key})` : '—'}
                sub={project ? `${project.type} · ${project.issues.toLocaleString()} issues` : undefined}
                onEdit={() => onEditStep(1)}
              />
              <SideRow
                icon={Clock}
                label="Connected"
                value={new Date(conn.connectedAt).toLocaleDateString()}
                sub={relativeTime(conn.connectedAt)}
              />
            </dl>
          </Panel>

          <Panel title="How it maps" subtitle="Jira on the left, your columns on the right">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                  {conn.config.emailMapping.sourceField || 'Not set'}
                </span>
                <ArrowRight className="h-3 w-3 text-gray-300 dark:text-gray-600 shrink-0" />
                <span className="text-xs font-medium text-gray-900 dark:text-white shrink-0">{EMAIL_TARGET}</span>
              </div>
              {mapped
                .filter((m) => m.target !== EMAIL_TARGET)
                .slice(0, 5)
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2.5">
                    <Columns3 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{m.source}</span>
                    <ArrowRight className="h-3 w-3 text-gray-300 dark:text-gray-600 shrink-0" />
                    <span className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[7rem]">
                      {m.target}
                    </span>
                  </div>
                ))}
            </div>
            {mapped.length > 6 && (
              <button
                onClick={onOpenConfiguration}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                See all {mapped.length} mappings
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </Panel>

          <Panel
            title="Filters on Reports"
            subtitle={filterable.length ? 'Added by this integration' : 'None added yet'}
            action={<PanelLink label="Edit" onClick={() => onEditStep(4)} />}
          >
            {filterable.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mark a mapped column as a filter and it appears in the Reports filter bar.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filterable.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300"
                  >
                    <Filter className="h-2.5 w-2.5" />
                    {m.target}
                  </span>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Change something" subtitle="Each one opens setup at that step">
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { label: 'Change the account', step: 0, icon: UserRound },
                { label: 'Change the project', step: 1, icon: Folder },
                { label: 'Change the email source', step: 2, icon: Mail },
                { label: 'Add or remove fields', step: 3, icon: Columns3 },
                { label: 'Rework the mapping', step: 4, icon: ArrowRight },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => onEditStep(a.step)}
                  className="group flex items-center gap-2.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-left hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/15 transition-colors"
                >
                  <a.icon className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-500 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{a.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Fragments -------------------------------- */

function tally(values: string[]) {
  const map = new Map<string, number>();
  values.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
}

/** Best-effort read of a mapped column off an imported record. */
function cellFor(target: string, row: Record<string, any>) {
  const direct: Record<string, string> = {
    'Query Title': row.subject,
    Description: row.query,
    Email: row.email,
    'Created Date': row.createDate,
    'Query Type': row.type,
    Priority: row.priority,
    Owner: row.assignee,
    Group: row.group,
    Country: row.country,
    Status: row.customerStatus,
  };
  return direct[target] ?? row.custom?.[target] ?? '—';
}

function BandCell({
  label, value, hint, icon: Icon, tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Activity;
  tone?: 'ok' | 'warn' | 'info';
}) {
  const toneCls =
    tone === 'warn'
      ? 'text-amber-600 dark:text-amber-400'
      : tone === 'info'
        ? 'text-blue-600 dark:text-blue-400'
        : tone === 'ok'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-gray-900 dark:text-white';
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
      </div>
      <p className={`text-lg font-semibold mt-1 truncate ${toneCls}`}>{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{hint}</p>
    </div>
  );
}

function Panel({
  title, subtitle, action, children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
    >
      {label}
    </button>
  );
}

function Split({ label, entries }: { label: string; entries: [string, number][] }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-gray-400 dark:text-gray-500">{label}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 mt-1.5">—</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {entries.map(([k, n]) => (
            <li key={k} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{k}</span>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200 tabular-nums shrink-0">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SideRow({
  icon: Icon, label, value, sub, onEdit,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  sub?: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] text-gray-400 dark:text-gray-500">{label}</dt>
        <dd className="text-sm text-gray-900 dark:text-white truncate">{value}</dd>
        {sub && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{sub}</p>}
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
        >
          Edit
        </button>
      )}
    </div>
  );
}

function Empty({ icon: Icon, title, body }: { icon: typeof Table2; title: string; body: string }) {
  return (
    <div className="py-8 text-center">
      <Icon className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-auto" />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{body}</p>
    </div>
  );
}

/* ------------------------------- Health checks ------------------------------ */

interface Check {
  title: string;
  body: string;
  tone: 'ok' | 'warn' | 'bad';
  fix?: { label: string; kind: 'step' | 'retry' | 'configuration'; step?: number };
}

function buildChecks(i: {
  emailCoverage?: number;
  emailField: string;
  failed: number;
  unmapped: number;
  mapped: number;
  filters: number;
  missingRequired: string[];
}): Check[] {
  const checks: Check[] = [];

  checks.push(
    i.missingRequired.length === 0
      ? {
          title: 'Every required column is fed',
          body: 'Query Title, Created Date and Email all have a Jira field behind them.',
          tone: 'ok',
        }
      : {
          title: `${i.missingRequired.join(' and ')} ${i.missingRequired.length > 1 ? 'have' : 'has'} nothing feeding ${i.missingRequired.length > 1 ? 'them' : 'it'}`,
          body: 'Query Results depends on these columns, so records will import incomplete.',
          tone: 'bad',
          fix: { label: 'Fix mapping', kind: 'step', step: 4 },
        },
  );

  if (i.emailCoverage !== undefined) {
    checks.push(
      i.emailCoverage >= 80
        ? {
            title: `${i.emailField} is filled in on ${i.emailCoverage}% of issues`,
            body: 'Almost every record arrives with a customer email attached.',
            tone: 'ok',
          }
        : {
            title: `${i.emailField} is only filled in on ${i.emailCoverage}% of issues`,
            body: 'The rest import without an email, so they cannot be threaded onto a mailbox.',
            tone: 'warn',
            fix: { label: 'Change source', kind: 'step', step: 2 },
          },
    );
  }

  checks.push(
    i.failed === 0
      ? { title: 'The last sync imported cleanly', body: 'No records were rejected.', tone: 'ok' }
      : {
          title: `${i.failed} record${i.failed > 1 ? 's' : ''} failed on the last sync`,
          body: 'They had no email address to thread onto. Fill the field in Jira, then retry.',
          tone: 'warn',
          fix: { label: 'Retry failed', kind: 'retry' },
        },
  );

  if (i.unmapped > 0) {
    checks.push({
      title: `${i.unmapped} selected field${i.unmapped > 1 ? 's are' : ' is'} not connected to a column`,
      body: 'They are being read from Jira but thrown away on import.',
      tone: 'warn',
      fix: { label: 'Connect them', kind: 'step', step: 4 },
    });
  }

  checks.push(
    i.filters > 0
      ? {
          title: `${i.filters} column${i.filters > 1 ? 's are' : ' is'} available as a Reports filter`,
          body: 'Your team can slice imported records by them straight away.',
          tone: 'ok',
        }
      : {
          title: 'No imported column is filterable yet',
          body: 'Marking one as a filter adds it to the Reports filter bar.',
          tone: 'warn',
          fix: { label: 'Review columns', kind: 'configuration' },
        },
  );

  return checks;
}
