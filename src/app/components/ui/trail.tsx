import { Fragment } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';

/**
 * The trail that says where you are.
 *
 * It exists because setup does not live on the integration's page — it opens
 * over it — and a floating editor with no trail is a room with no door. Every
 * step editor, and every section of the page underneath, names its own place in
 * the same hierarchy: Integrations › Jira › Setup › Fields.
 *
 * The last crumb is where you are, so it is never a button. Everything before it
 * is, and goes exactly where it says.
 *
 * Kept apart from the shadcn `breadcrumb` primitives, which are a kit of parts
 * assembled at each call site. This takes the crumbs as data instead, because
 * the trail is built from state — the open section, the open step — rather than
 * written out by hand, and one shape across four surfaces is the whole point.
 */
export interface Crumb {
  label: string;
  /** Omit to render the crumb as plain text — used for the current location. */
  onClick?: () => void;
  icon?: LucideIcon;
  /** Hover text, e.g. to warn that leaving an open editor discards the edit. */
  title?: string;
}

export function Trail({
  items,
  className = '',
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={`min-w-0 ${className}`}>
      <ol className="flex items-center gap-0.5 min-w-0 text-xs font-medium">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          const interactive = !last && !!crumb.onClick;

          return (
            <Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && (
                <ChevronRight
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600"
                />
              )}
              {/* Every crumb may shrink, so a long step title in a narrow bar
                  truncates the trail rather than pushing it off the edge. */}
              <li className="min-w-0">
                {interactive ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    title={crumb.title}
                    className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 max-w-[12rem] text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {crumb.icon && <crumb.icon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{crumb.label}</span>
                  </button>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={`inline-flex items-center gap-1.5 px-1.5 py-1 min-w-0 ${
                      last
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {crumb.icon && <crumb.icon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{crumb.label}</span>
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
