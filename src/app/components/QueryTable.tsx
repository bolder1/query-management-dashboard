import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Download, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown,
  Plus, Columns3, ChevronDown, Check, Plug,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import { useFilters } from '../contexts/FilterContext';
import { AddQueryModal } from './AddQueryModal';
import { ColumnChooser, DEFAULT_COLUMNS, type ColumnKey } from './ColumnChooser';
import { toast } from 'sonner';

type SortDir = 'asc' | 'desc' | null;
type DatePreset = 'today' | 'yesterday' | 'this-week' | 'range' | '';

const ASSIGNEES = ['Aarav Sharma', 'Priya Patel', 'Rohit Mehta', 'Sneha Iyer', 'Vikram Nair', 'Ananya Reddy', 'Karan Malhotra', 'Divya Joshi'];

function startOfDay(d: Date) {
  const c = new Date(d); c.setHours(0, 0, 0, 0); return c;
}

const COL_LABELS: Record<ColumnKey, string> = {
  createDate: 'Query Date',
  accountCreateDate: 'Account Create Date',
  firstPaymentDate: 'First Payment Date',
  replyDate: 'Reply Date',
  customerStatus: 'Customer Status',
  leadStatus: 'Lead Status',
  country: 'Country',
  email: 'Email',
  group: 'Group',
  subject: 'Subject',
  query: 'Query',
  type: 'Type',
  assignee: 'Assignee',
  jiraTicket: 'Jira Ticket',
  thread: 'Thread',
  source: 'Source',
  externalId: 'External ID',
  externalProject: 'Project',
};

/** Badge shown on records that arrived from a connected external system. */
function SourceBadge({ source }: { source?: string }) {
  if (!source) {
    return <span className="text-xs text-gray-400">Manual</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-400">
      <Plug className="h-3 w-3" />
      {source}
    </span>
  );
}

// Inline assignee cell with type + dropdown
function AssigneeCell({ value }: { value: string }) {
  const [current, setCurrent] = useState(value || '');
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const filtered = ASSIGNEES.filter(a => a.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative min-w-[130px]">
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCurrent(''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Assign…"
        className="h-7 text-xs pr-6"
      />
      {current && (
        <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-blue-500 pointer-events-none" />
      )}
      {open && (
        <div className="absolute z-20 mt-0.5 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-36 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">No matches</p>
          ) : (
            filtered.map((a) => (
              <button
                key={a}
                onMouseDown={() => { setCurrent(a); setQuery(a); setOpen(false); }}
                className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {a}
                {current === a && <Check className="h-3 w-3 text-blue-500" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Date preset dropdown
const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this-week' },
  { label: 'Range', value: 'range' },
];

function DateFilterDropdown({
  value, onChange,
  rangeFrom, onRangeFromChange,
  rangeTo, onRangeToChange,
}: {
  value: DatePreset; onChange: (v: DatePreset) => void;
  rangeFrom: string; onRangeFromChange: (v: string) => void;
  rangeTo: string; onRangeToChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = DATE_PRESETS.find(p => p.value === value);

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-md border font-medium transition-colors ${
            value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 hover:border-blue-400'
          }`}
        >
          Date{selected ? `: ${selected.label}` : ''}
          <ChevronDown className="h-3 w-3" />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg w-36 py-1">
            {value && (
              <button
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Clear
              </button>
            )}
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => { onChange(p.value); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between ${
                  value === p.value
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {p.label}
                {value === p.value && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Range inputs appear inline next to the dropdown when Range is selected */}
      {value === 'range' && (
        <div className="flex items-center gap-1.5">
          <Input type="date" value={rangeFrom} onChange={(e) => onRangeFromChange(e.target.value)} className="h-7 text-xs w-32" />
          <span className="text-xs text-gray-400">–</span>
          <Input type="date" value={rangeTo} onChange={(e) => onRangeToChange(e.target.value)} className="h-7 text-xs w-32" />
        </div>
      )}
    </div>
  );
}

export function QueryTable() {
  const { filteredData } = useFilters();

  const [datePreset, setDatePreset] = useState<DatePreset>('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [sortKey, setSortKey] = useState<ColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showColChooser, setShowColChooser] = useState(false);
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(DEFAULT_COLUMNS);

  const handleSort = (key: ColumnKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else { setSortKey(null); setSortDir(null); }
  };

  const SortIcon = ({ col }: { col: ColumnKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    if (sortDir === 'asc') return <ArrowUp className="h-3 w-3 ml-1 text-blue-500" />;
    return <ArrowDown className="h-3 w-3 ml-1 text-blue-500" />;
  };

  const tableData = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());

    let data = [...filteredData];

    if (datePreset === 'today') {
      data = data.filter(r => startOfDay(new Date(r.createDate)).getTime() === today.getTime());
    } else if (datePreset === 'yesterday') {
      data = data.filter(r => startOfDay(new Date(r.createDate)).getTime() === yesterday.getTime());
    } else if (datePreset === 'this-week') {
      data = data.filter(r => { const d = startOfDay(new Date(r.createDate)); return d >= weekStart && d <= today; });
    } else if (datePreset === 'range' && rangeFrom && rangeTo) {
      const from = new Date(rangeFrom); const to = new Date(rangeTo);
      data = data.filter(r => { const d = new Date(r.createDate); return d >= from && d <= to; });
    }

    if (sortKey && sortDir) {
      data.sort((a, b) => {
        const av = String((a as any)[sortKey] ?? '');
        const bv = String((b as any)[sortKey] ?? '');
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    return data;
  }, [filteredData, datePreset, rangeFrom, rangeTo, sortKey, sortDir]);

  const ColHeader = ({ col }: { col: ColumnKey }) => (
    <button
      onClick={() => handleSort(col)}
      className="flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
    >
      {COL_LABELS[col]}
      <SortIcon col={col} />
    </button>
  );

  const renderCell = (row: (typeof filteredData)[0], col: ColumnKey) => {
    switch (col) {
      case 'type':
        return (
          <Select defaultValue={row.type.toLowerCase().replace(/\s+/g, '-')}>
            <SelectTrigger className="w-[140px] h-7 text-xs border-gray-200 dark:border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="setup">Setup</SelectItem>
              <SelectItem value="pricing">Pricing</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
              <SelectItem value="deactivation">Deactivation</SelectItem>
              <SelectItem value="facing-issue">Facing Issue</SelectItem>
              <SelectItem value="new-requirement">New Requirement</SelectItem>
              <SelectItem value="account-issues">Account Issues</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'assignee':
        return <AssigneeCell value={(row as any).assignee || ''} />;
      case 'source':
        return <SourceBadge source={row.source} />;
      case 'externalId':
        return row.externalId ? (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{row.externalId}</span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        );
      case 'thread':
      case 'jiraTicket':
        return (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700">
            {(row as any)[col] || '—'}
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        );
      default:
        return (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {(row as any)[col] || '—'}
          </span>
        );
    }
  };

  return (
    <>
      {showAddModal && <AddQueryModal onClose={() => setShowAddModal(false)} />}
      {showColChooser && (
        <ColumnChooser visible={visibleCols} onChange={setVisibleCols} onClose={() => setShowColChooser(false)} />
      )}

      <div className="bg-white dark:bg-gray-900">
        {/* Toolbar — title + date filter + actions all in one row */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
          {/* Left: title + count + date filter */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">Query Results</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full shrink-0">
              {tableData.length}
            </span>
            <DateFilterDropdown
              value={datePreset}
              onChange={setDatePreset}
              rangeFrom={rangeFrom}
              onRangeFromChange={setRangeFrom}
              rangeTo={rangeTo}
              onRangeToChange={setRangeTo}
            />
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setShowColChooser(true)}>
              <Columns3 className="h-3.5 w-3.5 mr-1.5" />
              Columns
              <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-1.5">
                {visibleCols.length}
              </span>
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => toast.success('Downloading...')}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
            <Button size="sm" className="h-8" onClick={() => setShowAddModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Query
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {visibleCols.map((col) => (
                  <TableHead key={col} className="py-2.5 whitespace-nowrap">
                    <ColHeader col={col} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleCols.length} className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
                    No results found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                tableData.map((row, index) => (
                  <TableRow key={index} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    {visibleCols.map((col) => (
                      <TableCell key={col} className="py-2 whitespace-nowrap">
                        {renderCell(row, col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
