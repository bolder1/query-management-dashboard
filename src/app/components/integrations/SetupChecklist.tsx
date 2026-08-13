import { Check, Lock, Play, ArrowRight, Eye, Loader2, RefreshCw, History } from 'lucide-react';
import { Button } from '../ui/button';
import { Pill } from '../ui/pill';
import {
  setupTasks, isSetupComplete,
  type Connection, type Provider, type SetupTask,
} from '../../contexts/IntegrationContext';
import { relativeTime } from './shared';

/**
 * What is left to do — and, once nothing is, what was answered.
 *
 * Setup used to be six steps in one sitting: close it at step five and every
 * answer was gone. Now connecting saves an integration immediately and the
 * remaining decisions live here as tasks — each one opens the same step it
 * always did, saves on close, and shows its answer back on the row. Work can
 * stop and resume across sessions, and nothing is lost by leaving.
 *
 * It does not retire when the last box is ticked, because setup is not a
 * one-time event. A project gets renamed, a field stops being filled in, a
 * column needs to become a filter — so the finished checklist becomes the
 * configuration surface, same rows and same editors, with the framing swapped
 * from "finish this" to "change this". The only thing an edit costs afterwards
 * is a sync, which the footer then asks for.
 *
 * Email, fields and mapping all read the project's schema, so they stay locked
 * until a project is chosen. Saying that plainly beats opening a step that
 * would have nothing to show.
 */
export function SetupChecklist({
  provider,
  conn,
  pendingSync,
  onOpenTask,
  onReview,
  onStartSync,
  onSyncNow,
  onOpenHistory,
}: {
  provider: Provider;
  conn: Connection;
  /** An answer changed after the last import, so records are built from old ones. */
  pendingSync: boolean;
  onOpenTask: (step: number) => void;
  onReview: () => void;
  onStartSync: () => void;
  onSyncNow: () => void;
  onOpenHistory: () => void;
}) {
  const tasks = setupTasks(conn.config);
  const complete = isSetupComplete(conn.config);
  const done = tasks.filter((t) => t.done).length;
  const next = tasks.find((t) => !t.done && !t.blockedBy);
  const lastRun = conn.runs.find((r) => r.status === 'completed');
  /** Configured and imported at least once — the state it spends its life in. */
  const settled = complete && !!lastRun;

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {settled ? 'Setup & configuration' : complete ? 'Setup complete' : 'Finish setting up'}
          </h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {settled
              ? 'Every answer stays editable. Change one and the next sync imports with it.'
              : complete
                ? `${provider.name} is configured and ready for its first import.`
                : 'Your answers are saved as you go — you can leave and come back.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {settled ? (
            <Pill tone={pendingSync ? 'warn' : 'ok'} size="md" icon={pendingSync ? RefreshCw : Check}>
              {pendingSync ? 'Changed since last sync' : 'All answers applied'}
            </Pill>
          ) : (
            <>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 tabular-nums">
                <span className="font-semibold text-gray-900 dark:text-white">{done}</span> of {tasks.length}
              </p>
              <span className="h-1.5 w-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <span
                  className={`block h-full rounded-full transition-all duration-500 ${
                    complete ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${(done / tasks.length) * 100}%` }}
                />
              </span>
            </>
          )}
        </div>
      </div>

      <ol className="divide-y divide-gray-100 dark:divide-gray-800">
        {tasks.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            index={i + 1}
            isNext={!complete && task.id === next?.id}
            onOpen={() => onOpenTask(task.step)}
          />
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
        {settled ? (
          <>
            <p className="text-[13px] min-w-0">
              {pendingSync ? (
                <span className="text-amber-700 dark:text-amber-400">
                  The {conn.totalImported.toLocaleString()} records on your dashboard were imported with the
                  previous answers. A sync rebuilds them with these.
                </span>
              ) : (
                <span className="text-gray-600 dark:text-gray-300">
                  Last imported {relativeTime(lastRun!.startedAt).toLowerCase()} ·{' '}
                  {conn.totalImported.toLocaleString()} records on your dashboard.
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onOpenHistory}>
                <History className="h-3.5 w-3.5 mr-1.5" />
                Sync history
              </Button>
              <Button
                size="sm"
                variant={pendingSync ? 'default' : 'outline'}
                disabled={conn.syncing}
                onClick={onSyncNow}
              >
                {conn.syncing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                {conn.syncing ? 'Syncing…' : pendingSync ? 'Sync to apply' : 'Sync now'}
              </Button>
            </div>
          </>
        ) : complete ? (
          <>
            <p className="text-[13px] text-gray-600 dark:text-gray-300 min-w-0">
              Nothing has been imported yet. The first sync brings across the most recent batch.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onReview}>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Preview the result
              </Button>
              <Button size="sm" disabled={conn.syncing} onClick={onStartSync}>
                {conn.syncing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                )}
                {conn.syncing ? 'Importing…' : 'Start first sync'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 min-w-0">
              {next
                ? <>Next up: <span className="font-medium text-gray-900 dark:text-white">{next.title.toLowerCase()}</span>.</>
                : 'Choose a project to unlock the remaining steps.'}
            </p>
            {next && (
              <Button size="sm" className="shrink-0" onClick={() => onOpenTask(next.step)}>
                Continue setup
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Why a row can't be opened yet, named for the task that would unlock it. */
const BLOCKED_REASON: Record<string, string> = {
  project: 'Choose a project first — its schema decides what this step can offer',
  fields: 'Pick some fields first — there is nothing to connect until then',
};

function TaskRow({
  task,
  index,
  isNext,
  onOpen,
}: {
  task: SetupTask;
  index: number;
  /** The first thing they can actually act on — the one row that gets weight. */
  isNext: boolean;
  onOpen: () => void;
}) {
  const locked = !!task.blockedBy;

  return (
    <li
      className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors ${
        isNext ? 'bg-blue-50/50 dark:bg-blue-900/15' : ''
      }`}
    >
      <span
        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
          task.done
            ? 'bg-emerald-500 text-white'
            : locked
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
              : isNext
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
        }`}
      >
        {task.done ? <Check className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : index}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${
              locked ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
            }`}
          >
            {task.title}
          </span>
          {isNext && <Pill tone="accent" size="sm">Next</Pill>}
        </span>
        <span
          className={`block text-[13px] truncate mt-0.5 ${
            task.done
              ? 'text-gray-600 dark:text-gray-300'
              : locked
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {locked ? BLOCKED_REASON[task.blockedBy!] ?? 'Finish the step above first' : task.summary}
        </span>
      </span>

      {!locked && (
        <Button
          variant={isNext ? 'default' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={onOpen}
        >
          {task.done ? 'Change' : 'Set up'}
        </Button>
      )}
    </li>
  );
}
