import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, RotateCcw, Filter, X, Wand2, Plus, Pencil, Trash2, MoreVertical,
  Eye, EyeOff, Link2Off, Check, Lock, type LucideIcon,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  TARGET_FIELDS, AUTO_TARGETS, EMAIL_TARGET, type FieldMap, type WizardDraft,
} from '../../contexts/IntegrationContext';
import { sampleValue } from './sampleData';
import { FieldIcon } from './StepSelectFields';

/** Dashboard columns the rest of the product depends on. */
const REQUIRED = ['Query Title', 'Created Date', 'Email'];

/**
 * Best guesses used by "Auto-connect". Wider than AUTO_TARGETS, which is
 * deliberately conservative so the mapping step still asks something of you.
 */
const GUESSES: Record<string, string> = {
  ...AUTO_TARGETS,
  Status: 'Status',
  Priority: 'Priority',
  Assignee: 'Owner',
  Reporter: 'Owner',
  'Issue Type': 'Query Type',
  Labels: 'Group',
};

interface Line {
  id: string;
  d: string;
  active: boolean;
}

/** One row of a column's action menu — the label alone says what will happen. */
function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition-colors ${
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function StepFieldMapping({
  draft,
  update,
}: {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft>) => void;
}) {
  const mappings = draft.mappings;
  const setMappings = (m: FieldMap[]) => update({ mappings: m });

  /** The Jira field currently armed, waiting for a column to land on. */
  const [armed, setArmed] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [newColumn, setNewColumn] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);
  /** The column whose action menu is open — only ever one at a time. */
  const [menuFor, setMenuFor] = useState<string | null>(null);
  /**
   * The right-hand list is the user's own — they add, rename and remove
   * columns here, so it lives in state rather than being derived from the
   * built-in catalog.
   */
  const [columns, setColumns] = useState<string[]>(() => [...TARGET_FIELDS]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const canvasRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef(new Map<string, HTMLElement>());
  const rightRefs = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<Line[]>([]);

  /** Every column on the right: the user's list, plus anything already in use. */
  const targets = useMemo(() => {
    const used = mappings.map((m) => m.target.trim()).filter(Boolean);
    return [...new Set([...columns, ...used])];
  }, [mappings, columns]);

  const byTarget = useMemo(() => {
    const map = new Map<string, FieldMap>();
    mappings.forEach((m) => { if (m.target.trim()) map.set(m.target.trim(), m); });
    return map;
  }, [mappings]);

  const connected = mappings.filter((m) => m.target.trim());
  const unconnected = mappings.filter((m) => !m.target.trim());
  /** The field chosen on the email step — locked here so it can't be unpicked. */
  const emailSourceField = draft.emailMapping.sourceField;

  /* --------------------------- Drawing the connections -------------------------- */
  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const next: Line[] = [];
    mappings.forEach((m) => {
      const t = m.target.trim();
      if (!t) return;
      const from = leftRefs.current.get(m.id);
      const to = rightRefs.current.get(t);
      if (!from || !to) return;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const x1 = a.right - box.left;
      const y1 = a.top + a.height / 2 - box.top;
      const x2 = b.left - box.left;
      const y2 = b.top + b.height / 2 - box.top;
      const dx = Math.max(24, (x2 - x1) / 2);
      next.push({
        id: m.id,
        d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
        active: hovered === m.id || armed === m.id,
      });
    });
    setLines(next);
  }, [mappings, hovered, armed]);

  useLayoutEffect(() => { measure(); }, [measure, targets, renaming, addingColumn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(canvas);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure]);

  // Escape cancels the armed field before the wizard sees it as "close me".
  useEffect(() => {
    if (!armed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setArmed(null);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [armed]);

  // A column menu closes on an outside click or Escape, like any other menu.
  useEffect(() => {
    if (!menuFor) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-column-menu]')) setMenuFor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setMenuFor(null); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [menuFor]);

  /* --------------------------------- Actions ---------------------------------- */
  const connect = (fieldId: string, target: string) => {
    // Email is decided on the email step — it never gets taken over here.
    if (target === EMAIL_TARGET) { setArmed(null); return; }
    setMappings(
      mappings.map((m) => {
        if (m.id === fieldId) return { ...m, target, label: target };
        if (m.source === emailSourceField) return m;
        // A column holds one field — bump whoever was there.
        if (m.target.trim() === target) return { ...m, target: '', label: '' };
        return m;
      }),
    );
    setArmed(null);
  };

  const disconnect = (fieldId: string) =>
    setMappings(mappings.map((m) => (m.id === fieldId ? { ...m, target: '', label: '' } : m)));

  const patch = (id: string, p: Partial<FieldMap>) =>
    setMappings(mappings.map((m) => (m.id === id ? { ...m, ...p } : m)));

  /**
   * Connects everything in one pass. An existing free column is always
   * preferred; only when nothing fits does it create one named after the Jira
   * field, so the step can always be completed without hand-building columns.
   */
  const autoConnect = () => {
    const taken = new Set(mappings.map((m) => m.target.trim()).filter(Boolean));
    const created: string[] = [];

    const freeName = (base: string) => {
      if (!taken.has(base)) return base;
      let n = 2;
      while (taken.has(`${base} ${n}`)) n += 1;
      return `${base} ${n}`;
    };

    const next = mappings.map((m) => {
      if (m.target.trim()) return m;
      const guess = GUESSES[m.source];
      let target =
        guess && targets.includes(guess) && !taken.has(guess)
          ? guess
          : targets.includes(m.source) && !taken.has(m.source)
            ? m.source
            : '';
      if (!target) {
        target = freeName(m.source);
        created.push(target);
      }
      taken.add(target);
      return { ...m, target, label: target };
    });

    if (created.length) setColumns((c) => [...c, ...created]);
    setMappings(next);
    setArmed(null);
  };

  const addColumn = () => {
    const name = newColumn.trim();
    if (!name || targets.includes(name)) return;
    setColumns((c) => [...c, name]);
    if (armed) connect(armed, name);
    setNewColumn('');
    setAddingColumn(false);
  };

  /** Renames a column and carries the field connected to it across. */
  const applyRename = (from: string) => {
    const name = renameValue.trim();
    if (!name || name === from || targets.includes(name)) return;
    setColumns((c) => (c.includes(from) ? c.map((t) => (t === from ? name : t)) : [...c, name]));
    setMappings(
      mappings.map((m) => (m.target.trim() === from ? { ...m, target: name, label: name } : m)),
    );
    setRenaming(null);
    setRenameValue('');
  };

  /** Removes a column from the list, freeing whatever field was feeding it. */
  const removeColumn = (t: string) => {
    setColumns((c) => c.filter((x) => x !== t));
    setMappings(mappings.map((m) => (m.target.trim() === t ? { ...m, target: '', label: '' } : m)));
    if (renaming === t) setRenaming(null);
  };

  const startRename = (t: string) => {
    setRenaming(t);
    setRenameValue(t);
    setArmed(null);
    setMenuFor(null);
  };

  const armedField = armed ? mappings.find((m) => m.id === armed) : undefined;
  const missingRequired = REQUIRED.filter((t) => !byTarget.has(t));

  return (
    <div className="w-full">
      {/* Progress + tools */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-28 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  unconnected.length === 0 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${mappings.length ? (connected.length / mappings.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
              <span className="font-medium text-gray-900 dark:text-white">
                {connected.length}/{mappings.length}
              </span>{' '}
              connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unconnected.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={autoConnect}
              title="Connects every field, creating a column wherever nothing matches"
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              Connect all {unconnected.length}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setArmed(null);
              // The email connection comes from the email step — leave it alone.
              setMappings(
                mappings.map((m) =>
                  m.source === emailSourceField ? m : { ...m, target: '', label: '' },
                ),
              );
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        </div>
      </div>

      {/* Hint bar — tells you what to do next, in place */}
      <div
        className={`mt-3 rounded-lg px-3.5 py-2.5 text-xs transition-colors ${
          armed
            ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-800 dark:text-blue-300'
            : unconnected.length > 0
              ? 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400'
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
        }`}
      >
        {armed ? (
          <>Now pick the dashboard column <span className="font-medium">{armedField?.source}</span> should fill — or press Escape to cancel.</>
        ) : unconnected.length > 0 ? (
          <>Click a Jira field on the left, then the column it belongs in. {unconnected.length} still to connect.</>
        ) : (
          <>Every field is connected. Click any pair to change it, or use a column's ⋮ menu to rename it.</>
        )}
      </div>

      {missingRequired.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {missingRequired.join(' and ')} {missingRequired.length > 1 ? 'are' : 'is'} required by Query Results
            and nothing feeds {missingRequired.length > 1 ? 'them' : 'it'} yet.
          </p>
        </div>
      )}

      {/* ------------------------------- The canvas ------------------------------- */}
      <div
        ref={canvasRef}
        className="relative mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-20"
      >
        {/* Connection curves */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full hidden md:block overflow-visible" aria-hidden="true">
          {lines.map((l) => (
            <g key={l.id}>
              <path
                d={l.d}
                fill="none"
                strokeLinecap="round"
                className={l.active ? 'stroke-blue-500' : 'stroke-blue-300 dark:stroke-blue-800'}
                strokeWidth={l.active ? 2.5 : 1.5}
              />
            </g>
          ))}
        </svg>

        {/* ------------------------------ Jira fields ----------------------------- */}
        <div className="relative z-10">
          <p className="text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            FROM JIRA
          </p>
          <div className="space-y-2">
            {mappings.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-8 text-center">
                No fields selected — go back a step to add some.
              </p>
            )}
            {mappings.map((m) => {
              const isArmed = armed === m.id;
              const isConnected = !!m.target.trim();
              const locked = m.source === emailSourceField;
              return (
                <div
                  key={m.id}
                  ref={(el) => { if (el) leftRefs.current.set(m.id, el); else leftRefs.current.delete(m.id); }}
                  onMouseEnter={() => setHovered(m.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`group relative rounded-lg border bg-white dark:bg-gray-900 transition-all ${
                    isArmed
                      ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/50'
                      : isConnected
                        ? 'border-gray-200 dark:border-gray-700'
                        : 'border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10'
                  }`}
                >
                  <button
                    type="button"
                    disabled={locked}
                    title={locked ? 'Chosen on the email step — edit it there' : undefined}
                    onClick={() => setArmed(isArmed ? null : m.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left disabled:cursor-default"
                  >
                    {locked ? (
                      <Lock className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <FieldIcon field={m.source} className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {m.source}
                        </span>
                        {locked && (
                          <span className="shrink-0 rounded-full bg-blue-50 dark:bg-blue-900/40 px-1.5 py-px text-[10px] font-medium text-blue-700 dark:text-blue-300">
                            Email source
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {sampleValue(m.source, 0)}
                      </span>
                    </span>

                    {/* The port the curve leaves from */}
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${
                        isConnected
                          ? 'bg-blue-500'
                          : isArmed
                            ? 'bg-blue-500 animate-pulse'
                            : 'bg-gray-200 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-900'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* --------------------------- Dashboard columns -------------------------- */}
        <div className="relative z-10">
          <p className="text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            YOUR DASHBOARD COLUMNS
          </p>

          <div className="space-y-2">
            {targets.map((t) => {
              const source = byTarget.get(t);
              const required = REQUIRED.includes(t);
              // Email is owned by the email step — never a drop target here.
              const lockedTarget = t === EMAIL_TARGET;
              const selectable = !!armed && !lockedTarget;
              const isRenaming = renaming === t;
              const nameTaken = targets.includes(renameValue.trim()) && renameValue.trim() !== t;
              const menuOpen = menuFor === t;

              return (
                <div
                  key={t}
                  onMouseEnter={() => setHovered(source?.id ?? null)}
                  onMouseLeave={() => setHovered(null)}
                  className={`relative rounded-lg border transition-all ${
                    selectable
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/25'
                      : source
                        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                        : required
                          ? 'border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10'
                          : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30'
                  }`}
                >
                  {isRenaming ? (
                    <div className="p-2">
                      <div className="flex items-center gap-1.5">
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); applyRename(t); }
                            if (e.key === 'Escape') { e.stopPropagation(); setRenaming(null); }
                          }}
                          aria-label={`Rename ${t}`}
                          className="h-8 text-sm"
                        />
                        <Button
                          size="sm"
                          className="h-8 px-2.5"
                          onClick={() => applyRename(t)}
                          disabled={!renameValue.trim() || nameTaken}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5"
                          onClick={() => setRenaming(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-[11px] mt-1.5 px-1 text-gray-500 dark:text-gray-400">
                        {nameTaken
                          ? `You already have a column called “${renameValue.trim()}”.`
                          : `This is the column heading your team will see in Query Results${
                              source ? `, filled by ${source.source}` : ''
                            }.`}
                      </p>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        ref={(el) => { if (el) rightRefs.current.set(t, el); else rightRefs.current.delete(t); }}
                        onClick={() => { if (selectable && armed) connect(armed, t); }}
                        disabled={!selectable}
                        title={lockedTarget ? 'Set on the email step — edit it there' : undefined}
                        className={`w-full flex items-center gap-2.5 pl-3 pr-10 py-2.5 text-left ${
                          selectable ? 'cursor-pointer' : 'disabled:cursor-default'
                        }`}
                      >
                        {/* The port the curve arrives at */}
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${
                            source ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-900'
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-sm truncate ${source ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                              {t}
                            </span>
                            {lockedTarget ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 shrink-0">
                                <Lock className="h-2.5 w-2.5" />
                                From email step
                              </span>
                            ) : required && (
                              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
                                Required
                              </span>
                            )}
                            {/* Only non-default states earn a badge, so a plain column stays quiet */}
                            {source && !source.visible && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 py-px text-[10px] font-medium text-gray-500 dark:text-gray-400 shrink-0">
                                <EyeOff className="h-2.5 w-2.5" />
                                Hidden
                              </span>
                            )}
                            {source?.filterable && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/40 px-1.5 py-px text-[10px] font-medium text-blue-700 dark:text-blue-300 shrink-0">
                                <Filter className="h-2.5 w-2.5" />
                                Filter
                              </span>
                            )}
                          </span>
                          <span className="block text-[11px] truncate mt-0.5">
                            {source ? (
                              <span className="text-blue-600 dark:text-blue-400">← {source.source}</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">Nothing feeds this yet</span>
                            )}
                          </span>
                        </span>
                      </button>

                      {/* One quiet entry point; every option lives behind it */}
                      <div data-column-menu>
                        <button
                          type="button"
                          onClick={() => setMenuFor(menuOpen ? null : t)}
                          aria-label={`Options for the ${t} column`}
                          aria-expanded={menuOpen}
                          title={`Options for the ${t} column`}
                          className={`absolute right-1.5 top-1.5 h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                            menuOpen
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                          }`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {menuOpen && (
                          <div className="absolute right-1.5 top-9 z-30 w-56 max-w-[calc(100vw-3rem)] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1">
                            <p className="px-3 pt-1 pb-1.5 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                              {t}
                            </p>

                            {lockedTarget ? (
                              <p className="px-3 pb-2 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                                Set on the email step.
                              </p>
                            ) : (
                              <MenuItem
                                icon={Pencil}
                                label="Rename this column"
                                onClick={() => startRename(t)}
                              />
                            )}

                            {source && (
                              <>
                                <MenuItem
                                  icon={source.visible ? EyeOff : Eye}
                                  label={source.visible ? 'Hide this column' : 'Show this column'}
                                  onClick={() => {
                                    patch(source.id, { visible: !source.visible });
                                    setMenuFor(null);
                                  }}
                                />
                                <MenuItem
                                  icon={Filter}
                                  label={source.filterable ? 'Stop filtering by this' : 'Let people filter by this'}
                                  onClick={() => {
                                    patch(source.id, { filterable: !source.filterable });
                                    setMenuFor(null);
                                  }}
                                />
                                {!lockedTarget && (
                                  <MenuItem
                                    icon={Link2Off}
                                    label={`Unlink ${source.source}`}
                                    onClick={() => { disconnect(source.id); setMenuFor(null); }}
                                  />
                                )}
                              </>
                            )}

                            {!lockedTarget && !required && (
                              <>
                                <span className="block h-px bg-gray-100 dark:bg-gray-800 my-1" />
                                <MenuItem
                                  icon={Trash2}
                                  danger
                                  label="Delete this column"
                                  onClick={() => { removeColumn(t); setMenuFor(null); }}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Adding sits at the end of the list, where the new column appears */}
            {addingColumn ? (
              <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 p-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    autoFocus
                    value={newColumn}
                    onChange={(e) => setNewColumn(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addColumn(); }
                      if (e.key === 'Escape') { e.stopPropagation(); setAddingColumn(false); setNewColumn(''); }
                    }}
                    placeholder="Name your new column"
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={addColumn}
                    disabled={!newColumn.trim() || targets.includes(newColumn.trim())}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2.5"
                    onClick={() => { setAddingColumn(false); setNewColumn(''); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] mt-1.5 px-1 text-gray-500 dark:text-gray-400">
                  {newColumn.trim() && targets.includes(newColumn.trim())
                    ? `You already have a column called “${newColumn.trim()}”.`
                    : armedField
                      ? `${armedField.source} will be connected to it straight away.`
                      : 'It joins the bottom of the list, ready for a Jira field.'}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setAddingColumn(true); setRenaming(null); setMenuFor(null); }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/15 px-3 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add a new column
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
