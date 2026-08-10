import { X } from 'lucide-react';
import { Button } from './ui/button';

export type ColumnKey =
  | 'createDate' | 'accountCreateDate' | 'firstPaymentDate' | 'replyDate'
  | 'customerStatus' | 'leadStatus' | 'country' | 'email' | 'group'
  | 'subject' | 'query' | 'type' | 'assignee'
  | 'jiraTicket' | 'thread'
  | 'source' | 'externalId' | 'externalProject';

export const DEFAULT_COLUMNS: ColumnKey[] = [
  'createDate', 'source', 'email', 'group', 'query', 'type', 'assignee', 'jiraTicket', 'thread',
];

const ALL_COLUMNS: ColumnKey[] = [
  'createDate', 'accountCreateDate', 'firstPaymentDate', 'replyDate',
  'customerStatus', 'leadStatus', 'country', 'email', 'group',
  'subject', 'query', 'type', 'assignee',
  'source', 'externalId', 'externalProject',
  'jiraTicket', 'thread',
];

interface Group {
  label: string;
  columns: { key: ColumnKey; label: string }[];
}

const GROUPS: Group[] = [
  {
    label: 'DATES',
    columns: [
      { key: 'createDate', label: 'Query date' },
      { key: 'accountCreateDate', label: 'Account create date' },
      { key: 'firstPaymentDate', label: 'First payment date' },
      { key: 'replyDate', label: 'Reply date' },
    ],
  },
  {
    label: 'CUSTOMER DETAILS',
    columns: [
      { key: 'customerStatus', label: 'Customer status' },
      { key: 'leadStatus', label: 'Lead status' },
      { key: 'country', label: 'Country' },
      { key: 'email', label: 'Email' },
      { key: 'group', label: 'Group' },
    ],
  },
  {
    label: 'QUERY DETAILS',
    columns: [
      { key: 'subject', label: 'Subject' },
      { key: 'query', label: 'Query' },
      { key: 'type', label: 'Type' },
      { key: 'assignee', label: 'Assignee' },
    ],
  },
  {
    label: 'SOURCE SYSTEM',
    columns: [
      { key: 'source', label: 'Source' },
      { key: 'externalId', label: 'External ID' },
      { key: 'externalProject', label: 'External project' },
    ],
  },
  {
    label: 'LINKS',
    columns: [
      { key: 'jiraTicket', label: 'Jira Ticket' },
      { key: 'thread', label: 'Thread' },
    ],
  },
];

interface ColumnChooserProps {
  visible: ColumnKey[];
  onChange: (cols: ColumnKey[]) => void;
  onClose: () => void;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? 'bg-blue-600 border-blue-600'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-white fill-none stroke-current stroke-2">
          <polyline points="1,4 3.5,6.5 9,1" />
        </svg>
      )}
    </div>
  );
}

export function ColumnChooser({ visible, onChange, onClose }: ColumnChooserProps) {
  const toggle = (key: ColumnKey) => {
    if (visible.includes(key)) {
      onChange(visible.filter(k => k !== key));
    } else {
      // maintain canonical order
      onChange(ALL_COLUMNS.filter(k => visible.includes(k) || k === key));
    }
  };

  const selectAll = () => onChange([...ALL_COLUMNS]);
  const defaultView = () => onChange([...DEFAULT_COLUMNS]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose visible columns</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Select the columns you want inside Query Results table.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              {visible.length} selected
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>Select all</Button>
          <Button variant="outline" size="sm" onClick={defaultView}>Default view</Button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700" />

        {/* Groups grid */}
        <div className="p-6 grid grid-cols-2 gap-4">
          {GROUPS.map((group) => (
            <div
              key={group.label}
              className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4"
            >
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider mb-3">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.columns.map((col) => (
                  <div
                    key={col.key}
                    onClick={() => toggle(col.key)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-colors bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 select-none"
                  >
                    <Checkbox checked={visible.includes(col.key)} />
                    <span className={visible.includes(col.key) ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button size="sm" onClick={onClose}>Apply</Button>
        </div>
      </div>
    </div>
  );
}
