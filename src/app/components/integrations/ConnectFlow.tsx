import { useEffect, useRef, useState } from 'react';
import { X, Check, Loader2, ShieldCheck, ArrowRight, Circle } from 'lucide-react';
import { Button } from '../ui/button';
import { Trail } from '../ui/trail';
import { toast } from 'sonner';
import {
  useIntegrations, PROVIDERS, MOCK_PROJECTS,
} from '../../contexts/IntegrationContext';
import { useNav } from '../../contexts/NavContext';
import { ProviderLogo } from './shared';
import { StepConnect } from './StepConnect';
import { StepProject } from './StepProject';

/**
 * Connecting an integration, as a dialog rather than a wizard.
 *
 * This used to be the first two frames of a six-step, full-panel shell with a
 * vertical stepper down the side. That framing promised a long sitting for what
 * is really one decision and one confirmation — everything else now lives as a
 * checklist on the integration's own page. So the shell is gone: a small dialog
 * that grows only as much as its content needs.
 *
 * The middle phase is the point of the whole thing. Signing in used to snap
 * straight from a consent screen to a list of projects, which reads as though
 * nothing was checked. Naming the work as it happens — signed in, access
 * confirmed, projects found — is what makes the jump believable.
 */

type Phase = 'connect' | 'linking' | 'project';

interface LinkStep {
  /** Present tense while it runs. */
  running: string;
  /** Past tense once it lands, with whatever it actually found. */
  done: (ctx: { email: string; site: string; projects: number }) => string;
  ms: number;
}

const LINK_STEPS: LinkStep[] = [
  { running: 'Signing you in', done: ({ email }) => `Signed in as ${email}`, ms: 700 },
  { running: 'Checking what we can read', done: () => 'Read-only access confirmed', ms: 800 },
  {
    running: 'Looking for projects you can browse',
    done: ({ projects }) => `Found ${projects} project${projects === 1 ? '' : 's'}`,
    ms: 900,
  },
];

export function ConnectFlow() {
  const { draft, updateDraft, cancelWizard, completeWizard, saveDraft, connections } = useIntegrations();
  const { openDetail } = useNav();
  const [phase, setPhase] = useState<Phase>(draft?.connected ? 'project' : 'connect');
  const [linked, setLinked] = useState(0);
  const timers = useRef<number[]>([]);

  const connected = !!draft?.connected;

  /*
   * The account links, so it is saved — immediately, before the project is even
   * asked for. Closing the dialog from here on leaves a real integration behind
   * with its setup waiting, rather than throwing the sign-in away.
   */
  useEffect(() => {
    if (!connected || phase !== 'connect') return;
    saveDraft();
    setPhase('linking');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, phase]);

  /** Walks the link steps once, then hands over to the project question. */
  useEffect(() => {
    if (phase !== 'linking') return;
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    let elapsed = 0;
    LINK_STEPS.forEach((s, i) => {
      elapsed += s.ms;
      timers.current.push(window.setTimeout(() => setLinked(i + 1), elapsed));
    });
    timers.current.push(window.setTimeout(() => setPhase('project'), elapsed + 450));
    return () => timers.current.forEach(window.clearTimeout);
  }, [phase]);

  // Escape closes, through the same guard as the close button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // A dialog shouldn't leave the page scrolling behind it.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!draft) return null;
  const provider = PROVIDERS.find((p) => p.id === draft.providerId)!;
  const site = draft.siteUrl.replace('https://', '');

  /**
   * Leaves for the integration's own page, landing on the setup section — the
   * rest of the questions are there, and they are the reason this dialog is
   * short.
   */
  const handOver = (message: string, description: string) => {
    const providerId = draft.providerId;
    completeWizard();
    openDetail(providerId, 'setup');
    toast.success(message, { description });
  };

  /**
   * Closing is never destructive once the account is linked — the connection is
   * already saved, so this just stops asking about the project.
   */
  const close = () => {
    if (!connected) { cancelWizard(); return; }
    handOver(`${provider.name} connected`, 'Finish the remaining steps whenever you like.');
  };

  const isNew = !connections[draft.providerId];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-md p-4 sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Connect ${provider.name}`}
    >
      {/*
       * One dialog that grows with its content: a sign-in choice needs very
       * little room, a project list needs a lot. Animating the width keeps it
       * feeling like one continuous thing rather than three dialogs.
       */}
      <div
        className={`w-full rounded-2xl bg-white dark:bg-gray-950 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex flex-col transition-[max-width] duration-300 ease-out ${
          phase === 'project' ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <ProviderLogo provider={provider} size={36} />
          <div className="min-w-0 flex-1">
            {/* Where this sits, even though it opens over the page: connecting
                is the first step of the same setup the integration's page
                carries on with. */}
            <Trail
              className="-ml-1.5 mb-0.5"
              items={[
                { label: 'Integrations' },
                { label: provider.name },
                { label: phase === 'project' ? 'Setup · Project' : 'Setup · Connect' },
              ]}
            />
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">
              {phase === 'project' ? 'Which project should we sync?' : `Connect ${provider.name}`}
            </h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {phase === 'connect' && 'Read-only access — nothing is written back to Jira.'}
              {phase === 'linking' && `Setting up the link to ${site}`}
              {phase === 'project' && 'One project per connection. You can change this later.'}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {phase === 'connect' && (
          <div className="px-5 py-5">
            <StepConnect draft={draft} update={updateDraft} />
          </div>
        )}

        {phase === 'linking' && (
          <LinkingStatus
            steps={LINK_STEPS}
            at={linked}
            ctx={{ email: draft.email, site, projects: MOCK_PROJECTS.length }}
          />
        )}

        {phase === 'project' && (
          <>
            {/* A fixed height rather than a full-height panel: the dialog stays
                a dialog, and the list scrolls inside it. */}
            <div className="px-5 pt-4 h-[24rem]">
              <StepProject draft={draft} update={updateDraft} />
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
              <p className="text-[13px] text-gray-500 dark:text-gray-400 min-w-0 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="truncate">{provider.name} is connected — this is saved either way.</span>
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handOver('Saved for later', 'Pick a project on the integration page when you are ready.')
                  }
                >
                  Skip for now
                </Button>
                <Button
                  size="sm"
                  disabled={draft.projectIds.length === 0}
                  onClick={() =>
                    handOver(
                      `${provider.name} ${isNew ? 'connected' : 'updated'}`,
                      'Finish the remaining steps on the integration page.',
                    )
                  }
                >
                  Continue
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The bit that buys trust: each check names itself while it runs and reports
 * what it found when it lands. A bare spinner would take the same two seconds
 * and say nothing about whether anything was actually verified.
 */
function LinkingStatus({
  steps,
  at,
  ctx,
}: {
  steps: LinkStep[];
  at: number;
  ctx: { email: string; site: string; projects: number };
}) {
  const total = steps.length;
  const pct = Math.round((at / total) * 100);

  return (
    <div className="px-5 py-6" role="status" aria-live="polite">
      <ol className="space-y-3.5">
        {steps.map((s, i) => {
          const done = i < at;
          const running = i === at;
          return (
            <li key={s.running} className="flex items-center gap-3">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : running
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : running ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Circle className="h-2 w-2" />
                )}
              </span>
              <span
                className={`text-sm min-w-0 truncate transition-colors ${
                  done
                    ? 'text-gray-900 dark:text-white'
                    : running
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {done ? s.done(ctx) : running ? `${s.running}…` : s.running}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 mt-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(8, pct)}%` }}
        />
      </div>
    </div>
  );
}
