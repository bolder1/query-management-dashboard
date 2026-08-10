import { useMemo, useState } from 'react';
import {
  Sparkles, ChevronDown, ChevronUp, Filter, Check, Plug, Database, Columns3,
} from 'lucide-react';
import { useFilters } from '../contexts/FilterContext';
import {
  useIntegrations, customFieldOptions, PROVIDERS,
} from '../contexts/IntegrationContext';
import { useNav } from '../contexts/NavContext';
import { Button } from './ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';

/**
 * Reports-page banner that makes the integration work visible: what is
 * connected, what it brought in, and the filters the field mapping unlocked.
 */
export function IntegrationInsights() {
  const { connections, filterFields } = useIntegrations();
  const { allData, filters, toggleSource, setCustomFilter } = useFilters();
  const { setPage } = useNav();
  const [open, setOpen] = useState(true);

  const connected = PROVIDERS.filter((p) => connections[p.id]);

  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    allData.forEach((r) => {
      const key = r.source ?? 'Manual';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [allData]);

  const importedCount = allData.filter((r) => r.source).length;
  const syncing = connected.some((p) => connections[p.id]?.syncing);

  if (connected.length === 0) {
    return (
      <div className="mx-6 mt-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Plug className="h-4 w-4 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your Jira board isn’t connected yet — link it to pull issues straight into this table.
          </p>
        </div>
        <Button size="sm" className="h-8" onClick={() => setPage('Integrations')}>
          Connect Jira
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-6 mt-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            Your synced dashboard
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
              {importedCount} record{importedCount === 1 ? '' : 's'} from {connected.map((p) => p.name).join(', ')}
              {syncing && ' · syncing now'}
            </span>
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Source toggles */}
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 dark:text-gray-500">
              <Database className="h-3 w-3" />
              SOURCE
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {sources.map(([name, count]) => {
                const active = filters.sources.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleSource(name)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {name}
                    <span className={active ? 'text-blue-100' : 'text-gray-400'}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters unlocked by the field mapping */}
          {filterFields.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 dark:text-gray-500">
                <Filter className="h-3 w-3" />
                FILTERS FROM YOUR FIELD MAPPING
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {filterFields.map((f) => (
                  <div key={f.label} className="min-w-[170px]">
                    <Select
                      value={filters.custom[f.label] || 'all'}
                      onValueChange={(v) => setCustomFilter(f.label, v === 'all' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder={f.label} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All {f.label}</SelectItem>
                        {customFieldOptions(f.label).map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What the integration added */}
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 dark:text-gray-500">
              <Columns3 className="h-3 w-3" />
              ADDED TO THIS REPORT
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 mt-2">
              {[
                'Source, External ID and Project columns in the table',
                'Records refreshed by Start Sync on the integration page',
                filterFields.length
                  ? `${filterFields.length} custom filter${filterFields.length === 1 ? '' : 's'} from your mapping`
                  : 'Mark a mapped field as a filter to add it here',
                `${connected.length} live connection${connected.length === 1 ? '' : 's'} you can manage or remove`,
              ].map((t) => (
                <li key={t} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
