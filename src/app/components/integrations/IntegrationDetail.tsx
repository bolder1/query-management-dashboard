import { useState } from 'react';
import {
  ChevronLeft, Play, Settings2, RotateCw, Filter, FileText, Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import {
  PROVIDERS, useIntegrations, type ProviderId,
} from '../../contexts/IntegrationContext';
import { useNav } from '../../contexts/NavContext';
import { ProviderLogo, StatusPill, formatTime } from './shared';
import { IntegrationOverview } from './IntegrationOverview';

type Tab = 'overview' | 'configuration' | 'history';

export function IntegrationDetail({ providerId }: { providerId: ProviderId }) {
  const { connections, runSync, startWizard, updateDraft } = useIntegrations();
  // Opens the setup flow directly on the step that owns a given change.
  const editAt = (step: number) => { startWizard(providerId); updateDraft({ step }); };
  const { closeDetail } = useNav();
  const { setPage } = useNav();
  const [tab, setTab] = useState<Tab>('overview');
  const [openLog, setOpenLog] = useState<string | null>(null);

  const provider = PROVIDERS.find((p) => p.id === providerId)!;
  const conn = connections[providerId];

  if (!conn) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">This integration has been removed.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={closeDetail}>Back to integrations</Button>
      </div>
    );
  }

  const mapped = conn.config.mappings.filter((m) => m.source.trim() && m.target.trim());
  const filterable = mapped.filter((m) => m.filterable);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'configuration', label: 'Configuration' },
    { id: 'history', label: `Sync History${conn.runs.length ? ` (${conn.runs.length})` : ''}` },
  ];

  return (
    <div className="px-6 py-5">
      <button
        onClick={closeDetail}
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Integrations
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mt-3">
        <div className="flex items-start gap-3">
          <ProviderLogo provider={provider} size={44} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{provider.name}</h1>
              <StatusPill status="connected" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {conn.config.siteUrl} · {conn.config.account} ·{' '}
              {conn.config.authMethod === 'atlassian' ? 'Atlassian sign-in' : 'API token'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm" className="h-8" disabled={conn.syncing}
            onClick={() => { runSync(providerId); toast.info('Sync started'); }}
          >
            {conn.syncing
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <Play className="h-3.5 w-3.5 mr-1.5" />}
            {conn.syncing ? `Syncing ${conn.progress}%` : 'Sync now'}
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => startWizard(providerId)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Reconfigure
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mt-5 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <IntegrationOverview
          provider={provider}
          providerId={providerId}
          conn={conn}
          onEditStep={editAt}
          onOpenHistory={() => setTab('history')}
          onOpenConfiguration={() => setTab('configuration')}
          onViewQueries={() => { closeDetail(); setPage('Reports'); }}
        />
      )}

      {/* Configuration */}
      {tab === 'configuration' && (
        <div className="mt-5 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Field mapping</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {mapped.length} fields imported into Query Management · {filterable.length} exposed as filters.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => editAt(3)}>Add field</Button>
              <Button variant="outline" size="sm" onClick={() => editAt(4)}>Change mapping</Button>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                {['Jira field', 'Dashboard field', 'Filter', 'Visible'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conn.config.mappings.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{m.source || '—'}</td>
                  <td className={`px-4 py-2.5 text-sm ${m.target ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                    {m.target || 'Not mapped'}
                  </td>
                  <td className="px-4 py-2.5 text-sm">
                    {m.filterable ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                        <Filter className="h-3 w-3" />
                        Filter
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{m.visible ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="mt-5 space-y-2">
          {conn.runs.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-12 text-center">
              <FileText className="h-6 w-6 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">No syncs yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Run your first sync to see history and logs here.</p>
              <Button size="sm" className="mt-3" onClick={() => runSync(providerId)}>
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Start Sync
              </Button>
            </div>
          )}

          {conn.runs.map((run) => (
            <div key={run.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
              <div className="px-4 py-3 flex flex-wrap items-center gap-4">
                <StatusPill status={run.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {new Date(run.startedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {run.imported} imported · {run.failed} failed ·{' '}
                    {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : 'in progress'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {run.failed > 0 && run.status === 'completed' && (
                    <Button variant="outline" size="sm" className="h-8" onClick={() => runSync(providerId, true)}>
                      <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                      Retry failed
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm" className="h-8"
                    onClick={() => setOpenLog(openLog === run.id ? null : run.id)}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    {openLog === run.id ? 'Hide logs' : 'View logs'}
                  </Button>
                </div>
              </div>

              {openLog === run.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3 space-y-1 font-mono max-h-56 overflow-y-auto">
                  {run.logs.map((l, i) => (
                    <p
                      key={i}
                      className={`text-xs ${
                        l.level === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : l.level === 'warn'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <span className="text-gray-400 dark:text-gray-500">{formatTime(l.time)}</span>{' '}
                      [{l.level.toUpperCase()}] {l.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
