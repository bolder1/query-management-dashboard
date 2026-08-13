import { useEffect, useMemo, useState } from 'react';
import {
  Play, Trash2, Loader2, Search, X, Plug,
  Bell, Check, Sparkles, MoreVertical, Plus, ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PillButton } from '../ui/pill';
import { toast } from 'sonner';
import {
  PROVIDERS, useIntegrations, ENTRY_SEQUENCE, isSetupComplete, setupTasks,
  type Connection, type Provider, type ProviderId,
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
  /**
   * A connection exists the moment an account is linked, so this section holds
   * both live integrations and setups still being worked through. Calling an
   * unfinished one "live" would be a lie the card underneath contradicts.
   */
  const liveCount = connectedProviders.filter((p) => isSetupComplete(connections[p.id]!.config)).length;
  const inProgressCount = connectedProviders.length - liveCount;

  /** Somebody is looking for something specific rather than taking the page in. */
  const browsing = !!query.trim() || category !== 'All';
  /**
   * The hero above is a full-width pitch for Jira with the same Connect button
   * on it. Repeating that as a catalogue card three inches below adds a second
   * call to action for the one connector and says nothing new, so while the
   * hero is up the card stands down.
   *
   * It comes straight back the moment anyone searches or filters: a search for
   * "jira" that returns nothing — on the only connector that actually exists —
   * would be a bug, not restraint.
   */
  const heroCarriesJira = !connections.jira && !browsing;

  const { available, comingSoon, matches } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = PROVIDERS.filter((p) => {
      if (connections[p.id]) return false;
      if (heroCarriesJira && p.id === 'jira') return false;
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
  }, [query, category, connections, heroCarriesJira]);

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
                : [
                    liveCount ? `${liveCount} live` : null,
                    inProgressCount ? `${inProgressCount} being set up` : null,
                    `${PROVIDERS.filter((p) => !p.available).length} on the roadmap`,
                  ].filter(Boolean).join(' · ') + '.'}
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

        {/* The Jira feature banner. It earns the top of the page only while
            Jira is unconnected — once it's set up, its card says everything. */}
        {!connections.jira && (
          <div className="mt-5">
            <ConnectHero onConnect={() => startWizard('jira')} />
          </div>
        )}

        {/* Connected — the same card shape as the store, plus live numbers */}
        {connectedProviders.length > 0 && (
          <section className="mt-6">
            <SectionHeading
              title="Your integrations"
              count={connectedProviders.length}
              subtitle={
                inProgressCount
                  ? `${inProgressCount} still being set up — pick up where you left off any time.`
                  : 'Live connections writing into Query Results.'
              }
            />
            {/* Same grid as the catalogue below, so the page reads as one
                set of cards rather than a wide panel then a grid. */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {connectedProviders.map((provider) => (
                <ConnectedCard
                  key={provider.id}
                  provider={provider}
                  conn={connections[provider.id]!}
                  onOpen={() => openDetail(provider.id)}
                  onOpenSetup={() => openDetail(provider.id, 'setup')}
                  onSync={() => { runSync(provider.id); toast.info('Sync started'); }}
                  onRetry={() => { runSync(provider.id, true); toast.info('Retrying failed records'); }}
                  onRemove={() => handleRemove(provider.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Browse the catalog */}
        <section className="mt-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeading
              title="Browse integrations"
              subtitle={
                heroCarriesJira
                  ? 'Jira is the one connector available today — it is the card above. Everything else is on the roadmap.'
                  : 'One connector is live today. The rest are on the roadmap — ask to be told when they land.'
              }
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

          {/*
           * Purple Ignite, via the component built for it. These used to look up
           * --pill-accent-solid-* by hand, which meant the selected chip also
           * hand-rolled `focus-visible:ring-2` with no ring colour — so the ring
           * inherited the chip's own white text and vanished against the page.
           * PillButton carries the audited ring and offset.
           */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {CATEGORIES.map((c) => (
              <PillButton
                key={c}
                tone="surface"
                size="lg"
                active={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </PillButton>
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
                    <RequestCard />
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
          {/* Not "6-step setup" any more — that counted a wizard that no longer
              exists. Connecting is two questions; the rest waits on the
              integration's own page for whenever you have time. */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            {provider.category} · read-only · {ENTRY_SEQUENCE.length} steps to connect
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

/**
 * A live connection, in the same card shape as the store so the page reads as
 * one grid rather than a bespoke panel followed by a catalogue. Everything past
 * the two obvious actions lives in the menu.
 */
function ConnectedCard({
  provider, conn, onOpen, onOpenSetup, onSync, onRetry, onRemove,
}: {
  provider: Provider;
  conn: Connection;
  onOpen: () => void;
  /** Straight to the setup section — the answers, not the activity. */
  onOpenSetup: () => void;
  onSync: () => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const lastRun = conn.runs[0];
  /**
   * A connection exists from the moment the account is linked, so a card here
   * may be a setup in progress rather than a live sync. It gets the same shape
   * with the numbers swapped for what is left to do.
   */
  const ready = isSetupComplete(conn.config);
  const outstanding = setupTasks(conn.config).filter((t) => !t.done);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-card-menu]')) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const fields = conn.config.mappings.filter((m) => m.target.trim()).length;

  /**
   * The numbers, as one line of prose instead of three boxed tiles. The tiles
   * cost three times the height to say the same thing, and two thirds of that
   * height was the word "Imported" written above a zero.
   *
   * Ordered so the tail is what gets dropped when the line runs out of room:
   * a failure count always survives, a timestamp is allowed not to. Field
   * counts only appear before the first sync, when there is nothing better to
   * say — afterwards the import numbers are more use.
   */
  const meta: (string | null)[] = !ready
    ? [
        `${outstanding.length} step${outstanding.length === 1 ? '' : 's'} left`,
        conn.config.projects[0]?.key ?? null,
      ]
    : lastRun
      ? [`${conn.totalImported.toLocaleString()} imported`, relativeTime(lastRun.startedAt)]
      : ['Nothing imported yet', `${fields} fields`];

  return (
    <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col">
      {/*
       * The card body opens the integration. That frees the footer to carry
       * one action instead of two full-width buttons stacked under a stat
       * grid — the same shape every other card on this page already uses.
       */}
      <button onClick={onOpen} className="flex items-start gap-3 text-left pr-7 group">
        <ProviderLogo provider={provider} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              {provider.name}
            </h3>
            <StatusPill status={!ready ? 'draft' : lastRun?.status === 'failed' ? 'failed' : 'connected'} />
            {conn.syncing && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                {conn.progress}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {ready
              ? `${conn.config.projects[0]?.name ?? '—'} · ${conn.config.account}`
              : `Next: ${outstanding[0]?.title.toLowerCase() ?? 'start the first sync'}`}
          </p>
        </div>
      </button>

      {/* Sits outside the card button rather than inside it — a button within
          a button is invalid, and the menu must not navigate. */}
      <div className="absolute right-3 top-3" data-card-menu>
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label={`More options for ${provider.name}`}
          aria-expanded={menu}
          className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menu && (
          <div className="absolute right-0 top-full mt-1.5 z-30 w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1">
            {/* Configuration lives on the integration's own page now — there
                is no second place to edit the same answers. */}
            <CardMenuItem label="Setup & configuration" onClick={() => { setMenu(false); onOpenSetup(); }} />
            {!!lastRun?.failed && (
              <CardMenuItem label={`Retry ${lastRun.failed} failed`} onClick={() => { setMenu(false); onRetry(); }} />
            )}
            <span className="block h-px bg-gray-100 dark:bg-gray-800 my-1" />
            <CardMenuItem danger label="Remove integration" onClick={() => { setMenu(false); onRemove(); }} />
          </div>
        )}
      </div>

      {/* Same footer as every other card: facts on the left, one action right */}
      <div className="flex items-center justify-between gap-2 mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate min-w-0">
          {/* Failures sit ahead of the timestamp so truncation eats the clock,
              never the warning. */}
          {!conn.syncing && !!lastRun?.failed && (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {lastRun.failed} failed ·{' '}
            </span>
          )}
          {meta.filter(Boolean).join(' · ')}
        </p>
        {ready ? (
          <Button variant="outline" size="sm" className="h-7 shrink-0" disabled={conn.syncing} onClick={onSync}>
            <Play className="h-3 w-3 mr-1.5" />
            {conn.syncing ? 'Syncing' : 'Sync'}
          </Button>
        ) : (
          <Button size="sm" className="h-7 shrink-0" onClick={onOpenSetup}>
            Resume
            <ArrowRight className="h-3 w-3 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function CardMenuItem({
  label, onClick, danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-1.5 text-left text-[13px] transition-colors ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  );
}

/** Closes the store: whatever isn't on the roadmap can still be asked for. */
function RequestCard() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-800/30 p-4 flex flex-col">
      <div className="flex items-center gap-2">
        <span className="h-9 w-9 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
          <Plus className="h-4 w-4 text-gray-400" />
        </span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Something missing?</h3>
      </div>

      {sent ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-3 flex items-start gap-1.5">
          <Check className="h-3.5 w-3.5 mt-px shrink-0" />
          Request noted. We'll tell you if it makes the roadmap.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex-1">
            Tell us which system your team uses and we'll weigh it up.
          </p>
          <form
            className="flex items-center gap-1.5 mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setSent(true);
              toast.success(`Noted — ${name.trim()}`, { description: 'Thanks, that helps us prioritise.' });
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Notion"
              className="h-8 text-sm bg-white dark:bg-gray-900"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0" disabled={!name.trim()}>
              Request
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
