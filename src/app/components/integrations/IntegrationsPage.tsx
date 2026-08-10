import { useMemo, useState } from 'react';
import {
  Play, Settings2, Trash2, AlertCircle, Loader2, Search, X, Plug,
  Bell, Check, Sparkles, RotateCw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import {
  PROVIDERS, useIntegrations, WIZARD_STEPS,
  type Provider, type ProviderId,
} from '../../contexts/IntegrationContext';
import { useNav } from '../../contexts/NavContext';
import { useFilters } from '../../contexts/FilterContext';
import { ProviderLogo, StatusPill, Metric, relativeTime } from './shared';
import { RemoveIntegrationModal } from './RemoveIntegrationModal';
import { ConnectHero } from './ConnectHero';
import { SyncPipeline } from './SyncPipeline';

const CATEGORIES = ['All', ...Array.from(new Set(PROVIDERS.map((p) => p.category)))];

export function IntegrationsPage() {
  const {
    connections, startWizard, runSync, removeIntegration, notifyList, toggleNotify,
  } = useIntegrations();
  const { openDetail } = useNav();
  const { removeQueriesBySource } = useFilters();
  const [showRemove, setShowRemove] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const connectedProviders = PROVIDERS.filter((p) => connections[p.id]);
  const firstRun = connectedProviders.length === 0;

  const { available, comingSoon, matches } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = PROVIDERS.filter((p) => {
      if (connections[p.id]) return false;
      if (category !== 'All' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
    return {
      available: pool.filter((p) => p.available),
      comingSoon: pool.filter((p) => !p.available),
      matches: pool.length,
    };
  }, [query, category, connections]);

  const handleRemove = (id: ProviderId) => {
    const name = PROVIDERS.find((p) => p.id === id)!.name;
    removeIntegration(id);
    removeQueriesBySource(name);
    toast.success(`${name} removed`, { description: 'Credentials and imported records are gone.' });
  };

  const handleNotify = (p: Provider) => {
    const on = notifyList.includes(p.id);
    toggleNotify(p.id);
    toast[on ? 'info' : 'success'](
      on ? `You'll no longer be notified about ${p.name}` : `We'll email you when ${p.name} is ready`,
      { description: on ? undefined : `Expected ${p.eta}. One message, no follow-ups.` },
    );
  };

  return (
    <>
      {showRemove && (
        <RemoveIntegrationModal onClose={() => setShowRemove(false)} onRemove={handleRemove} />
      )}

      <div className="px-6 py-5">
        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Integrations</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {firstRun
                ? 'Link an external system and its records land in Query Results automatically.'
                : `${connectedProviders.length} connected · ${PROVIDERS.filter((p) => p.available && !connections[p.id]).length} ready to connect · ${PROVIDERS.filter((p) => !p.available).length} on the roadmap.`}
            </p>
          </div>
          {connectedProviders.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/20"
              onClick={() => setShowRemove(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remove Integration
            </Button>
          )}
        </div>

        {/* First run: the whole page leads with one clear invitation */}
        {firstRun && (
          <div className="mt-5">
            <ConnectHero onConnect={() => startWizard('jira')} />
          </div>
        )}

        {/* Connected */}
        {connectedProviders.length > 0 && (
          <section className="mt-6">
            <SectionHeading
              title="Connected"
              count={connectedProviders.length}
              subtitle="Live connections writing into Query Results."
            />
            <div className="mt-3 space-y-3">
              {connectedProviders.map((provider) => {
                const conn = connections[provider.id]!;
                const lastRun = conn.runs[0];
                return (
                  <div
                    key={provider.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <ProviderLogo provider={provider} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{provider.name}</h3>
                          <StatusPill status={lastRun?.status === 'failed' ? 'failed' : 'connected'} />
                          {conn.syncing && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Syncing {conn.progress}%
                            </span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {conn.config.account}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{provider.description}</p>
                      </div>
                    </div>

                    {conn.syncing && (
                      <div className="mt-4">
                        <SyncPipeline provider={provider} conn={conn} compact />
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <Metric label="Last sync" value={relativeTime(lastRun?.startedAt)} />
                      <Metric label="Imported queries" value={conn.totalImported} />
                      <Metric label="Synced project" value={conn.config.projects[0]?.name ?? '—'} />
                      <Metric label="Email source" value={conn.config.emailMapping.sourceField || '—'} />
                    </div>

                    {!conn.syncing && !!lastRun?.failed && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                        <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {lastRun.failed} record{lastRun.failed > 1 ? 's' : ''} from the last run could not be
                          imported.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            runSync(provider.id, true);
                            toast.info('Retrying failed records');
                          }}
                        >
                          <RotateCw className="h-3 w-3 mr-1.5" />
                          Retry failed
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={conn.syncing}
                        onClick={() => {
                          runSync(provider.id);
                          toast.info('Sync started');
                        }}
                      >
                        <Play className={`h-3.5 w-3.5 mr-1.5 ${conn.syncing ? 'animate-pulse' : ''}`} />
                        {conn.syncing ? 'Syncing…' : 'Sync now'}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => openDetail(provider.id)}>
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                        Manage
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => startWizard(provider.id)}
                      >
                        Reconfigure
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Browse the catalog */}
        <section className="mt-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeading
              title="Browse integrations"
              subtitle="One connector is live today. The rest are on the roadmap — ask to be told when they land."
            />
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search integrations"
                className="pl-9 pr-9 h-9"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === c
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {matches === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-14 text-center">
              <Search className="h-6 w-6 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2.5">No integrations found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                {query
                  ? `Nothing matches “${query.trim()}”${category !== 'All' ? ` in ${category}` : ''}.${
                      connectedProviders.length ? ' Everything already connected is listed above.' : ''
                    }`
                  : `No integrations in ${category} yet.`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              {available.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold tracking-wide text-gray-400 dark:text-gray-500">
                    AVAILABLE NOW
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2.5">
                    {available.map((p) => (
                      <AvailableCard key={p.id} provider={p} onConnect={() => startWizard(p.id)} />
                    ))}
                  </div>
                </div>
              )}

              {comingSoon.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold tracking-wide text-gray-400 dark:text-gray-500">
                    COMING SOON
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2.5">
                    {comingSoon.map((p) => (
                      <ComingSoonCard
                        key={p.id}
                        provider={p}
                        notified={notifyList.includes(p.id)}
                        onNotify={() => handleNotify(p)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}

function SectionHeading({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count?: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {count !== undefined && (
          <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400">
            {count}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

function AvailableCard({ provider, onConnect }: { provider: Provider; onConnect: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col">
      <div className="flex items-start gap-3">
        <ProviderLogo provider={provider} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{provider.name}</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-2.5 w-2.5" />
              Available
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{provider.description}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            {provider.category} · read-only · {WIZARD_STEPS.length}-step setup
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button size="sm" className="h-8 w-full sm:w-auto" onClick={onConnect}>
          <Plug className="h-3.5 w-3.5 mr-1.5" />
          Connect
        </Button>
      </div>
    </div>
  );
}

function ComingSoonCard({
  provider,
  notified,
  onNotify,
}: {
  provider: Provider;
  notified: boolean;
  onNotify: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-4 flex flex-col">
      <div className="flex items-start gap-3">
        <ProviderLogo provider={provider} size={36} muted />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{provider.name}</h3>
            <span className="rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Coming soon
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{provider.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-3.5 pt-3 border-t border-gray-200 dark:border-gray-800">
        <span className="text-xs text-gray-400 dark:text-gray-500">{provider.eta}</span>
        <button
          onClick={onNotify}
          aria-pressed={notified}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            notified
              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/25'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {notified ? (
            <>
              <Check className="h-3 w-3" />
              We'll tell you
            </>
          ) : (
            <>
              <Bell className="h-3 w-3" />
              Notify me
            </>
          )}
        </button>
      </div>
    </div>
  );
}
