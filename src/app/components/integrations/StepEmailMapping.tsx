import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check, AlertCircle, RotateCw, Loader2, Mail, ArrowRight, Search, X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  EMAIL_SOURCE_FIELDS, EMAIL_TARGET, MOCK_PROJECTS,
  type EmailSource, type FieldMap, type WizardDraft,
} from '../../contexts/IntegrationContext';

const PAGE_SIZE = 6;

type Status = 'idle' | 'loading' | 'paging' | 'error';

/**
 * Stands in for reading the project's email-bearing fields out of Jira. A busy
 * Jira site can expose dozens of them, so — exactly like the project step — we
 * search server-side and only ever hold one page.
 */
function fetchEmailFields(query: string, page: number): Promise<{ items: EmailSource[]; total: number }> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      // One in twelve pages fails, so the retry path is real rather than decorative.
      if (Math.random() < 0.08 && page > 0) {
        reject(new Error('network'));
        return;
      }
      const q = query.trim().toLowerCase();
      const matches = EMAIL_SOURCE_FIELDS.filter(
        (f) => !q || f.field.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
      );
      resolve({ items: matches.slice(0, (page + 1) * PAGE_SIZE), total: matches.length });
    }, page === 0 ? 600 : 700);
  });
}

export function StepEmailMapping({
  draft,
  update,
}: {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft>) => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<EmailSource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const requestId = useRef(0);

  const project = MOCK_PROJECTS.find((p) => p.id === draft.projectIds[0]);
  const chosen = draft.emailMapping.sourceField;

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback((q: string, p: number) => {
    const id = ++requestId.current;
    setStatus(p === 0 ? 'loading' : 'paging');
    fetchEmailFields(q, p)
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

  /**
   * Records the choice and writes it straight into the field mapping, so the
   * connection step opens with Email already wired to this field.
   */
  const choose = (field: string) => {
    const rest = draft.mappings
      // Drop the previous email source and free up the Email column.
      .filter((m) => m.source !== chosen)
      .map((m) => (m.target === EMAIL_TARGET ? { ...m, target: '', label: '' } : m));

    const existing = rest.find((m) => m.source === field);
    const mappings = existing
      ? rest.map((m) => (m.source === field ? { ...m, target: EMAIL_TARGET, label: EMAIL_TARGET } : m))
      : [
          ...rest,
          {
            id: `f${field.replace(/\s+/g, '-').toLowerCase()}`,
            source: field,
            target: EMAIL_TARGET,
            label: EMAIL_TARGET,
            visible: true,
            filterable: false,
          } as FieldMap,
        ];

    update({ emailMapping: { sourceField: field }, mappings });
  };

  // Read from the catalog so the summary survives a search that filters it out.
  const selected = EMAIL_SOURCE_FIELDS.find((f) => f.field === chosen);
  const hasMore = items.length < total;

  const Row = ({ f }: { f: EmailSource }) => {
    const on = chosen === f.field;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => choose(f.field)}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
          on ? 'bg-blue-50 dark:bg-blue-900/25' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60'
        }`}
      >
        <span
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            on ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <Mail className={`h-4 w-4 ${on ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{f.field}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.description}</span>
          <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate font-mono">
            {f.samples.filter((s) => s !== '—').join(' · ') || 'No sample values'}
          </span>
        </span>

        <span
          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors ${
            on ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {on && <Check className="h-3 w-3 text-white" />}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search email fields by name"
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

      {/* A fixed frame: the header, the load-more row and the mapping banner
          stay put, and only the list of fields between them scrolls. */}
      <div
        role="radiogroup"
        aria-label="Jira email fields"
        className="mt-3 flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {status === 'loading' ? (
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <span className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
                <span className="flex-1">
                  <span className="block h-3 w-40 rounded bg-gray-100 dark:bg-gray-800" />
                  <span className="block h-2.5 w-56 rounded bg-gray-100 dark:bg-gray-800 mt-2" />
                </span>
              </div>
            ))}
            <p className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Looking for fields that contain an email address…
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center py-14 text-center px-4">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-2.5">
              Couldn't read the project's fields
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              Jira didn't return the field schema. This is usually temporary.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load(debounced, page)}>
              <RotateCw className="h-3.5 w-3.5 mr-1.5" />
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center py-14 text-center px-4">
            <Search className="h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2.5">No email fields found</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              {debounced
                ? `Nothing matches “${debounced}”. Try a shorter search.`
                : `${project ? `${project.name} (${project.key})` : 'This project'} has no field carrying an email
                   address. Add one in Jira, or go back and pick a different project.`}
            </p>
          </div>
        ) : (
          <>
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
              <p className="text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500">
                {debounced
                  ? `RESULTS FOR “${debounced}”`
                  : `EMAIL FIELDS IN ${project ? project.key : 'JIRA'}`}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{items.length} of {total}</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((f) => <Row key={f.field} f={f} />)}
            </div>

            {hasMore && (
              <div className="shrink-0 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={status === 'paging'}
                  onClick={() => load(debounced, page + 1)}
                >
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

        {/* The mapping the choice creates, held at the foot of the frame so it
            stays in view however far down the list you scroll. */}
        <div
          className={`shrink-0 border-t px-4 py-3 ${
            selected
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/40'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80'
          }`}
        >
          {selected ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{selected.field}</span>
                <span className="text-[11px] text-gray-400">Jira</span>
              </span>
              <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-900 px-2.5 py-1.5">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{EMAIL_TARGET}</span>
                <span className="text-[11px] text-gray-400">Dashboard</span>
              </span>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 min-w-0 flex-1">
                {selected.coverage < 60
                  ? `Only ${selected.coverage}% of issues have this filled in — the rest import with an empty email.`
                  : 'Arrives pre-connected on the mapping step, where you can point it elsewhere.'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pick a field above and the mapping it creates appears here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
