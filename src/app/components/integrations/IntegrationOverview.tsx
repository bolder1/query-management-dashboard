import { useMemo, type ReactNode } from 'react';
import {
  ExternalLink, Mail, Columns3, UserRound, Folder, Table2, Clock,
  ShieldCheck, X, PartyPopper, ChevronRight, CheckCircle2, AlertTriangle,
  Database, History, Pencil,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  EMAIL_SOURCE_FIELDS, EMAIL_TARGET, useIntegrations,
  type Connection, type Provider, type ProviderId,
} from '../../contexts/IntegrationContext';
import { useFilters } from '../../contexts/FilterContext';
import { relativeTime } from './shared';
import { SyncPipeline } from './SyncPipeline';

/**
 * What this integration is and what it has done, across the whole page.
 *
 * The old overview was one card in a 64rem column: seven label-and-value rows
 * in a two-column list, on a screen twice that wide. Everything was technically
 * present and nothing was findable — the account sat in the same visual register
 * as the last sync time, which is a fact you check daily, and both looked like
 * the read-only notice, which nobody needs twice.
 *
 * So it is banded by how often you look at something. A row of numbers at the
 * top for the things you check at a glance; the wiring underneath, where it can
 * sit quietly; and the health of the last run beside it, because that is the
 * only part that ever asks you to do anything.
 */
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
  const { firstSyncDone, acknowledgeFirstSync } = useIntegrations();
  const { allData } = useFilters();

  const lastRun = conn.runs.find((r) => r.status === 'completed') ?? conn.runs[0];
  const mapped = conn.config.mappings.filter((m) => m.source.trim() && m.target.trim());
  const filterable = mapped.filter((m) => m.filterable);
  const hidden = mapped.filter((m) => !m.visible);
  const emailSource = EMAIL_SOURCE_FIELDS.find((f) => f.field === conn.config.emailMapping.sourceField);
  const project = conn.config.projects[0];
  const celebrate = firstSyncDone === providerId && !conn.syncing;

  const rows = useMemo(
    () => allData.filter((q) => q.source === provider.name),
    [allData, provider.name],
  );

  const failed = lastRun?.failed ?? 0;

  return (
    <div className="space-y-5">
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
                Emails were read from {conn.config.emailMapping.sourceField} and {mapped.length} fields were mapped.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onViewQueries}>
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

      {/* ------------------------------ At a glance ----------------------------- */}
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700">
        <Metric
          icon={Database}
          label="On your dashboard"
          value={conn.totalImported.toLocaleString()}
          hint={`${rows.length.toLocaleString()} showing in Query Results`}
          action={{ label: 'View', onClick: onViewQueries }}
        />
        <Metric
          icon={Clock}
          label="Last sync"
          value={relativeTime(lastRun?.startedAt)}
          hint={lastRun ? `${lastRun.imported} imported${failed ? ` · ${failed} failed` : ''}` : 'No run yet'}
          action={{ label: 'History', onClick: onOpenHistory }}
        />
        <Metric
          icon={Columns3}
          label="Columns"
          value={String(mapped.length)}
          hint={
            [
              filterable.length ? `${filterable.length} filterable` : null,
              hidden.length ? `${hidden.length} hidden` : null,
            ].filter(Boolean).join(' · ') || 'All visible'
          }
          action={{ label: 'Edit', onClick: onOpenConfiguration }}
        />
        <Metric
          icon={Folder}
          label="Source"
          value={project ? project.key : '—'}
          hint={project ? `${project.issues.toLocaleString()} issues in scope` : 'No project'}
          action={{ label: 'Change', onClick: () => onEditStep(1) }}
        />
      </dl>

      {/* -------------------------- Wiring and health --------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* The wiring — two columns of it, so it uses the width it is given. */}
        <Panel
          className="xl:col-span-2"
          title="The connection"
          subtitle="What this integration is wired to"
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
            <Row icon={UserRound} label="Account" value={conn.config.account} onEdit={() => onEditStep(0)} />
            <Row
              icon={ExternalLink}
              label="Jira site"
              value={conn.config.siteUrl.replace('https://', '')}
              sub={conn.config.authMethod === 'atlassian' ? 'Atlassian sign-in' : 'API token'}
            />
            <Row
              icon={Folder}
              label="Project"
              value={project ? `${project.name} (${project.key})` : '—'}
              sub={project ? project.type : undefined}
              onEdit={() => onEditStep(1)}
            />
            <Row
              icon={Mail}
              label="Email comes from"
              value={conn.config.emailMapping.sourceField || 'Not set'}
              sub={
                emailSource
                  ? `${emailSource.coverage}% of issues have it · lands in ${EMAIL_TARGET}`
                  : `Lands in the ${EMAIL_TARGET} column`
              }
              onEdit={() => onEditStep(2)}
            />
            <Row
              icon={Table2}
              label="Issue types"
              value={conn.config.issueTypes.join(', ') || 'All'}
              sub={`${conn.runs.length} sync${conn.runs.length === 1 ? '' : 's'} run so far`}
            />
            <Row
              icon={ShieldCheck}
              label="Access"
              value="Read-only"
              sub={`Nothing is ever written back to ${provider.name}`}
            />
          </dl>
        </Panel>

        {/* Health — the only part that ever asks something of you. */}
        <Panel title="Health" subtitle="What the last run tells us">
          <ul className="space-y-3">
            <HealthRow
              ok={failed === 0}
              okText="Last sync imported cleanly"
              badText={`${failed} record${failed === 1 ? '' : 's'} had no email address`}
              detail={
                failed === 0
                  ? 'No records were rejected.'
                  : `They could not be threaded onto a mailbox. Fill ${conn.config.emailMapping.sourceField} in Jira, then retry.`
              }
            />
            <HealthRow
              ok={!emailSource || emailSource.coverage >= 80}
              okText={
                emailSource
                  ? `${emailSource.field} is filled in on ${emailSource.coverage}% of issues`
                  : 'Email source is set'
              }
              badText={`${emailSource?.field} is only on ${emailSource?.coverage}% of issues`}
              detail={
                !emailSource || emailSource.coverage >= 80
                  ? 'Almost every record arrives with a customer email.'
                  : 'The rest import with an empty Email column.'
              }
              fix={{ label: 'Change the source', onClick: () => onEditStep(2) }}
            />
            <HealthRow
              ok={filterable.length > 0}
              okText={`${filterable.length} column${filterable.length === 1 ? '' : 's'} available as a filter`}
              badText="No imported column is filterable"
              detail={
                filterable.length
                  ? filterable.map((m) => m.label || m.target).join(', ')
                  : 'Marking one adds it to the Reports filter bar.'
              }
              fix={{ label: 'Review columns', onClick: onOpenConfiguration }}
            />
          </ul>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Link icon={Table2} label={`View ${conn.totalImported.toLocaleString()} records`} onClick={onViewQueries} />
            <Link icon={History} label="Sync history" onClick={onOpenHistory} />
            <Link icon={Pencil} label="Field mapping" onClick={onOpenConfiguration} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* --------------------------------- Fragments -------------------------------- */

function Metric({
  icon: Icon, label, value, hint, action,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="group bg-white dark:bg-gray-900 px-4 py-3.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
        <dt className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</dt>
        {action && (
          <button
            onClick={action.onClick}
            className="ml-auto text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
          >
            {action.label}
          </button>
        )}
      </div>
      <dd className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums mt-1 truncate">{value}</dd>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={hint}>{hint}</p>
    </div>
  );
}

function Panel({
  title, subtitle, children, className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6 ${className}`}
    >
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({
  icon: Icon, label, value, sub, onEdit,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  sub?: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5 group">
      <Icon className="h-3.5 w-3.5 text-gray-400 mt-1 shrink-0" />
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] text-gray-400 dark:text-gray-500">{label}</dt>
        <dd className="text-sm text-gray-900 dark:text-white truncate">{value}</dd>
        {sub && <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{sub}</p>}
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          Edit
        </button>
      )}
    </div>
  );
}

function HealthRow({
  ok, okText, badText, detail, fix,
}: {
  ok: boolean;
  okText: string;
  badText: string;
  detail: string;
  fix?: { label: string; onClick: () => void };
}) {
  return (
    <li className="flex items-start gap-2.5">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-px shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-px shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-900 dark:text-white">{ok ? okText : badText}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{detail}</p>
        {!ok && fix && (
          <button
            onClick={fix.onClick}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline mt-1"
          >
            {fix.label}
          </button>
        )}
      </div>
    </li>
  );
}

function Link({ icon: Icon, label, onClick }: { icon: typeof Table2; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
    >
      <Icon className="h-3 w-3" />
      {label}
      <ChevronRight className="h-3 w-3" />
    </button>
  );
}
