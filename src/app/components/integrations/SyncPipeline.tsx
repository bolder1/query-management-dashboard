import { Check, Loader2, Database, ArrowRight } from 'lucide-react';
import {
  SYNC_PHASES, type Connection, type Provider,
} from '../../contexts/IntegrationContext';
import { ProviderLogo } from './shared';

function phaseIndex(conn: Connection) {
  const i = SYNC_PHASES.findIndex((p) => p.id === conn.phase);
  return i < 0 ? 0 : i;
}

/**
 * Animated depiction of records travelling from the external system into the
 * dashboard. Rendered while a sync is running and for the completed state.
 */
export function SyncPipeline({
  provider,
  conn,
  compact = false,
}: {
  provider: Provider;
  conn: Connection;
  compact?: boolean;
}) {
  const active = phaseIndex(conn);
  const done = !conn.syncing && conn.phase === 'done';

  return (
    <div
      className={`rounded-xl border ${
        done
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20'
          : 'border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20'
      } ${compact ? 'p-4' : 'p-5'}`}
    >
      {/* Travelling-records animation */}
      <div className="flex items-center gap-4">
        <ProviderLogo provider={provider} size={compact ? 36 : 44} />

        <div className="relative flex-1 h-10 flex items-center">
          <div className="absolute inset-x-0 h-0.5 bg-blue-200 dark:bg-blue-900 rounded-full" />
          <div
            className="absolute left-0 h-0.5 bg-blue-600 rounded-full transition-[width] duration-150 ease-linear"
            style={{ width: `${conn.progress}%` }}
          />
          {conn.syncing &&
            [0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="absolute h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-[pulse_1.2s_ease-in-out_infinite]"
                style={{
                  left: `${((conn.progress + i * 22) % 100)}%`,
                  animationDelay: `${i * 160}ms`,
                }}
              />
            ))}
          <span
            className={`absolute -top-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-[left] duration-150 ease-linear ${
              done ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
            }`}
            style={{ left: `calc(${Math.min(conn.progress, 92)}% )` }}
          >
            {Math.floor(conn.progress)}%
          </span>
        </div>

        <ArrowRight className="h-4 w-4 text-blue-400 shrink-0" />

        <div
          className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${
            done ? 'bg-emerald-600' : 'bg-gray-800 dark:bg-gray-700'
          }`}
        >
          <Database className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Phase checklist */}
      <ol className={`mt-4 grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
        {SYNC_PHASES.map((p, i) => {
          const complete = done || i < active;
          const current = !done && i === active;
          return (
            <li key={p.id} className="flex items-center gap-2">
              <span
                className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
                  complete
                    ? 'bg-emerald-500 text-white'
                    : current
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {complete ? (
                  <Check className="h-2.5 w-2.5" />
                ) : current ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : null}
              </span>
              <span
                className={`text-xs ${
                  complete || current
                    ? 'text-gray-800 dark:text-gray-200'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {p.label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
        {done ? (
          <>
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              {conn.processed} records
            </span>{' '}
            imported from {conn.config.projects.map((p) => p.key).join(', ')} and available in Query Results.
          </>
        ) : (
          <>
            {conn.processed} of {conn.target} records written · reading{' '}
            {conn.config.projects.map((p) => p.key).join(', ')}. You can keep working while this runs.
          </>
        )}
      </p>
    </div>
  );
}
