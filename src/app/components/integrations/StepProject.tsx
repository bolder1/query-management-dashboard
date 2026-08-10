import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, RotateCw, Check, Folder, Search, X, History } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MOCK_PROJECTS, type ExternalProject, type WizardDraft } from '../../contexts/IntegrationContext';

/** Projects this workspace has synced before — offered first as a shortcut. */
const RECENT_IDS = ['p1', 'p3'];

const PAGE_SIZE = 6;

type Status = 'idle' | 'loading' | 'paging' | 'error';

/**
 * Stands in for a paginated Jira `/project/search` call: the catalog can be
 * thousands of projects, so we only ever hold one page in memory.
 */
function fetchProjects(query: string, page: number): Promise<{ items: ExternalProject[]; total: number }> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      // One in twelve requests fails, so the retry path is real rather than decorative.
      if (Math.random() < 0.08 && page > 0) {
        reject(new Error('network'));
        return;
      }
      const q = query.trim().toLowerCase();
      const matches = MOCK_PROJECTS.filter(
        (p) =>
          !RECENT_IDS.includes(p.id) &&
          (!q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)),
      );
      resolve({ items: matches.slice(0, (page + 1) * PAGE_SIZE), total: matches.length });
    }, page === 0 ? 550 : 700);
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const requestId = useRef(0);

  const selectedId = draft.projectIds[0] ?? '';

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback((q: string, p: number) => {
    const id = ++requestId.current;
    setStatus(p === 0 ? 'loading' : 'paging');
    fetchProjects(q, p)
      .then((res) => {
        if (id !== requestId.current) return; // a newer search won
        setItems(res.items);
        setTotal(res.total);
        setPage(p);
        setStatus('idle');
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setStatus('error');
      });
  }, []);

  useEffect(() => { load(debounced, 0); }, [debounced, load]);

  const q = debounced.trim().toLowerCase();
  const recent = MOCK_PROJECTS.filter(
    (p) => RECENT_IDS.includes(p.id) &&
      (!q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)),
  );
  const hasMore = items.length < total;

  const Row = ({ p, used }: { p: ExternalProject; used?: boolean }) => {
    const isSelected = p.id === selectedId;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        onClick={() => update({ projectIds: [p.id] })}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/25'
            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60'
        }`}
      >
        <span
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            isSelected ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <Folder className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
            {used && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-1.5 py-px text-[10px] font-medium text-gray-500 dark:text-gray-400">
                <History className="h-2.5 w-2.5" />
                Synced before
              </span>
            )}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {p.key} · {p.type} · {p.issues.toLocaleString()} issues
          </span>
        </span>

        <span
          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all projects by name or key"
          className="pl-9 pr-9 h-10"
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
        {status === 'loading' && query !== debounced && (
          <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500 animate-spin" />
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Jira projects"
        className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {status === 'loading' ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <span className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
                <span className="flex-1">
                  <span className="block h-3 w-40 rounded bg-gray-100 dark:bg-gray-800" />
                  <span className="block h-2.5 w-56 rounded bg-gray-100 dark:bg-gray-800 mt-2" />
                </span>
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-2.5">Couldn't load projects</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              Jira didn't respond. Your session may have expired, or the account lacks browse permission.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load(debounced, page)}>
              <RotateCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : items.length === 0 && recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4">
            <Search className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2.5">No projects found</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Nothing matches “{debounced}”. Try a shorter search or the project key.
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-[26rem] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {recent.length > 0 && (
                <>
                  <p className="px-4 py-2 text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/60">
                    SYNCED BEFORE
                  </p>
                  {recent.map((p) => <Row key={p.id} p={p} used />)}
                </>
              )}

              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/60">
                <p className="text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500">
                  {debounced ? `RESULTS FOR “${debounced}”` : 'ALL PROJECTS'}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{items.length} of {total}</p>
              </div>
              {items.map((p) => <Row key={p.id} p={p} />)}
            </div>

            {hasMore && (
              <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex justify-center">
                <Button variant="outline" size="sm" disabled={status === 'paging'} onClick={() => load(debounced, page + 1)}>
                  {status === 'paging' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    `Load ${Math.min(PAGE_SIZE, total - items.length)} more`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
