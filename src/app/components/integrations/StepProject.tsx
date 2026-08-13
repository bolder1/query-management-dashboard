import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, RotateCw, Folder, Search, Check } from 'lucide-react';
import { MOCK_PROJECTS, type ExternalProject, type WizardDraft } from '../../contexts/IntegrationContext';
import { fieldCountForType } from './fieldCatalog';
import {
  ListCount, ListFooter, ListFrame, ListSearch, ListState, ListStrip, ListLabel,
} from './wizardList';

type Status = 'idle' | 'loading' | 'error';

/**
 * Stands in for Jira's `/project/search`. Everything the account can browse
 * comes back in one call — a few dozen projects is nothing to hold in memory,
 * and paging a picker only hides rows behind a button.
 */
function fetchProjects(query: string): Promise<ExternalProject[]> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      // One in twelve searches fails, so the retry path is real rather than decorative.
      if (Math.random() < 0.08 && query.trim()) {
        reject(new Error('network'));
        return;
      }
      const q = query.trim().toLowerCase();
      resolve(
        MOCK_PROJECTS.filter(
          (p) => !q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
        ),
      );
    }, 550);
  });
}

/**
 * Picking the project, as a grid across the page.
 *
 * This was twenty-eight full-width rows in a 56rem column: a folder tile, a
 * name, and a field count marooned at the right margin with a hand's width of
 * nothing between them. Seven fitted on screen, so choosing between twenty-eight
 * meant scrolling a list whose every row was ninety per cent empty.
 *
 * A project is a name, a key and two numbers — a third of a row at most. Three
 * across puts most of the site in view at once, which turns it from a scroll
 * into a comparison. Same shape as the email and field pickers that follow, so
 * the three steps read as one flow.
 */
export function StepProject({
  draft,
  update,
}: {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft>) => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<ExternalProject[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const requestId = useRef(0);

  const selectedId = draft.projectIds[0] ?? '';
  const selected = MOCK_PROJECTS.find((p) => p.id === selectedId);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback((q: string) => {
    const id = ++requestId.current;
    setStatus('loading');
    fetchProjects(q)
      .then((res) => {
        if (id !== requestId.current) return; // a newer search won
        setItems(res);
        setStatus('idle');
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setStatus('error');
      });
  }, []);

  useEffect(() => { load(debounced); }, [debounced, load]);

  return (
    <div className="w-full h-full flex flex-col">
      <ListFrame label="Jira projects">
        <ListSearch
          value={query}
          onChange={setQuery}
          placeholder="Search all projects by name or key"
          busy={status === 'loading' && query !== debounced}
          right={
            status === 'idle'
              ? <ListCount total={items.length} noun="project" filtered={!!debounced.trim()} />
              : undefined
          }
        />

        {status === 'idle' && items.length > 0 && (
          <ListStrip>
            <ListLabel>{debounced ? `Matching “${debounced.trim()}”` : 'All projects on this site'}</ListLabel>
            <ListLabel className="shrink-0">Issues · fields available</ListLabel>
          </ListStrip>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {status === 'loading' ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 animate-pulse"
                >
                  <span className="block h-3.5 w-32 rounded bg-gray-100 dark:bg-gray-800" />
                  <span className="block h-3 w-24 rounded bg-gray-100 dark:bg-gray-800 mt-2" />
                  <span className="block h-3 w-36 rounded bg-gray-100 dark:bg-gray-800 mt-2" />
                </li>
              ))}
            </ul>
          ) : status === 'error' ? (
            <ListState
              icon={AlertCircle}
              tone="error"
              title="Couldn't load projects"
              body="Jira didn't respond. Your session may have expired, or the account lacks browse permission."
              action={{ label: 'Retry', icon: RotateCw, onClick: () => load(debounced) }}
            />
          ) : items.length === 0 ? (
            <ListState
              icon={Search}
              title={debounced ? 'No projects found' : 'No projects on this site'}
              body={
                debounced
                  ? `Nothing matches “${debounced.trim()}”. Try a shorter search, or the project key.`
                  : 'This Atlassian account cannot browse any Jira projects yet. Ask an admin for access, or switch account on the previous step.'
              }
            />
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2" role="radiogroup" aria-label="Jira projects">
              {items.map((p) => {
                const on = p.id === selectedId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => update({ projectIds: [p.id] })}
                      className={`w-full h-full flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                        on
                          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/25'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      <span
                        className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          on ? 'bg-emerald-600' : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        {on
                          ? <Check className="h-4 w-4 text-white" />
                          : <Folder className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                            {p.name}
                          </span>
                          <span className="shrink-0 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1.5 py-px text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            {p.key}
                          </span>
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {p.type}
                        </span>
                        {/*
                         * Both numbers, because they answer different questions:
                         * how much is in there, and how much you will have to
                         * work with on the next step.
                         */}
                        <span className="block text-xs text-gray-400 dark:text-gray-500 tabular-nums mt-1">
                          {p.issues.toLocaleString()} issues · {fieldCountForType(p.type)} fields
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* What you have chosen, held in view however far down you scroll */}
        <ListFooter tone={selected ? 'ok' : 'neutral'}>
          {selected ? (
            <p className="text-[13px] text-emerald-900 dark:text-emerald-200 min-w-0">
              Syncing <span className="font-medium">{selected.name}</span> ({selected.key}) ·{' '}
              {fieldCountForType(selected.type)} fields to choose from
            </p>
          ) : (
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              Pick the project your customer queries live in.
            </p>
          )}
        </ListFooter>
      </ListFrame>
    </div>
  );
}
