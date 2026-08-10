import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, Sparkles, Loader2, Folder, Search, X, ArrowUp, ArrowDown, Plus, Columns3,
  GripVertical, Type, AlignLeft, CircleDot, UserRound, Mail, Flag, Shapes, CalendarDays,
  CalendarClock, Tags, Boxes, CircleCheck, Link2, Hash, Timer, GitBranch,
  Server, Inbox, AlarmClock, Star, FileText, ShieldCheck, Wallet, Circle, ChevronLeft,
  CheckSquare, Square,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DEFAULT_MAPPINGS, MOCK_PROJECTS, AUTO_TARGETS,
  type FieldMap, type WizardDraft,
} from '../../contexts/IntegrationContext';
import { sampleValue } from './sampleData';

/** The fuller set behind "Use recommended" — opt-in, never applied on its own. */
const RECOMMENDED_BASE = DEFAULT_MAPPINGS.map((m) => m.source);

/**
 * What arrives ticked. Deliberately minimal: these are the only fields the
 * dashboard genuinely needs — Summary and Created feed the two required
 * columns, and Description carries the query itself. Everything else is the
 * user's call.
 */
const STARTER_FIELDS = ['Summary', 'Description', 'Created'];

/** Fields that only exist on certain kinds of Jira project. */
const TYPE_FIELDS: Record<string, string[]> = {
  'Service Management': ['Request Type', 'SLA Breach', 'Satisfaction Rating'],
  Software: ['Release Notes', 'Code Branch'],
  Business: ['Approver', 'Cost Centre'],
};

/** Grouping mirrors how Jira presents its own field picker. */
const GROUPS: { name: string; fields: string[] }[] = [
  { name: 'Content', fields: ['Summary', 'Description', 'Labels', 'Components', 'Environment'] },
  { name: 'People', fields: ['Assignee', 'Reporter', 'Reporter Email'] },
  { name: 'Status', fields: ['Status', 'Priority', 'Resolution', 'Issue Type'] },
  { name: 'Dates', fields: ['Created', 'Due Date'] },
  { name: 'Planning', fields: ['Project', 'Epic Link', 'Story Points', 'Sprint', 'Fix Version'] },
];

const FIELD_ICONS: Record<string, LucideIcon> = {
  Summary: Type, Description: AlignLeft, Status: CircleDot, Assignee: UserRound,
  Reporter: UserRound, 'Reporter Email': Mail, Priority: Flag, Project: Folder,
  'Issue Type': Shapes, Created: CalendarDays, 'Due Date': CalendarClock, Labels: Tags,
  Components: Boxes, Resolution: CircleCheck, 'Epic Link': Link2, 'Story Points': Hash,
  Sprint: Timer, 'Fix Version': GitBranch, Environment: Server, 'Request Type': Inbox,
  'SLA Breach': AlarmClock, 'Satisfaction Rating': Star, 'Release Notes': FileText,
  'Code Branch': GitBranch, Approver: ShieldCheck, 'Cost Centre': Wallet,
};

export function FieldIcon({ field, className }: { field: string; className?: string }) {
  const Icon = FIELD_ICONS[field] ?? Circle;
  return <Icon className={className} />;
}

const SCAN_PHASES = ['Connecting to project', 'Reading issue schema', 'Discovering fields'];

/**
 * The table keeps a fixed frame — header, body and footer never move — while
 * only the rows inside scroll. The body takes whatever height is left in the
 * panel so the step itself never scrolls: one scrollbar, always in the list.
 */
const BODY_HEIGHT = 'flex-1 min-h-[10rem]';

export function StepSelectFields({
  draft,
  update,
}: {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft>) => void;
}) {
  const mappings = draft.mappings;
  const setMappings = (m: FieldMap[]) => update({ mappings: m });

  const project = MOCK_PROJECTS.find((p) => p.id === draft.projectIds[0]);
  const emailSource = draft.emailMapping.sourceField;
  const [phase, setPhase] = useState(0);
  /** The panel is either the chosen-field table or the Jira field browser. */
  const [mode, setMode] = useState<'table' | 'add'>('table');
  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Mirrors dragId so the drop handler never reads a stale render's closure.
  const dragIdRef = useRef<string | null>(null);
  const timers = useRef<number[]>([]);
  const scanning = phase < SCAN_PHASES.length;

  /** Field groups available on this project — the schema depends on its type. */
  const groups = useMemo(() => {
    const extra = project ? TYPE_FIELDS[project.type] ?? [] : [];
    return extra.length ? [...GROUPS, { name: `${project!.type} fields`, fields: extra }] : GROUPS;
  }, [project]);

  const allFields = useMemo(() => groups.flatMap((g) => g.fields), [groups]);

  // Walk the scan phases once per project, then reveal the table.
  useEffect(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setPhase(0);
    SCAN_PHASES.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setPhase(i + 1), 500 * (i + 1)));
    });
    return () => timers.current.forEach(window.clearTimeout);
  }, [allFields]);

  // Escape leaves the field browser before the wizard reads it as "close me".
  useEffect(() => {
    if (mode !== 'add') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setMode('table'); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [mode]);

  const chosenSet = useMemo(() => new Set(mappings.map((m) => m.source)), [mappings]);

  /** The email step's field is always part of the recommended set. */
  const recommended = useMemo(
    () => (emailSource ? [...new Set([emailSource, ...RECOMMENDED_BASE])] : RECOMMENDED_BASE),
    [emailSource],
  );

  /**
   * Builds a row for a Jira field. Only fields we can confidently match arrive
   * pre-mapped — the rest are left blank for the mapping step.
   */
  const rowFor = (field: string): FieldMap => {
    // The email step already decided where this one goes.
    const target = field === emailSource ? 'Email' : AUTO_TARGETS[field] ?? '';
    return {
      id: `f${field.replace(/\s+/g, '-').toLowerCase()}`,
      source: field, target, label: target,
      visible: true, filterable: false,
    };
  };

  /**
   * First time through, tick only the handful the dashboard can't work without,
   * so the step opens with a usable table and still leaves the choosing to the
   * user. Runs once per setup — `fieldsSeeded` means clearing stays cleared.
   */
  useEffect(() => {
    if (scanning || draft.fieldsSeeded) return;
    const wanted = [emailSource, ...STARTER_FIELDS].filter(
      (f) => f && (allFields.includes(f) || f === emailSource),
    );
    const add = wanted.filter((f) => !chosenSet.has(f)).map(rowFor);
    update({ mappings: add.length ? [...mappings, ...add] : mappings, fieldsSeeded: true });
    // rowFor/recommended are derived from these same inputs, so this is the full set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, draft.fieldsSeeded, allFields, emailSource]);

  const toggle = (field: string) => {
    if (chosenSet.has(field)) {
      // The email field is set on the previous step; it cannot be dropped here.
      if (field === emailSource) return;
      setMappings(mappings.filter((m) => m.source !== field));
    } else {
      setMappings([...mappings, rowFor(field)]);
    }
  };

  /** Moves a chosen field within the list — this is the column order. */
  const move = (id: string, dir: -1 | 1) => {
    const list = [...mappings];
    const from = list.findIndex((m) => m.id === id);
    if (from + dir < 0 || from + dir >= list.length) return;
    const [moved] = list.splice(from, 1);
    list.splice(from + dir, 0, moved);
    setMappings(list);
  };

  /** Drops the dragged field onto the row it was released over. */
  const reorder = (from: string, to: string) => {
    if (from === to) return;
    const list = [...mappings];
    const fromIdx = list.findIndex((m) => m.id === from);
    const toIdx = list.findIndex((m) => m.id === to);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setMappings(list);
  };

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({ ...g, fields: g.fields.filter((f) => !q || f.toLowerCase().includes(q)) }))
      .filter((g) => g.fields.length > 0);
  }, [groups, query]);

  const matchCount = filteredGroups.reduce((n, g) => n + g.fields.length, 0);
  const remaining = allFields.filter((f) => !chosenSet.has(f)).length;

  /**
   * Select/deselect works on whatever the search is currently showing, so it
   * reads as "everything I can see" rather than silently touching fields that
   * are scrolled out of the filter. The email step's field never moves.
   */
  const shownFields = filteredGroups.flatMap((g) => g.fields);
  const togglable = shownFields.filter((f) => f !== emailSource);
  const shownSelected = togglable.filter((f) => chosenSet.has(f)).length;
  const allShownSelected = togglable.length > 0 && shownSelected === togglable.length;

  const toggleAllShown = () => {
    if (allShownSelected) {
      const drop = new Set(togglable);
      setMappings(mappings.filter((m) => !drop.has(m.source)));
    } else {
      const add = togglable.filter((f) => !chosenSet.has(f)).map(rowFor);
      setMappings([...mappings, ...add]);
    }
  };

  const openPicker = () => { setQuery(''); setMode('add'); };

  /* ------------------------------- Schema scan ------------------------------ */
  if (scanning) {
    return (
      <div className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/15 px-5 py-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {SCAN_PHASES[Math.min(phase, SCAN_PHASES.length - 1)]}…
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Reading the issue schema from {project ? `${project.name} (${project.key})` : 'your project'}.
            </p>
          </div>
        </div>
        <div className="h-1 rounded-full bg-white/70 dark:bg-gray-800 mt-5 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${((phase + 1) / (SCAN_PHASES.length + 1)) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  /* ------------------------------ Field browser ----------------------------- */
  if (mode === 'add') {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setMode('table')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to your fields
          </button>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">{mappings.length}</span> added ·{' '}
            {remaining} still available
          </p>
        </div>

        <div className="mt-3 flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${project ? project.key : 'Jira'} fields…`}
                className="pl-9 pr-9 h-10 bg-white dark:bg-gray-900"
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

          {matchCount > 0 && (
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                  {shownSelected}
                </span>{' '}
                of {togglable.length} {query.trim() ? 'matching ' : ''}field
                {togglable.length === 1 ? '' : 's'} selected
              </p>
              <button
                type="button"
                onClick={toggleAllShown}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/25 transition-colors"
              >
                {allShownSelected ? (
                  <>
                    <Square className="h-3.5 w-3.5" />
                    Deselect {query.trim() ? 'these' : 'all'}
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5" />
                    Select {query.trim() ? 'these' : 'all'}
                  </>
                )}
              </button>
            </div>
          )}

          <div className={`${BODY_HEIGHT} overflow-y-auto`}>
            {matchCount === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Search className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2.5">No field matches</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Nothing in this project is called “{query.trim()}”.
                </p>
              </div>
            ) : (
              filteredGroups.map((g) => (
                <div key={g.name}>
                  <p className="px-4 py-1.5 text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/60 sticky top-0">
                    {g.name.toUpperCase()}
                  </p>
                  {g.fields.map((field) => {
                    const on = chosenSet.has(field);
                    const locked = field === emailSource;
                    return (
                      <button
                        key={field}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        disabled={locked}
                        title={locked ? 'Set on the email step' : undefined}
                        onClick={() => toggle(field)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed ${
                          on
                            ? 'bg-blue-50/70 dark:bg-blue-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        <span
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            on ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                          } ${locked ? 'opacity-60' : ''}`}
                        >
                          {on && <Check className="h-3 w-3 text-white" />}
                        </span>
                        <FieldIcon field={field} className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">{field}</span>
                        <span className="text-[11px] text-gray-400 truncate max-w-[9rem]">
                          {locked ? 'Email field' : sampleValue(field, 0)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tick a field to add it. Nothing is added until you tick it.
            </p>
            <Button size="sm" onClick={() => setMode('table')}>
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- Chosen fields ---------------------------- */
  return (
    <div className="w-full h-full flex flex-col">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-white">
            {mappings.length} field{mappings.length === 1 ? '' : 's'}
          </span>{' '}
          selected from {project ? project.key : 'Jira'}
        </p>

        <div className="flex items-center gap-3 shrink-0">
          {mappings.length > 0 && (
            <button
              // The email step's field stays — it is required downstream.
              onClick={() => setMappings(mappings.filter((m) => m.source === emailSource))}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Clear all
            </button>
          )}
          <Button className="h-10 px-4 shadow-sm" onClick={openPicker}>
            <Plus className="h-4 w-4 mr-2" />
            Add new field
            {remaining > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
                {remaining}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Fixed table frame — only the rows inside it scroll */}
      <div className="mt-3 flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="shrink-0 grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_5.5rem] gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
          {['Order', 'Jira field', 'Sample value', ''].map((h, i) => (
            <p
              key={i}
              className={`text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500 ${
                i === 2 ? 'hidden sm:block' : ''
              }`}
            >
              {h}
            </p>
          ))}
        </div>

        <div className={`${BODY_HEIGHT} overflow-y-auto`}>
          {mappings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Columns3 className="h-6 w-6 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2.5">No fields added yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                The table starts empty — add as many Jira fields as you need, then drag them into the order you
                want your columns in.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <Button onClick={openPicker}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add new field
                </Button>
                <Button variant="outline" onClick={() => setMappings(recommended.map(rowFor))}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Use recommended
                </Button>
              </div>
            </div>
          ) : (
            <ol className="divide-y divide-gray-100 dark:divide-gray-800">
              {mappings.map((m, i) => {
                const locked = m.source === emailSource;
                return (
                  <li
                    key={m.id}
                    draggable
                    onDragStart={(e) => {
                      dragIdRef.current = m.id;
                      setDragId(m.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', m.id);
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverId(m.id); }}
                    onDragLeave={() => setOverId((o) => (o === m.id ? null : o))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragIdRef.current ?? e.dataTransfer.getData('text/plain');
                      if (from) reorder(from, m.id);
                      dragIdRef.current = null;
                      setDragId(null);
                      setOverId(null);
                    }}
                    onDragEnd={() => { dragIdRef.current = null; setDragId(null); setOverId(null); }}
                    className={`grid grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_5.5rem] gap-3 px-4 py-2.5 items-center group cursor-grab active:cursor-grabbing transition-colors ${
                      dragId === m.id
                        ? 'opacity-40 bg-gray-50 dark:bg-gray-800'
                        : overId === m.id && dragId
                          ? 'bg-blue-50 dark:bg-blue-900/25 ring-1 ring-inset ring-blue-400'
                          : 'bg-white dark:bg-gray-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 shrink-0" />
                      <span className="text-xs tabular-nums text-gray-400">{i + 1}</span>
                    </span>

                    <span className="flex items-center gap-2 min-w-0">
                      <FieldIcon field={m.source} className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-white truncate">{m.source}</span>
                      {locked && (
                        <span className="shrink-0 rounded-full bg-blue-50 dark:bg-blue-900/40 px-1.5 py-px text-[10px] font-medium text-blue-700 dark:text-blue-300">
                          Email
                        </span>
                      )}
                    </span>

                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                      {sampleValue(m.source, 0)}
                    </span>

                    <span className="flex items-center justify-end">
                      <button
                        onClick={() => move(m.id, -1)}
                        disabled={i === 0}
                        aria-label={`Move ${m.source} up`}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => move(m.id, 1)}
                        disabled={i === mappings.length - 1}
                        aria-label={`Move ${m.source} down`}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setMappings(mappings.filter((x) => x.id !== m.id))}
                        disabled={locked}
                        aria-label={locked ? `${m.source} is set on the email step` : `Remove ${m.source}`}
                        title={locked ? 'Set on the email step' : undefined}
                        className="p-1 rounded text-gray-400 hover:text-red-600 disabled:opacity-25 disabled:hover:text-gray-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Always-visible way to add more, pinned under the scrolling rows */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={openPicker}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/25 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add new field
            {remaining > 0 && (
              <span className="text-xs font-normal text-blue-700 dark:text-blue-300">
                {remaining} available
              </span>
            )}
          </button>
        </div>
      </div>

      {mappings.length > 0 && (
        <p className="shrink-0 text-xs text-gray-500 dark:text-gray-400 mt-3">
          Drag a row to reorder — this is the order your columns appear in. You'll connect them to dashboard
          columns next.
        </p>
      )}
    </div>
  );
}
