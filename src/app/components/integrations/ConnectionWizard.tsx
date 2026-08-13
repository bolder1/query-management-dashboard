import { useEffect } from 'react';
import { X, Check, Info, Save, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Trail } from '../ui/trail';
import { toast } from 'sonner';
import {
  useIntegrations, PROVIDERS, WIZARD_STEPS, REQUIRED_COLUMNS,
} from '../../contexts/IntegrationContext';
import { useNav } from '../../contexts/NavContext';
import { ProviderLogo } from './shared';
import { StepConnect } from './StepConnect';
import { StepProject } from './StepProject';
import { StepMapFields } from './StepMapFields';

/**
 * Setup, full screen.
 *
 * It used to be a dialog that could also be a full-screen page — an A/B toggle
 * sat in the top bar and the two shells shared a styles map. The test is over.
 * A dialog was the wrong frame for this work: the mapping step wants a list on
 * one side and a live preview of the result on the other, and a 46rem-tall
 * popup floating over a page you cannot use is the one shape that cannot give
 * it that. So there is one shell, it owns the screen, and the steps get to lay
 * themselves out properly inside it.
 *
 * The numbered rail replaces the old "one step, alone" framing. Every answer
 * still saves independently, so moving between steps in here is free — the
 * draft carries all three and Save commits the lot.
 */

/** The headline and one-line standfirst for each step. */
const STEP_COPY: { title: string; description: string }[] = [
  {
    title: 'Connect your Jira account',
    description: 'Either route grants read-only access — nothing is written back to Jira.',
  },
  {
    title: 'Which project should we sync?',
    description: 'One project per connection. You can add more connections later.',
  },
  {
    title: 'Build your table',
    description:
      'Each row is a column on your dashboard. Say which Jira field fills it — or press Connect all and change what you disagree with.',
  },
];

export function ConnectionWizard() {
  const { draft, updateDraft, cancelWizard, completeWizard } = useIntegrations();
  const { setPage, openDetail } = useNav();

  // Escape abandons the edit. The stored answer is untouched either way, so
  // there is nothing to warn about.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !draft) return;
      e.preventDefault();
      cancelWizard();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, cancelWizard]);

  // A takeover shouldn't leave the page scrolling behind it.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!draft) return null;
  const provider = PROVIDERS.find((p) => p.id === draft.providerId)!;
  const step = draft.step;
  const copy = STEP_COPY[step];

  /** The only unsaveable state: an account that never linked. */
  const blocked = step === 0 && !draft.connected ? 'Connect your account to continue.' : '';

  /** Saveable, but not finished — the checklist will say so too. */
  const incomplete = (() => {
    if (step === 1 && draft.projectIds.length === 0) return 'No project chosen yet';
    if (step === 2) {
      const missing = REQUIRED_COLUMNS.filter(
        (c) => !draft.mappings.some((m) => m.target === c && m.source.trim()),
      );
      if (missing.length) {
        const list = missing.length < 3
          ? missing.join(' and ')
          : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
        return `${list} still empty`;
      }
      const open = draft.mappings.filter((m) => !m.source.trim()).length;
      if (open) return `${open} column${open > 1 ? 's' : ''} still without a Jira field`;
    }
    return '';
  })();

  /** A step you cannot answer yet, and why — the rail reads this. */
  const lockedReason = (target: number) => {
    if (target > 0 && !draft.connected) return 'Connect your account first';
    if (target > 1 && draft.projectIds.length === 0) return 'Choose a project first';
    return '';
  };

  const goToStep = (s: number) => {
    if (lockedReason(s)) return;
    updateDraft({ step: s, sequence: [s] });
  };

  const save = () => {
    const providerId = draft.providerId;
    completeWizard();
    // No `setPage` first — that would close the integration and lose whichever
    // section this editor was opened from.
    openDetail(providerId);
    toast.success('Saved', { description: `${WIZARD_STEPS[step].title} updated.` });
  };

  /**
   * The trail out. This editor owns the screen rather than living on the
   * integration's page, so its crumbs have to actually navigate — each one
   * closes it and lands where it says. Nothing here is saved on the way, which
   * is the same bargain the Cancel button and Escape already make.
   */
  const leaveTo = (dest: 'list' | 'detail' | 'setup') => () => {
    const providerId = draft.providerId;
    cancelWizard();
    if (dest === 'list') { setPage('Integrations'); return; }
    openDetail(providerId, dest === 'setup' ? 'setup' : undefined);
  };

  /**
   * The mapping step wants the whole width for its list-plus-preview; the two
   * short steps before it want a readable column in the middle of the screen.
   */
  const wide = step === 2;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
      {/* ---------------------------------- Top --------------------------------- */}
      <header className="shrink-0 flex items-center gap-3 px-3 sm:px-5 h-14 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={cancelWizard}
          aria-label="Close without saving"
          className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />
        <ProviderLogo provider={provider} size={24} />
        <Trail
          className="min-w-0"
          items={[
            { label: 'Integrations', onClick: leaveTo('list'), title: 'Leave without saving' },
            { label: provider.name, onClick: leaveTo('detail'), title: 'Leave without saving' },
            { label: 'Setup', onClick: leaveTo('setup'), title: 'Leave without saving' },
          ]}
        />

        <div className="flex-1" />

        <StepRail current={step} lockedReason={lockedReason} onGo={goToStep} />
      </header>

      {/* --------------------------------- Body --------------------------------- */}
      <main className="flex-1 min-h-0 flex flex-col">
        {/*
         * The two short steps get a headline and a standfirst, because that is
         * the only framing they have. The mapping step does not: its own beats
         * each carry a heading and a sentence, so this block was saying the
         * same thing twice and charging 124px of a 790px screen for it — on the
         * one step that is starved of height. It states its title inline with
         * its rail instead.
         */}
        {!wide && (
          <div className="shrink-0 w-full px-5 sm:px-8 pt-6 pb-4 mx-auto max-w-4xl">
            <h1 className="text-2xl lg:text-[26px] leading-tight font-semibold text-gray-900 dark:text-white">
              {copy.title}
            </h1>
            <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-3xl">
              {copy.description}
            </p>
          </div>
        )}

        <div
          className={`flex-1 min-h-0 w-full px-5 sm:px-8 pb-4 flex flex-col ${
            wide ? 'lg:px-10 pt-4' : 'mx-auto max-w-4xl'
          }`}
        >
          {step === 0 && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <StepConnect draft={draft} update={updateDraft} />
            </div>
          )}
          {step === 1 && <StepProject draft={draft} update={updateDraft} />}
          {step === 2 && <StepMapFields draft={draft} update={updateDraft} />}
        </div>
      </main>

      {/* -------------------------------- Bottom -------------------------------- */}
      <footer className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 sm:px-8 lg:px-10 py-3">
          <p className="text-[13px] text-gray-500 dark:text-gray-400 min-w-0 flex items-center gap-1.5">
            {blocked ? (
              <>
                <Info className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate">{blocked}</span>
              </>
            ) : incomplete ? (
              <>
                {/* Saving unfinished work is expected, so this states the fact
                    rather than warning about it. */}
                <Save className="h-4 w-4 shrink-0" />
                <span className="truncate">{incomplete} — you can finish this later</span>
              </>
            ) : (
              <span className="hidden sm:inline">Changes save to your integration</span>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={cancelWizard}>
              Cancel
            </Button>
            <Button disabled={!!blocked} onClick={save}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Save
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Where you are in the three, and what is still out of reach.
 *
 * A step you cannot answer yet says why on hover rather than simply refusing
 * the click — "Choose a project first" is the difference between a locked door
 * and a locked door with a sign on it.
 */
function StepRail({
  current,
  lockedReason,
  onGo,
}: {
  current: number;
  lockedReason: (step: number) => string;
  onGo: (step: number) => void;
}) {
  return (
    <nav aria-label="Setup steps" className="shrink-0 flex items-center gap-1">
      {WIZARD_STEPS.map((s, i) => {
        const on = i === current;
        const locked = !!lockedReason(i);
        const done = i < current && !locked;
        return (
          <button
            key={s.title}
            type="button"
            onClick={() => onGo(i)}
            disabled={locked}
            title={lockedReason(i) || s.hint}
            aria-current={on ? 'step' : undefined}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed ${
              on
                ? 'bg-gray-900 dark:bg-gray-700 text-white'
                : locked
                  ? 'text-gray-300 dark:text-gray-600'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                on
                  ? 'bg-white/20 text-white'
                  : done
                    ? 'bg-emerald-500 text-white'
                    : locked
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              {done ? <Check className="h-3 w-3" /> : locked ? <Lock className="h-2.5 w-2.5" /> : i + 1}
            </span>
            <span className="hidden md:inline">{s.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
