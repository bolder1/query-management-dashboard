import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown, Play, Settings2, RotateCw, Filter, Loader2, History, Plus, ArrowRight,
  MoreVertical, UserRound, Columns3, ExternalLink, Trash2, ListChecks, RefreshCw, Folder,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Pill } from '../ui/pill';
import { Trail } from '../ui/trail';
import { toast } from 'sonner';
import {
  PROVIDERS, useIntegrations, isSetupComplete, setupTasks, configPendingSync,
  type ProviderId,
} from '../../contexts/IntegrationContext';
import { useNav, type DetailTab } from '../../contexts/NavContext';
import { ProviderLogo, StatusPill } from './shared';
import { IntegrationOverview } from './IntegrationOverview';
import { SetupChecklist } from './SetupChecklist';
import { SyncHistoryDrawer } from './SyncHistoryDrawer';

type Tab = DetailTab;

/** What each section is called in the trail — longer than its tab, on purpose. */
const TAB_TITLE: Record<Tab, string> = {
  overview: 'Overview',
  setup: 'Setup & configuration',
  configuration: 'Field mapping',
};

export function IntegrationDetail({ providerId }: { providerId: ProviderId }) {
  const {
    connections, runSync, startWizard, removeIntegration, startFirstSync,
  } = useIntegrations();
  /**
   * Opens one step on its own. Everything that edits configuration goes through
   * here — the checklist, the overview's Edit links, the header menu — so there
   * is exactly one way to change an answer and it always saves back to the
   * stored connection.
   */
  const editAt = (step: number, opts: { reviewing?: boolean } = {}) =>
    startWizard(providerId, { sequence: [step], step, ...opts });
  /**
   * The open section lives in nav state, not here, so the breadcrumb and the
   * setup editor floating above the page can both move between sections — and
   * so saving an edit returns you to the section you opened it from.
   */
  const { closeDetail, setPage, detailTab, setDetailTab: setTab } = useNav();
  /** Which header menu is open — only ever one. */
  const [menu, setMenu] = useState<'sync' | 'more' | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  /**
   * Tracks the moment the integration goes live so the page can follow it.
   * `null` until the first render has been seen — starting at `false` made
   * every mount look like the transition, which stole the section a caller
   * had just asked for (opening "Setup & configuration" landed on Overview).
   */
  const wasLive = useRef<boolean | null>(null);

  // Menus close on an outside click or Escape, like any other menu.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-detail-menu]')) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const provider = PROVIDERS.find((p) => p.id === providerId)!;
  const conn = connections[providerId];
  const isLive = !!conn && isSetupComplete(conn.config) && conn.runs.length > 0;

  /**
   * The first import turns this page from a checklist into a live integration.
   * Follow it across rather than leaving the user staring at a checklist with
   * every row ticked.
   */
  useEffect(() => {
    if (wasLive.current === false && isLive) setTab('overview');
    wasLive.current = isLive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive]);

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
  const lastFailed = conn.runs[0]?.failed ?? 0;

  /**
   * An integration exists from the moment an account is linked, so it spends
   * time in a half-configured state. Until every task is done there is nothing
   * to sync and nothing to report on — the page is the checklist.
   */
  const ready = isSetupComplete(conn.config);
  const neverSynced = conn.runs.length === 0;
  const outstanding = setupTasks(conn.config).filter((t) => !t.done).length;
  /** Before the first import there is no activity to overview — only setup. */
  const live = ready && !neverSynced;
  /**
   * Answers were changed after the last import, so the dashboard was built from
   * an older configuration. Setup being revisitable is exactly what creates this
   * state, so the page has to carry it.
   */
  const pendingSync = configPendingSync(conn);

  /*
   * Setup is the first-time experience, not a permanent room. It is the whole
   * page until the first import lands, and then it goes — a tab called "Setup"
   * on a live integration is a tab about something that already happened.
   * Changing an answer afterwards is what the header menu and the field mapping
   * tab are for, and applying a change is "Merge the changes" in the header.
   */
  const TABS: { id: Tab; label: string; alert?: boolean }[] = live
    ? [
        { id: 'overview', label: 'Overview' },
        { id: 'configuration', label: `Field mapping${mapped.length ? ` (${mapped.length})` : ''}` },
      ]
    : [
        { id: 'setup', label: outstanding ? `Setup (${outstanding} left)` : 'Setup' },
        { id: 'configuration', label: `Field mapping${mapped.length ? ` (${mapped.length})` : ''}` },
      ];

  /** Land on whichever tab is actually useful for this connection's state. */
  const fallbackTab: Tab = live ? 'overview' : 'setup';
  const activeTab: Tab = TABS.some((t) => t.id === detailTab) ? (detailTab as Tab) : fallbackTab;

  return (
    <div className="px-6 py-5">
      {/* Where you are, all the way down. Setup opens over this page rather
          than inside it, so the same trail continues into the editor. */}
      <Trail
        items={[
          { label: 'Integrations', onClick: closeDetail },
          {
            label: provider.name,
            onClick: activeTab === fallbackTab ? undefined : () => setTab(fallbackTab),
          },
          { label: TAB_TITLE[activeTab] },
        ]}
        className="-ml-1.5"
      />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mt-3">
        <div className="flex items-start gap-3">
          <ProviderLogo provider={provider} size={44} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{provider.name}</h1>
              <StatusPill status={ready ? 'connected' : 'draft'} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {conn.config.siteUrl} · {conn.config.account} ·{' '}
              {ready
                ? conn.config.authMethod === 'atlassian' ? 'Atlassian sign-in' : 'API token'
                : `${outstanding} step${outstanding === 1 ? '' : 's'} left`}
            </p>
          </div>
        </div>
        {/* The trail: primary action, its menu of related runs, then everything else */}
        <div className="flex items-center gap-2" data-detail-menu>
          {/*
           * Configuration was edited after the last import, so the dashboard is
           * built from older answers. This is the one action that closes that
           * gap, so it leads the trail — and it says what it does to your data
           * rather than describing the state it is in.
           */}
          {pendingSync && !conn.syncing && (
            <Button
              size="sm"
              className="h-8 bg-amber-600 hover:bg-amber-700 text-white"
              title="Re-import with the answers you changed"
              onClick={() => { runSync(providerId); toast.info('Merging your changes'); }}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Merge the changes
            </Button>
          )}
          {/* Sync only exists once there is a complete configuration to sync
              with. Before that the checklist owns the forward action. */}
          {ready && (
            <div className="flex items-stretch">
              <Button
                size="sm"
                className="h-8 rounded-r-none"
                disabled={conn.syncing}
                onClick={() => {
                  if (neverSynced) { startFirstSync(providerId); return; }
                  runSync(providerId);
                  toast.info('Sync started');
                }}
              >
                {conn.syncing
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <Play className="h-3.5 w-3.5 mr-1.5" />}
                {conn.syncing ? `Syncing ${Math.floor(conn.progress)}%` : neverSynced ? 'Start first sync' : 'Sync now'}
              </Button>
              <div className="relative">
                <Button
                  size="sm"
                  aria-label="More sync options"
                  aria-expanded={menu === 'sync'}
                  className="h-8 rounded-l-none px-1.5 border-l border-white/25"
                  onClick={() => setMenu(menu === 'sync' ? null : 'sync')}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                {menu === 'sync' && (
                  <Menu>
                    <MenuItem
                      icon={History}
                      label="Sync history"
                      hint={`${conn.runs.length} run${conn.runs.length === 1 ? '' : 's'} logged`}
                      onClick={() => { setMenu(null); setHistoryOpen(true); }}
                    />
                    <MenuItem
                      icon={RotateCw}
                      label="Retry failed records"
                      hint={lastFailed ? `${lastFailed} from the last run` : 'Nothing failed last run'}
                      disabled={!lastFailed || conn.syncing}
                      onClick={() => { setMenu(null); runSync(providerId, true); toast.info('Retrying failed records'); }}
                    />
                  </Menu>
                )}
              </div>
            </div>
          )}

          {!ready && (
            <Button size="sm" className="h-8" onClick={() => setTab('setup')}>
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Finish setup
            </Button>
          )}

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              aria-label="More options"
              aria-expanded={menu === 'more'}
              className="h-8 px-2"
              onClick={() => setMenu(menu === 'more' ? null : 'more')}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
            {menu === 'more' && (
              <Menu>
                {/*
                  * Once the integration is live there is no Setup tab to send
                  * anyone to, so this menu becomes the way back into each
                  * answer — one item per thing you might want to change.
                  */}
                {!live && (
                  <MenuItem
                    icon={ListChecks}
                    label="Setup & configuration"
                    hint={outstanding ? `${outstanding} step${outstanding === 1 ? '' : 's'} left to answer` : 'Review or change any answer'}
                    onClick={() => { setMenu(null); setTab('setup'); }}
                  />
                )}
                <MenuItem
                  icon={UserRound}
                  label="Change the account"
                  hint="Sign in as someone else"
                  onClick={() => { setMenu(null); editAt(0); }}
                />
                {live && (
                  <MenuItem
                    icon={Folder}
                    label="Change the project"
                    hint={conn.config.projects[0]?.name ?? 'None chosen'}
                    onClick={() => { setMenu(null); editAt(1); }}
                  />
                )}
                <MenuItem
                  icon={Columns3}
                  label="Edit field mapping"
                  hint="Change which Jira fields fill which columns"
                  onClick={() => { setMenu(null); editAt(2); }}
                />
                <MenuItem
                  icon={ExternalLink}
                  label="Open in Jira"
                  hint={conn.config.siteUrl.replace('https://', '')}
                  onClick={() => { setMenu(null); window.open(conn.config.siteUrl, '_blank', 'noreferrer'); }}
                />
                <span className="block h-px bg-gray-100 dark:bg-gray-800 my-1" />
                <MenuItem
                  icon={Trash2}
                  danger
                  label="Remove this integration"
                  hint="Deletes the credentials and imported records"
                  onClick={() => { setMenu(null); setConfirmRemove(true); }}
                />
              </Menu>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mt-5 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={activeTab === t.id ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
            {/* An edit made after the last import is only visible here until
                the next sync picks it up, so the tab carries the mark. */}
            {t.alert && (
              <span
                aria-label="changes not synced yet"
                className="h-1.5 w-1.5 rounded-full bg-amber-500"
              />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'setup' && (
        <div className="mt-5 max-w-5xl">
          <SetupChecklist
            provider={provider}
            conn={conn}
            pendingSync={pendingSync}
            onOpenTask={editAt}
            onReview={() => editAt(2, { reviewing: true })}
            onStartSync={() => startFirstSync(providerId)}
            onSyncNow={() => { runSync(providerId); toast.info('Sync started'); }}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        </div>
      )}

      {activeTab === 'overview' && (
        /* Full width. The overview is a dashboard about a dashboard — banding it
           into a 64rem column was what made seven facts feel like a form. */
        <div className="mt-5">
          <IntegrationOverview
            provider={provider}
            providerId={providerId}
            conn={conn}
            onEditStep={editAt}
            onOpenHistory={() => setHistoryOpen(true)}
            onOpenConfiguration={() => setTab('configuration')}
            onViewQueries={() => { closeDetail(); setPage('Reports'); }}
          />
        </div>
      )}

      <SyncHistoryDrawer
        conn={conn}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRetry={() => { runSync(providerId, true); toast.info('Retrying failed records'); }}
      />

      {confirmRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Remove {provider.name}?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              The connection, its credentials and the {conn.totalImported} records it imported are deleted
              immediately. Jira itself is untouched.
            </p>
            <div className="flex flex-wrap justify-end gap-2 mt-5">
              <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>Keep it</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  setConfirmRemove(false);
                  removeIntegration(providerId);
                  closeDetail();
                  toast.success(`${provider.name} removed`);
                }}
              >
                Remove integration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration */}
      {activeTab === 'configuration' && (
        <div className="mt-5">
          {/* Heading and actions sit ABOVE the table, not inside its frame, so
              the table is only ever the data. */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Field mapping</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {mapped.length} fields imported into Query Management · {filterable.length} exposed as filters.
              </p>
            </div>
            {/* Real buttons: an icon, a solid primary for the common action, and
                a bordered secondary — the old pair read as flat labels. */}
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" className="h-9 shadow-sm" onClick={() => editAt(2)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add field
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 shadow-sm bg-white dark:bg-gray-900"
                onClick={() => editAt(2)}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                Change mapping
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
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
        </div>
      )}

    </div>
  );
}

/** A menu panel anchored under whichever header button opened it. */
function Menu({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-0 top-full mt-1.5 z-30 w-[17rem] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1">
      {children}
    </div>
  );
}

/** Every row states the action and, underneath, what it actually does. */
function MenuItem({
  icon: Icon, label, hint, onClick, danger, disabled,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
      } disabled:hover:bg-transparent`}
    >
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-snug">{label}</span>
        <span className={`block text-[11px] leading-snug mt-0.5 ${danger ? 'text-red-500/80 dark:text-red-400/70' : 'text-gray-500 dark:text-gray-400'}`}>
          {hint}
        </span>
      </span>
    </button>
  );
}
