import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, X, Search, Wand2, ArrowRight, Mail, Sparkles, GripVertical, Pencil, Trash2,
  Loader2, Filter, Eye, EyeOff, Table2, AlertTriangle, CheckSquare,
  Square, Columns3,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Pill } from '../ui/pill';
import {
  REQUIRED_COLUMNS, EMAIL_TARGET, EMAIL_SOURCE_FIELDS, MOCK_PROJECTS,
  type FieldMap, type WizardDraft,
} from '../../contexts/IntegrationContext';
import { sampleValue } from './sampleData';
import { FieldIcon, fieldsForProject, emailCoverage, isEmailField } from './fieldCatalog';

/**
 * Building your table, in three beats: the email, the fields, the names.
 *
 * The version this replaces put every decision on screen at once — a grid of
 * column cards, each carrying a mapping, a rename, a reorder, a remove and two
 * toggles. Everything was reachable and nothing was obvious, because the screen
 * never said what to do first.
 *
 * So it asks one thing at a time, and each beat is the shape of its own
 * question:
 *
 *   1. The email gets a screen of its own. It is the only field the dashboard
 *      threads conversations on, the hardest to guess, and the one where being
 *      wrong is expensive — so it is asked first, plainly, with how often each
 *      candidate is actually filled in.
 *   2. Then the fields: tick what you want, or take the lot. No mapping, no
 *      naming, just "what exists that I care about".
 *   3. Then the names. The fields you picked resolve into columns one at a
 *      time, each already carrying a sensible name, and every name is an input
 *      you can type over. The table underneath fills in as they land.
 *
 * You can jump back to any beat from the rail. Reopening a finished setup lands
 * on the third, because that is where the answers live.
 */

type Phase = 'email' | 'fields' | 'name';

const PHASES: { id: Phase; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'fields', label: 'Choose fields' },
  { id: 'name', label: 'Name your columns' },
];

/** Where we can confidently send a Jira field without being asked. */
const SUGGESTIONS: Record<string, string> = {
  Summary: 'Query Title',
  Description: 'Description',
  Created: 'Created Date',
  Status: 'Status',
  Priority: 'Priority',
  Assignee: 'Owner',
  Reporter: 'Owner',
  'Issue Type': 'Query Type',
  Labels: 'Group',
  Components: 'Group',
};

/** Ticked when the field list first opens — the shape a dashboard usually has. */
const RECOMMENDED = ['Summary', 'Created', 'Description', 'Status', 'Priority', 'Assignee', 'Issue Type'];

/** The column a Jira field becomes if nobody renames it. */
function columnFor(field: string, taken: Set<string>) {
  const guess = SUGGESTIONS[field];
  if (guess && !taken.has(guess)) return guess;
  return taken.has(field) ? `${field} (2)` : field;
}

function rowFor(field: string, column: string): FieldMap {
  return {
    id: `f-${field.replace(/\s+/g, '-').toLowerCase()}`,
    source: field,
    target: column,
    label: column,
    visible: true,
    filterable: false,
  };
}

/** The Email column is fed like any other, so the email source is read back off it. */
function deriveEmail(mappings: FieldMap[]) {
  return { sourceField: mappings.find((m) => m.target === EMAIL_TARGET)?.source ?? '' };
}

const SCAN_PHASES = ['Connecting to project', 'Reading issue schema', 'Discovering fields'];

export function StepMapFields({
  draft,
  update,
}: {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft>) => void;
}) {
  const mappings = draft.mappings;
  const project = MOCK_PROJECTS.find((p) => p.id === draft.projectIds[0]);
  const emailRow = mappings.find((m) => m.target === EMAIL_TARGET);

  /** Where a returning user picks up: whichever beat still has a question in it. */
  const [phase, setPhase] = useState<Phase>(() => {
    if (!emailRow?.source) return 'email';
    if (mappings.filter((m) => m.source.trim()).length <= 1) return 'fields';
    return 'name';
  });

  /** The dashboard preview, on demand rather than always underneath. */
  const [preview, setPreview] = useState(false);
  /** How many columns have landed. `null` once the reveal is over. */
  const [revealed, setRevealed] = useState<number | null>(null);
  const [scanPhase, setScanPhase] = useState(draft.fieldsSeeded ? SCAN_PHASES.length : 0);
  const scanning = scanPhase < SCAN_PHASES.length;
  const timers = useRef<number[]>([]);

  const catalog = useMemo(() => fieldsForProject(project?.type), [project?.type]);

  useEffect(() => {
    if (draft.fieldsSeeded) return;
    SCAN_PHASES.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setScanPhase(i + 1), 450 * (i + 1)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const commit = (next: FieldMap[]) =>
    update({ mappings: next, emailMapping: deriveEmail(next), fieldsSeeded: true });

  /* ------------------------------- Beat one -------------------------------- */

  const setEmailSource = (field: string) => {
    const rest = mappings.filter((m) => m.target !== EMAIL_TARGET && m.source !== field);
    commit([rowFor(field, EMAIL_TARGET), ...rest]);
  };

  /* ------------------------------- Beat two -------------------------------- */

  const selected = useMemo(
    () => new Set(mappings.filter((m) => m.target !== EMAIL_TARGET).map((m) => m.source)),
    [mappings],
  );

  const setSelection = (fields: string[]) => {
    const keepEmail = mappings.find((m) => m.target === EMAIL_TARGET);
    const taken = new Set<string>(keepEmail ? [EMAIL_TARGET] : []);
    const rows = fields.map((f) => {
      const column = columnFor(f, taken);
      taken.add(column);
      // Renames survive re-picking — you named it once, you meant it.
      const existing = mappings.find((m) => m.source === f && m.target !== EMAIL_TARGET);
      return existing ? { ...existing } : rowFor(f, column);
    });
    commit(keepEmail ? [keepEmail, ...rows] : rows);
  };

  /**
   * The hand-off from picking to naming. Columns land one at a time so the
   * table builds itself in front of you, rather than a finished table appearing
   * the instant you press a button.
   */
  const startNaming = () => {
    setPhase('name');
    setRevealed(0);
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    const total = mappings.length;
    for (let i = 1; i <= total; i++) {
      timers.current.push(window.setTimeout(() => setRevealed(i === total ? null : i), 110 * i));
    }
  };

  /* ------------------------------ Beat three ------------------------------- */

  const rename = (id: string, name: string) => {
    commit(mappings.map((m) => {
      if (m.id !== id) return m;
      // The three the product depends on keep their role; only their name moves.
      const locked = REQUIRED_COLUMNS.includes(m.target);
      return locked ? { ...m, label: name } : { ...m, target: name, label: name };
    }));
  };

  const patch = (id: string, p: Partial<FieldMap>) =>
    commit(mappings.map((m) => (m.id === id ? { ...m, ...p } : m)));

  const remove = (id: string) => commit(mappings.filter((m) => m.id !== id));

  /** Drop a row onto another and it takes that place — this is column order. */
  const reorder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const list = [...mappings];
    const from = list.findIndex((m) => m.id === fromId);
    const to = list.findIndex((m) => m.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    commit(list);
  };

  /* -------------------------------- Derived -------------------------------- */

  const shown = revealed === null ? mappings : mappings.slice(0, revealed);
  /** What the preview would actually show — the button badges this. */
  const visibleCount = shown.filter((m) => m.visible).length;
  const missingRequired = REQUIRED_COLUMNS.filter(
    (c) => !mappings.some((m) => m.target === c && m.source.trim()),
  );

  if (scanning) {
    return (
      <div className="w-full rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/15 px-5 py-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {SCAN_PHASES[Math.min(scanPhase, SCAN_PHASES.length - 1)]}…
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Reading the issue schema from {project ? `${project.name} (${project.key})` : 'your project'}.
            </p>
          </div>
        </div>
        <div className="h-1 rounded-full bg-white/70 dark:bg-gray-800 mt-5 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${((scanPhase + 1) / (SCAN_PHASES.length + 1)) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      {/* Title and rail share one row. This step needs its height for the work,
          not for a headline that the beat below repeats. */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Build your table</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <PhaseRail
            phase={phase}
            onGo={setPhase}
            emailDone={!!emailRow?.source}
            fieldsDone={selected.size > 0}
          />
          <span className="h-5 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
          {/*
           * The preview used to sit under every beat, costing 170px of a screen
           * that was already short on height. It is a thing you check, not a
           * thing you watch — so it is a button now, and the work gets the room.
           */}
          <Button
            variant="outline"
            size="sm"
            disabled={visibleCount === 0}
            title={visibleCount === 0 ? 'Nothing to preview yet' : undefined}
            onClick={() => setPreview(true)}
          >
            <Table2 className="h-3.5 w-3.5 mr-1.5" />
            Preview
            {visibleCount > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 text-xs font-semibold tabular-nums">
                {visibleCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <section className="flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {phase === 'email' && (
          <EmailPhase
            chosen={emailRow?.source ?? ''}
            onPick={setEmailSource}
            onNext={() => setPhase('fields')}
          />
        )}
        {phase === 'fields' && (
          <FieldsPhase
            catalog={catalog}
            project={project?.key}
            emailField={emailRow?.source ?? ''}
            selected={selected}
            onChange={setSelection}
            onNext={startNaming}
          />
        )}
        {phase === 'name' && (
          <NamePhase
            mappings={shown}
            total={mappings.length}
            revealing={revealed !== null}
            missingRequired={missingRequired}
            onRename={rename}
            onPatch={patch}
            onRemove={remove}
            onReorder={reorder}
            onBackToFields={() => setPhase('fields')}
          />
        )}
      </section>

      {preview && (
        <PreviewDialog
          mappings={shown}
          project={project ? { name: project.name, key: project.key } : undefined}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}

/* ---------------------------------- Rail ----------------------------------- */

function PhaseRail({
  phase, onGo, emailDone, fieldsDone,
}: {
  phase: Phase;
  onGo: (p: Phase) => void;
  emailDone: boolean;
  fieldsDone: boolean;
}) {
  const done: Record<Phase, boolean> = { email: emailDone, fields: fieldsDone, name: false };
  const reachable: Record<Phase, boolean> = { email: true, fields: emailDone, name: emailDone && fieldsDone };

  return (
    <nav aria-label="Mapping steps" className="shrink-0 flex items-center gap-1 flex-wrap">
      {PHASES.map((p, i) => {
        const on = p.id === phase;
        return (
          <span key={p.id} className="flex items-center gap-1">
            {i > 0 && <span className="h-px w-4 sm:w-6 bg-gray-200 dark:bg-gray-700" />}
            <button
              type="button"
              onClick={() => onGo(p.id)}
              disabled={!reachable[p.id]}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed ${
                on
                  ? 'bg-gray-900 dark:bg-gray-700 text-white'
                  : reachable[p.id]
                    ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'text-gray-300 dark:text-gray-600'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                  on
                    ? 'bg-white/20'
                    : done[p.id]
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {done[p.id] && !on ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {p.label}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

/* -------------------------------- Beat one --------------------------------- */

/**
 * The email, on its own, first.
 *
 * It earns a beat to itself because it is the field the dashboard threads
 * conversations on, and because "which of these sixteen fields actually has an
 * address in it" is a question only the data can answer — so every candidate
 * carries how often it is filled in, and the list is ordered by that.
 */
function EmailPhase({
  chosen, onPick, onNext,
}: {
  chosen: string;
  onPick: (field: string) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState('');
  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...EMAIL_SOURCE_FIELDS]
      .sort((a, b) => b.coverage - a.coverage)
      .filter((f) => !q || f.field.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <header className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-gray-400" />
            Where does the customer's email come from?
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            This is what replies get threaded onto, so it is worth getting right. The percentage is how often
            each field actually has an address in it.
          </p>
        </div>
        <span className="flex-1" />
        <span className="relative w-full sm:w-56 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email fields"
            className="pl-8 h-8 text-[13px] bg-white dark:bg-gray-900"
          />
        </span>
      </header>

      {/*
       * A grid, not a list. Each option is a name and a sentence — perhaps a
       * third of a row's width — so one per line pushed sixteen candidates over
       * three screens of scrolling and left a hand's width of nothing down the
       * middle. Three across puts the whole shortlist in view at once, which is
       * what makes it a comparison rather than a scroll.
       *
       * The sample address and the coverage bar came off with the width. The
       * percentage stayed: across sixteen fields whose names all sound alike,
       * how often a field is actually filled in is the only thing that makes
       * this a decision rather than a guess — it just never needed 112px of bar
       * to say a number.
       */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {ranked.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-gray-500 dark:text-gray-400">
            No email field is called “{query.trim()}”.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {ranked.map((f, i) => {
              const on = chosen === f.field;
              return (
                <li key={f.field}>
                  <button
                    type="button"
                    onClick={() => onPick(f.field)}
                    aria-pressed={on}
                    className={`w-full h-full flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                      on
                        ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/25'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <span
                      className={`h-4 w-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        on ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {on && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                          {f.field}
                        </span>
                        {i === 0 && !query.trim() && (
                          <Pill tone="accent" size="xs" icon={Sparkles}>Best</Pill>
                        )}
                        <span
                          className={`text-xs font-medium tabular-nums ml-auto shrink-0 ${
                            f.coverage >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : f.coverage >= 50
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-gray-400 dark:text-gray-500'
                          }`}
                          title={`${f.coverage}% of recent issues have this field filled in`}
                        >
                          {f.coverage}%
                        </span>
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        {f.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-[13px] min-w-0 truncate">
          {chosen ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5 shrink-0" />
              Email will be read from {chosen}
            </span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">Pick one to carry on.</span>
          )}
        </p>
        <Button size="sm" disabled={!chosen} onClick={onNext} className="shrink-0">
          Next: choose fields
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </footer>
    </>
  );
}

/* -------------------------------- Beat two --------------------------------- */

/**
 * What else should come across. Tick boxes and nothing else — no destinations,
 * no names, no order. One question at a time is the whole point of splitting
 * this up, and "select all" has to be one click because plenty of people want
 * exactly that.
 */
function FieldsPhase({
  catalog, project, emailField, selected, onChange, onNext,
}: {
  catalog: { name: string; fields: string[] }[];
  project?: string;
  emailField: string;
  selected: Set<string>;
  onChange: (fields: string[]) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState('');

  /** The email is already coming across, so it is not on offer here. */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .map((g) => ({
        ...g,
        fields: g.fields.filter((f) => f !== emailField && (!q || f.toLowerCase().includes(q))),
      }))
      .filter((g) => g.fields.length > 0);
  }, [catalog, emailField, query]);

  const shownFields = groups.flatMap((g) => g.fields);
  const allShown = shownFields.length > 0 && shownFields.every((f) => selected.has(f));
  const order = useMemo(() => catalog.flatMap((g) => g.fields), [catalog]);

  /** Keeps the catalogue's order however the boxes get ticked. */
  const applied = (next: Set<string>) => onChange(order.filter((f) => next.has(f)));

  const toggle = (field: string) => {
    const next = new Set(selected);
    if (next.has(field)) next.delete(field); else next.add(field);
    applied(next);
  };

  const toggleAllShown = () => {
    const next = new Set(selected);
    if (allShown) shownFields.forEach((f) => next.delete(f));
    else shownFields.forEach((f) => next.add(f));
    applied(next);
  };

  const useRecommended = () => applied(new Set(RECOMMENDED.filter((f) => order.includes(f))));

  return (
    <>
      <header className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Columns3 className="h-4 w-4 text-gray-400" />
            What else should come across?
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tick anything you want on the dashboard. You will name the columns next.
          </p>
        </div>
        <span className="flex-1" />
        <span className="relative w-full sm:w-56 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${project ?? 'Jira'} fields`}
            className="pl-8 h-8 text-[13px] bg-white dark:bg-gray-900"
          />
        </span>
      </header>

      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <p className="text-[13px] text-gray-600 dark:text-gray-300">
          <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{selected.size}</span>{' '}
          selected
        </p>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7" onClick={useRecommended}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Use recommended
          </Button>
          <Button variant="outline" size="sm" className="h-7" onClick={toggleAllShown}>
            {allShown ? <Square className="h-3.5 w-3.5 mr-1.5" /> : <CheckSquare className="h-3.5 w-3.5 mr-1.5" />}
            {allShown ? 'Clear' : 'Select'} {query.trim() ? 'these' : 'all'}
          </Button>
        </div>
      </div>

      {/*
       * Three across, for the same reason as the email beat: a checkbox and a
       * field name do not need a full row, and one per line turned a
       * thirty-nine field catalogue into a long scroll with a wide empty gutter.
       *
       * The sample value did not come off — it is the thing that tells you what
       * "Components" or "Resolution" actually holds, which matters most to
       * exactly the people who have never opened Jira. It moved under the name
       * instead of floating at the far right, where it was reading as a
       * separate column rather than as part of the field.
       */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {groups.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-gray-500 dark:text-gray-400">
            Nothing in this project is called “{query.trim()}”.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.name} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-1 pb-1.5">{g.name}</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {g.fields.map((field) => {
                  const on = selected.has(field);
                  return (
                    <li key={field}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(field)}
                        className={`w-full h-full flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                          on
                            ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/25'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        <span
                          className={`h-[18px] w-[18px] mt-px rounded border flex items-center justify-center shrink-0 transition-colors ${
                            on ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {on && <Check className="h-3 w-3 text-white" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-1.5">
                            <FieldIcon field={field} className="h-3.5 w-3.5 text-gray-400 shrink-0 self-center" />
                            <span className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                              {field}
                            </span>
                            {isEmailField(field) && (
                              <span className="text-xs tabular-nums text-gray-400 ml-auto shrink-0">
                                {emailCoverage(field)}%
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {sampleValue(field, 0)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <footer className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-[13px] text-gray-500 dark:text-gray-400 min-w-0 truncate">
          {emailField && `${emailField} is already coming across as your Email column.`}
        </p>
        <Button size="sm" disabled={selected.size === 0} onClick={onNext} className="shrink-0">
          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
          Turn these into columns
        </Button>
      </footer>
    </>
  );
}

/* ------------------------------- Beat three -------------------------------- */

/**
 * Naming, as a list of pairings rather than a grid of cards.
 *
 * Cards made you read a mapping as two stacked lines and hold the pairing in
 * your head; twelve of them in a grid and the 1:1 relationship — the one thing
 * this screen is about — stopped being visible at all. A row states it the one
 * way it cannot be misread: their field on the left, an arrow, your column on
 * the right, one line each, every arrow stacked down the same middle.
 *
 * The whole row drags, not a handle on it. A 12px grip is a hard target for
 * anyone whose hands are less than steady, and there is nothing else on a row a
 * drag could mean — except the name box, which suspends dragging while the
 * caret is in it so text can still be selected.
 */
function NamePhase({
  mappings, total, revealing, missingRequired,
  onRename, onPatch, onRemove, onReorder, onBackToFields,
}: {
  mappings: FieldMap[];
  total: number;
  revealing: boolean;
  missingRequired: string[];
  onRename: (id: string, name: string) => void;
  onPatch: (id: string, patch: Partial<FieldMap>) => void;
  onRemove: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onBackToFields: () => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Mirrors dragId so the drop handler never reads a stale render's closure.
  const dragRef = useRef<string | null>(null);

  const endDrag = () => { dragRef.current = null; setDragId(null); setOverId(null); };

  return (
    <>
      <header className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Name your columns</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {revealing
              ? 'Turning your fields into columns…'
              : 'These names are what your team sees. Type over any of them, or drag a row to reorder.'}
          </p>
        </div>
        <span className="flex-1" />
        <p className="text-[13px] text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
          {revealing ? `${mappings.length} of ${total}` : `${total} column${total === 1 ? '' : 's'}`}
        </p>
      </header>

      {missingRequired.length > 0 && !revealing && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[13px] text-amber-900 dark:text-amber-200 min-w-0">
            Query Results needs {missingRequired.join(' and ')}. Go back and tick the Jira field that carries
            {missingRequired.length > 1 ? ' them' : ' it'}.
          </p>
          <button
            onClick={onBackToFields}
            className="text-[13px] font-semibold text-amber-900 dark:text-amber-200 underline shrink-0"
          >
            Choose fields
          </button>
        </div>
      )}

      {/* Names the two sides once, so no row has to. */}
      <div className="shrink-0 hidden md:grid grid-cols-[1.75rem_minmax(0,1fr)_1.25rem_minmax(0,1.1fr)_auto] items-center gap-3 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <span />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Jira field</span>
        <span />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Your column</span>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 pr-1">Options</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {mappings.map((m, i) => (
            <MapRow
              key={m.id}
              row={m}
              index={i}
              required={REQUIRED_COLUMNS.includes(m.target)}
              fresh={revealing && i === mappings.length - 1}
              dragging={dragId === m.id}
              dropTarget={overId === m.id && !!dragId && dragId !== m.id}
              onRename={(v) => onRename(m.id, v)}
              onPatch={(p) => onPatch(m.id, p)}
              onRemove={() => onRemove(m.id)}
              onDragStart={() => { dragRef.current = m.id; setDragId(m.id); }}
              onDragOver={() => setOverId(m.id)}
              onDrop={() => {
                const from = dragRef.current;
                if (from) onReorder(from, m.id);
                endDrag();
              }}
              onDragEnd={endDrag}
            />
          ))}
        </ul>
      </div>
    </>
  );
}

/** One pairing: their field, an arrow, your column, and what you can do to it. */
function MapRow({
  row, index, required, fresh, dragging, dropTarget,
  onRename, onPatch, onRemove,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  row: FieldMap;
  index: number;
  required: boolean;
  fresh: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onRename: (name: string) => void;
  onPatch: (patch: Partial<FieldMap>) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [value, setValue] = useState(row.label || row.target);
  /** Dragging is suspended while the caret is in the name box. */
  const [typing, setTyping] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  /** What we last pushed up, so an echo of our own typing is not treated as news. */
  const sent = useRef(row.label || row.target);

  useEffect(() => {
    const incoming = row.label || row.target;
    if (incoming !== sent.current) { sent.current = incoming; setValue(incoming); }
  }, [row.label, row.target]);

  /**
   * Every keystroke, not on blur. The heading in the table below changes as you
   * type, which is the point of having it there. A momentarily empty box stays
   * local: it is mid-edit, not a column called "".
   */
  const type = (v: string) => {
    setValue(v);
    const clean = v.trim();
    if (!clean) return;
    sent.current = clean;
    onRename(clean);
  };

  const name = row.label || row.target;

  return (
    <li
      draggable={!typing}
      onDragStart={(e) => { onDragStart(); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      className={`group transition-colors duration-300 ${typing ? '' : 'cursor-grab active:cursor-grabbing'} ${
        dragging
          ? 'opacity-40'
          : dropTarget
            ? 'bg-blue-50 dark:bg-blue-900/25 ring-2 ring-inset ring-blue-400'
            : fresh
              ? 'bg-emerald-50 dark:bg-emerald-900/25'
              : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] md:grid-cols-[1.75rem_minmax(0,1fr)_1.25rem_minmax(0,1.1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2">
        <span className="flex items-center gap-0.5 text-gray-300 dark:text-gray-600" aria-hidden>
          <GripVertical className="h-4 w-4 group-hover:text-gray-400" />
          <span className="text-[11px] tabular-nums">{index + 1}</span>
        </span>

        {/* Theirs */}
        <span className="flex items-center gap-2 min-w-0">
          <FieldIcon field={row.source} className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[13px] text-gray-900 dark:text-white truncate">{row.source}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
              {sampleValue(row.source, 0)}
            </span>
          </span>
        </span>

        <ArrowRight className="hidden md:block h-4 w-4 text-gray-300 dark:text-gray-600" aria-hidden />

        {/* Yours */}
        <span className="col-span-3 md:col-span-1 flex items-center gap-2 min-w-0 pl-[1.75rem] md:pl-0">
          <Input
            ref={input}
            value={value}
            onChange={(e) => type(e.target.value)}
            onFocus={() => setTyping(true)}
            onMouseDown={() => setTyping(true)}
            onBlur={() => { setTyping(false); if (!value.trim()) setValue(name); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
              if (e.key === 'Escape') { e.stopPropagation(); (e.target as HTMLInputElement).blur(); }
            }}
            aria-label={`Column name for ${row.source}`}
            className="h-8 text-[13px] font-medium bg-white dark:bg-gray-900"
          />
          {required && <Pill tone="neutral" size="xs">Required</Pill>}
        </span>

        {/* Options — icons on the row rather than behind a menu. */}
        <span className="flex items-center gap-0.5 justify-self-end">
          <RowIcon icon={Pencil} label={`Rename ${name}`} onClick={() => input.current?.select()} />
          <RowIcon
            icon={row.visible ? Eye : EyeOff}
            label={row.visible ? `Hide ${name} from the table` : `Show ${name} in the table`}
            active={row.visible}
            onClick={() => onPatch({ visible: !row.visible })}
          />
          <RowIcon
            icon={Filter}
            label={row.filterable ? `Stop offering ${name} as a filter` : `Offer ${name} as a filter`}
            active={row.filterable}
            onClick={() => onPatch({ filterable: !row.filterable })}
          />
          <RowIcon
            icon={Trash2}
            label={required ? `${name} cannot be removed` : `Delete ${name}`}
            title={required ? 'Query Results needs this column' : undefined}
            disabled={required}
            danger
            onClick={onRemove}
          />
        </span>
      </div>
    </li>
  );
}

/**
 * A row control. The toggles carry their state in the icon itself and stay lit
 * when on, so running an eye down the column says which of these are filters
 * and which are hidden without opening anything.
 */
function RowIcon({
  icon: Icon, label, title, active, disabled, danger, onClick,
}: {
  icon: typeof Eye;
  label: string;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={title ?? label}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-25 disabled:hover:bg-transparent ${
        active
          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
          : danger
            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/* -------------------------------- The preview ------------------------------- */

/**
 * Your dashboard, on demand.
 *
 * This table used to sit under every beat, always open, costing 170px of a
 * screen that was already the tightest in the flow. It was the right idea in
 * the wrong place: a preview is something you check once you have decided
 * something, not something you watch while deciding. As a dialog it gets the
 * whole window — real column widths, three issues instead of two — and the
 * mapping underneath gets its height back.
 */
function PreviewDialog({
  mappings,
  project,
  onClose,
}: {
  mappings: FieldMap[];
  project?: { name: string; key: string };
  onClose: () => void;
}) {
  const columns = mappings.filter((m) => m.visible);
  const hidden = mappings.length - columns.length;

  /*
   * Capture phase, and the event stops here: the wizard listens for Escape on
   * window to abandon the whole step, and closing a preview must never be
   * mistaken for that.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm p-4 sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Preview your dashboard"
    >
      <div className="w-full max-w-6xl max-h-full flex flex-col rounded-2xl bg-white dark:bg-gray-950 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
        <header className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your dashboard</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {columns.length} column{columns.length === 1 ? '' : 's'}
              {hidden > 0 && ` · ${hidden} hidden`} · three real issues from{' '}
              {project ? `${project.name} (${project.key})` : 'your project'}
            </p>
          </div>
          <span className="flex-1" />
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-auto">
          {columns.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Table2 className="h-7 w-7 text-gray-300 dark:text-gray-600" />
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-3 max-w-xs">
                Every column is hidden, so the table would come through empty.
              </p>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {columns.map((m) => (
                    <th
                      key={m.id}
                      className="sticky top-0 z-10 text-left px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                    >
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {m.label || m.target}
                        {m.filterable && <Filter className="h-3 w-3 text-blue-500" />}
                      </span>
                      <span className="block text-[11px] font-normal text-gray-400 dark:text-gray-500 mt-0.5">
                        {m.source}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2].map((i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900/60">
                    {columns.map((m) => (
                      <td
                        key={m.id}
                        className="px-3 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap max-w-[18rem] truncate"
                      >
                        {sampleValue(m.source, i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <p className="text-[13px] text-gray-500 dark:text-gray-400 min-w-0 truncate">
            Nothing is imported until you start the sync.
          </p>
          <Button size="sm" onClick={onClose} className="shrink-0">
            Back to mapping
          </Button>
        </footer>
      </div>
    </div>
  );
}
