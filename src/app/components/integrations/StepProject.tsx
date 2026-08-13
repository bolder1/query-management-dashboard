import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, RotateCw, Folder, Search } from 'lucide-react';
import { MOCK_PROJECTS, type ExternalProject, type WizardDraft } from '../../contexts/IntegrationContext';
import { fieldCountForType } from './fieldCatalog';
import {
  ListBody, ListCount, ListFooter, ListFrame, ListSearch, ListSkeleton, ListState,
  ListStrip, ListLabel, RadioDot,
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

  /**
   * One line per project. Name, key, type, field count and size sit in fixed
   * columns so the eye runs straight down each of them, and the whole catalogue
   * is here — scrolling finds a project faster than clicking "load more" and
   * hoping.
   */
  const Row = ({ p }: { p: ExternalProject }) => {
    const on = p.id === selectedId;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => update({ projectIds: [p.id] })}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
          on
            ? 'bg-blue-50 dark:bg-blue-900/25'
            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60'
        }`}
      >
        <span
          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            on ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <Folder className={`h-4 w-4 ${on ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
        </span>

        <span className="min-w-0 flex-1 flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
          <span className="shrink-0 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1.5 py-px text-xs font-medium text-gray-500 dark:text-gray-400">
            {p.key}
          </span>
        </span>

        {/*
         * Field count only. Project type and issue volume were columns you
         * could not act on — neither changes which project is the right one,
         * and both were pulling the eye across the row for nothing. How many
         * fields you'll have to work with is the one number that does.
         */}
        <span className="hidden sm:block w-16 shrink-0 text-[13px] text-gray-500 dark:text-gray-400 tabular-nums text-right">
          {fieldCountForType(p.type)}
        </span>

        <RadioDot on={on} />
      </button>
    );
  };

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
            <span className="hidden sm:flex items-center gap-3 shrink-0">
              <ListLabel className="w-16 text-right">Fields</ListLabel>
              <span className="w-5" aria-hidden />
            </span>
          </ListStrip>
        )}

        <ListBody>
          {status === 'loading' ? (
            <ListSkeleton rows={8} lines={1} />
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
            items.map((p) => <Row key={p.id} p={p} />)
          )}
        </ListBody>

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
