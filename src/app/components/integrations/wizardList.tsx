import type { ReactNode } from 'react';
import { Loader2, Search, X, type LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/**
 * The shell three consecutive wizard steps share — pick a project, pick the
 * email field, pick the fields to bring across. They were three hand-built
 * panels that had drifted apart in padding, type scale and where the search
 * box lived; pulling the frame out makes them read as one flow.
 *
 * The shape is a fixed frame that fills the panel: search and count at the top,
 * a footer at the bottom, and only the rows between them scroll. One scrollbar,
 * always in the list, so the step itself never moves.
 *
 * None of these lists page. Every project and every email field is loaded up
 * front and the frame just scrolls — a "Load more" button in a picker makes you
 * click to find out whether the thing you want even exists, and at these sizes
 * (tens of rows, not thousands) it buys nothing.
 *
 * Nothing here goes below 12px. The old panels ran on 10 and 11px labels, which
 * is what made them unreadable at a glance.
 */

export function ListFrame({
  label,
  /** Pick-one lists are a radiogroup; the multi-select field picker is a group. */
  role = 'radiogroup',
  children,
}: {
  label: string;
  role?: 'radiogroup' | 'group';
  children: ReactNode;
}) {
  return (
    <div
      role={role}
      aria-label={label}
      className="flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
    >
      {children}
    </div>
  );
}

/**
 * Search lives inside the frame rather than floating above it. It saves a row
 * of vertical space and, more importantly, makes it obvious the box filters
 * *this* list rather than the whole step.
 */
export function ListSearch({
  value,
  onChange,
  placeholder,
  busy,
  autoFocus,
  right,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** A request is in flight for a term the user has already finished typing. */
  busy?: boolean;
  autoFocus?: boolean;
  /** Count, or anything else that belongs on the same line as the search. */
  right?: ReactNode;
}) {
  return (
    <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-16 h-10 text-sm bg-white dark:bg-gray-900"
        />
        {busy && (
          <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
        )}
        {value && (
          <button
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/** The count beside the search. Everything is loaded, so it is just a total. */
export function ListCount({
  total,
  noun,
  filtered,
}: {
  total: number;
  noun: string;
  /** A search is narrowing the list, so say so rather than implying it is all. */
  filtered?: boolean;
}) {
  return (
    <p className="text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
      <span className="font-medium text-gray-900 dark:text-white tabular-nums">{total}</span>{' '}
      {filtered ? 'matching ' : ''}
      {noun}
      {total === 1 ? '' : 's'}
    </p>
  );
}

/**
 * A strip between the search and the rows: column headings, a select-all, a
 * live count. Sentence case at 12px — the old uppercase 11px tracking-wide
 * treatment was the single biggest source of unreadable text in the wizard.
 */
export function ListStrip({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {children}
    </div>
  );
}

export function ListLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`text-xs font-medium text-gray-500 dark:text-gray-400 ${className}`}>
      {children}
    </span>
  );
}

/** The scrolling rows. The only thing on the step that moves. */
export function ListBody({ children, divided = true }: { children: ReactNode; divided?: boolean }) {
  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto ${
        divided ? 'divide-y divide-gray-100 dark:divide-gray-800' : ''
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Empty, error and "nothing matches" all look the same and sit in the middle of
 * the body, so the frame keeps its height instead of collapsing under them.
 */
export function ListState({
  icon: Icon,
  tone = 'neutral',
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  tone?: 'neutral' | 'error';
  title: string;
  body: ReactNode;
  action?: { label: string; icon?: LucideIcon; onClick: () => void };
}) {
  return (
    <div className="h-full min-h-[12rem] flex flex-col items-center justify-center text-center px-6 py-10">
      <Icon
        className={`h-7 w-7 ${tone === 'error' ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'}`}
      />
      <p className="text-[15px] font-medium text-gray-800 dark:text-gray-200 mt-3">{title}</p>
      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-md leading-relaxed">{body}</p>
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
          {action.icon && <action.icon className="h-3.5 w-3.5 mr-1.5" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** Loading rows shaped like the real ones, so the frame doesn't jump on arrival. */
export function ListSkeleton({ rows = 6, lines = 2 }: { rows?: number; lines?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <span className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block h-3.5 w-44 rounded bg-gray-100 dark:bg-gray-800" />
            {lines > 1 && (
              <span className="block h-3 w-64 max-w-full rounded bg-gray-100 dark:bg-gray-800 mt-2" />
            )}
          </span>
          <span className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
        </div>
      ))}
    </>
  );
}

/**
 * The selection dot on a row. One shape for every pick-one list in the wizard,
 * so "this is the one I chose" reads identically on every step.
 */
export function RadioDot({ on }: { on: boolean }) {
  return (
    <span
      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        on ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-600'
      }`}
    >
      {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
    </span>
  );
}

/**
 * The frame's footer — the running summary of what you have chosen. It stays
 * put while the rows scroll behind it.
 */
export function ListFooter({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok';
}) {
  return (
    <div
      className={`shrink-0 border-t px-4 py-2.5 ${
        tone === 'ok'
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/25'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      }`}
    >
      {children}
    </div>
  );
}

