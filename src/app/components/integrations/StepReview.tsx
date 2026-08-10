import { ReactNode } from 'react';
import { ShieldCheck, AlertTriangle, Filter, Check } from 'lucide-react';
import {
  MOCK_PROJECTS, EMAIL_SOURCE_FIELDS, EMAIL_TARGET, type WizardDraft,
} from '../../contexts/IntegrationContext';
import { sampleValue } from './sampleData';

export function StepReview({
  draft,
  goToStep,
}: {
  draft: WizardDraft;
  goToStep: (step: number) => void;
}) {
  const project = MOCK_PROJECTS.find((p) => p.id === draft.projectIds[0]);
  const emailSource = EMAIL_SOURCE_FIELDS.find((f) => f.field === draft.emailMapping.sourceField);
  const mapped = draft.mappings.filter((m) => m.target.trim());
  const unmapped = draft.mappings.filter((m) => !m.target.trim());
  const filterable = mapped.filter((m) => m.filterable);
  const columns = mapped.filter((m) => m.visible);

  const warnings = [
    emailSource && emailSource.coverage < 60 &&
      `Only ${emailSource.coverage}% of recent issues have ${emailSource.field} populated. The rest will import with an empty ${EMAIL_TARGET} column.`,
    unmapped.length > 0 &&
      `${unmapped.length} selected field${unmapped.length > 1 ? 's are' : ' is'} not connected to a column and will not be imported: ${unmapped.map((m) => m.source).join(', ')}.`,
  ].filter(Boolean) as string[];

  return (
    <div className="w-full space-y-4">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 divide-x divide-y lg:divide-y-0 divide-gray-200 dark:divide-gray-700 overflow-hidden">
        <Stat label="Records in scope" value={project ? `~${project.issues.toLocaleString()}` : '—'} hint="First sync takes the most recent batch" />
        <Stat label="Columns" value={columns.length} hint={`${mapped.length} mapped, ${columns.length} visible`} />
        <Stat label="New filters" value={filterable.length} hint={filterable.length ? filterable.map((m) => m.target).join(', ') : 'None configured'} />
        <Stat label="Sync mode" value="Read-only" hint="Jira is never modified" />
      </div>

      {/* Configuration */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <Section title="Source" onEdit={() => goToStep(0)}>
          <Row label="Jira site" value={draft.siteUrl.replace('https://', '')} />
          <Row label="Authenticated as" value={draft.email} />
          <Row label="Method" value={draft.authMethod === 'atlassian' ? 'Atlassian sign-in' : 'API token'} />
        </Section>

        <Section title="Scope" onEdit={() => goToStep(1)}>
          <Row label="Project" value={project ? `${project.name} (${project.key})` : '—'} />
          <Row label="Project type" value={project?.type ?? '—'} />
        </Section>

        <Section title="Email" onEdit={() => goToStep(2)}>
          <Row
            label="Fetched from"
            value={
              <span className="inline-flex items-center gap-2 flex-wrap">
                {emailSource?.field ?? 'Not selected'}
                {emailSource && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-medium ${
                      emailSource.coverage >= 80
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {emailSource.coverage >= 80 && <Check className="h-2.5 w-2.5" />}
                    {emailSource.coverage}% populated
                  </span>
                )}
              </span>
            }
          />
          <Row label="Lands in" value={`${EMAIL_TARGET} column`} />
        </Section>

        <Section title="Field mapping" onEdit={() => goToStep(4)} last>
          <div className="flex flex-wrap gap-1.5 py-1">
            {mapped.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-2 py-1 text-xs"
              >
                <span className="text-gray-500 dark:text-gray-400">{m.source}</span>
                <span className="text-gray-300 dark:text-gray-600">→</span>
                <span className="font-medium text-gray-900 dark:text-white">{m.target}</span>
                {m.filterable && <Filter className="h-2.5 w-2.5 text-blue-500" />}
              </span>
            ))}
            {mapped.length === 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">Nothing mapped yet.</span>
            )}
          </div>
        </Section>
      </div>

      {/* Outcome */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Preview of imported records</p>
          <button
            onClick={() => goToStep(4)}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            Adjust columns
          </button>
        </div>
        {columns.length === 0 ? (
          <p className="px-4 py-10 text-sm text-gray-500 dark:text-gray-400 text-center">
            No visible columns yet — connect at least one field to see the result.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  {columns.map((m) => (
                    <th
                      key={m.id}
                      className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap"
                    >
                      {m.target}
                      {m.filterable && <Filter className="inline h-3 w-3 ml-1 text-blue-500" />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2].map((i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    {columns.map((m) => (
                      <td key={m.id} className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {sampleValue(m.source, i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            Before you sync
          </p>
          <ul className="mt-1.5 space-y-1">
            {warnings.map((w) => (
              <li key={w} className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 mt-px shrink-0" />
        Credentials are encrypted at rest and used only by this integration. Removing it deletes them and its
        imported records immediately.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return (
    <div className="px-4 py-3.5">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-semibold text-gray-900 dark:text-white tabular-nums mt-0.5">{value}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate" title={hint}>{hint}</p>
    </div>
  );
}

function Section({
  title,
  onEdit,
  children,
  last,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? '' : 'border-b border-gray-100 dark:border-gray-800'}>
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <h3 className="text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500">
          {title.toUpperCase()}
        </h3>
        <button
          onClick={onEdit}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
        >
          Edit
        </button>
      </div>
      <div className="px-4 pb-3 pt-1">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 py-1">
      <p className="text-sm text-gray-500 dark:text-gray-400 w-36 shrink-0">{label}</p>
      <div className="text-sm text-gray-900 dark:text-white min-w-0 break-words">{value}</div>
    </div>
  );
}
