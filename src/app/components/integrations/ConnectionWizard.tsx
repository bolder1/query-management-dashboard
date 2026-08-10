import { useEffect, useState } from 'react';
import {
  X, Check, ChevronLeft, ChevronRight, Play, Info, ShieldCheck, Loader2,
  Maximize2, Minimize2, FlaskConical,
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import {
  useIntegrations, PROVIDERS, WIZARD_STEPS, MOCK_PROJECTS,
} from '../../contexts/IntegrationContext';
import { useNav } from '../../contexts/NavContext';
import { ProviderLogo } from './shared';
import { StepConnect } from './StepConnect';
import { StepProject } from './StepProject';
import { StepEmailMapping } from './StepEmailMapping';
import { StepSelectFields } from './StepSelectFields';
import { StepFieldMapping } from './StepFieldMapping';
import { StepReview } from './StepReview';
import {
  LAYOUT_LABELS, LAYOUT_STYLES, useWizardLayout, type WizardLayout,
} from './wizardLayout';

const LAST = WIZARD_STEPS.length - 1;

/**
 * The headline and standfirst for each step. Keeping this in the shell means
 * every step opens the same way and the step bodies hold only their controls.
 */
const STEP_COPY: { title: string; description: string }[] = [
  {
    title: 'First, connect your Jira account',
    description:
      'Pick how you want to sign in. Either way the access we ask for is read-only — nothing is ever written back to Jira.',
  },
  {
    title: 'Which project should we sync?',
    description:
      'One project per connection. Pick one you have synced before, or search your whole Jira site.',
  },
  {
    title: 'Where does the email address come from?',
    description:
      'Pick the Jira field we should fetch the customer’s email from. It lands in your Email column and arrives pre-connected on the mapping step.',
  },
  {
    title: 'What should we bring across?',
    description:
      'Add the Jira fields that belong in the dashboard. The order you set here becomes your column order.',
  },
  {
    title: 'Connect your fields to columns',
    description:
      'Click a Jira field, then the dashboard column it should fill. Connected pairs are drawn as you go.',
  },
  {
    title: 'Ready to sync — take a last look',
    description:
      'Nothing is imported until you start the sync. Every line here stays editable from the integration page afterwards.',
  },
];

export function ConnectionWizard() {
  const { draft, updateDraft, cancelWizard, completeWizard, connections } = useIntegrations();
  const { setPage, openDetail } = useNav();
  const [confirmExit, setConfirmExit] = useState(false);
  const [starting, setStarting] = useState(false);
  const [layout, setLayout] = useWizardLayout();
  const L = LAYOUT_STYLES[layout];

  // Escape closes the wizard through the same guard as the close button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || confirmExit || !draft) return;
      e.preventDefault();
      if (draft.step === 0 && !draft.connected) cancelWizard();
      else setConfirmExit(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmExit, draft, cancelWizard]);

  // A full-screen takeover shouldn't leave the page scrolling behind it.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!draft) return null;
  const provider = PROVIDERS.find((p) => p.id === draft.providerId)!;
  const step = draft.step;
  /** Reconfiguring an existing connection rather than setting one up. */
  const editing = !!connections[draft.providerId];

  const completeMappings = draft.mappings.filter((m) => m.source.trim() && m.target.trim());

  const blocked = (() => {
    if (step === 0 && !draft.connected) return 'Connect your account to continue.';
    if (step === 1 && draft.projectIds.length === 0) return 'Select a project to continue.';
    if (step === 2 && !draft.emailMapping.sourceField) return 'Choose the field the email comes from.';
    if (step === 3 && draft.mappings.length === 0) return 'Select at least one Jira field.';
    if (step === 4 && completeMappings.length === 0) return 'Map at least one field to a dashboard column.';
    return '';
  })();

  const goToStep = (s: number) => {
    if (s > step && blocked) return;
    updateDraft({ step: Math.max(0, Math.min(LAST, s)) });
  };

  const handleClose = () => {
    // Nothing worth keeping on step 1 of a brand-new setup.
    if (step === 0 && !draft.connected) {
      cancelWizard();
      return;
    }
    setConfirmExit(true);
  };

  const discardAndClose = () => {
    setConfirmExit(false);
    cancelWizard();
    toast.info(
      editing ? 'Changes discarded' : 'Setup discarded',
      { description: editing ? 'The live connection is untouched.' : undefined },
    );
  };

  const finish = () => {
    const providerId = draft.providerId;
    const firstTime = !connections[providerId];
    setStarting(true);
    completeWizard();
    setPage('Integrations');
    openDetail(providerId);
    // A first-time setup hands over to the full-screen migration, which does its
    // own announcing; a reconfigure just re-syncs quietly in the background.
    if (!firstTime) {
      toast.success('Configuration updated — sync started', {
        description: `${provider.name} records are being imported into Query Results.`,
      });
    }
  };

  const project = MOCK_PROJECTS.find((p) => p.id === draft.projectIds[0]);
  const copy = STEP_COPY[step];
  const progress = ((step + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div
      className={L.scrim}
      onMouseDown={(e) => {
        if (L.dismissOnScrimClick && e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={L.panel}>
        {/* ------------------------------- Left rail ------------------------------ */}
        <aside className={L.rail}>
        <div className="px-7 pt-7">
          <div className="flex items-center gap-3">
            <ProviderLogo provider={provider} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {editing ? `Reconfigure ${provider.name}` : `Set up ${provider.name}`}
              </p>
              <p className="text-xs text-white/60 truncate">
                {draft.connected ? draft.siteUrl.replace('https://', '') : 'Not connected yet'}
              </p>
            </div>
          </div>

          <p className="mt-7 text-[32px] leading-none font-semibold tracking-tight">
            {step + 1}
            <span className="text-white/60 text-xl"> / {WIZARD_STEPS.length}</span>
          </p>
        </div>

        {/* Vertical stepper */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
          <ol>
            {WIZARD_STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step;
              const reachable = i <= step || !blocked;
              const last = i === LAST;
              return (
                <li key={s.title} className="relative">
                  {/* Connector to the next step */}
                  {!last && (
                    <span
                      className={`absolute left-[26px] top-[30px] bottom-0 w-px ${
                        done ? 'bg-emerald-400/60' : 'bg-white/12'
                      }`}
                    />
                  )}
                  <button
                    onClick={() => reachable && goToStep(i)}
                    disabled={!reachable}
                    aria-current={current ? 'step' : undefined}
                    className={`relative w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      current
                        ? 'bg-white/10'
                        : reachable
                          ? 'hover:bg-white/5 cursor-pointer'
                          : 'cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 transition-colors ${
                        done
                          ? 'bg-emerald-500 text-white'
                          : current
                            ? 'bg-white text-[var(--rail-bg)]'
                            : 'border border-white/30 text-white/60'
                      }`}
                    >
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-medium ${
                          current ? 'text-white' : done ? 'text-white/80' : 'text-white/60'
                        }`}
                      >
                        {s.title}
                      </span>
                      <span
                        className={`block text-xs mt-0.5 ${current ? 'text-white/70' : 'text-white/50'}`}
                      >
                        {s.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="px-7 pb-7">
          <div className="flex items-start gap-2.5 rounded-lg bg-white/5 px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-white/65 leading-relaxed">
              Read-only access. Credentials are encrypted and nothing is written back to {provider.name}.
            </p>
          </div>
        </div>
      </aside>

      {/* ------------------------------ Right panel ----------------------------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-800">
          <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-blue-600 transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-6 lg:px-10 py-3.5">
            <div className="min-w-0 flex items-center gap-2.5">
              <span className="lg:hidden">
                <ProviderLogo provider={provider} size={28} />
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                <span className="lg:hidden font-medium text-gray-700 dark:text-gray-300">
                  {editing ? 'Reconfigure' : 'Set up'} {provider.name} ·{' '}
                </span>
                Step {step + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[step].title}
                {project && step > 1 && ` · ${project.key}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <LayoutToggle layout={layout} onChange={setLayout} />
              <span className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
              <button
                onClick={handleClose}
                aria-label="Close setup"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrolling content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className={L.content}>
            <header>
              <p className="text-xs font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase">
                {WIZARD_STEPS[step].title}
              </p>
              <h1 className="text-2xl lg:text-[28px] leading-tight font-semibold text-gray-900 dark:text-white mt-2">
                {copy.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2.5 leading-relaxed">
                {copy.description}
              </p>
            </header>

            <div className="mt-8">
              {step === 0 && <StepConnect draft={draft} update={updateDraft} />}
              {step === 1 && <StepProject draft={draft} update={updateDraft} />}
              {step === 2 && <StepEmailMapping draft={draft} update={updateDraft} />}
              {step === 3 && <StepSelectFields draft={draft} update={updateDraft} />}
              {step === 4 && <StepFieldMapping draft={draft} update={updateDraft} />}
              {step === 5 && <StepReview draft={draft} goToStep={goToStep} />}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className={`${L.bar} py-3.5 flex flex-wrap items-center justify-end gap-3`}>
            <div className="flex items-center gap-3">
              {blocked && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Info className="h-3.5 w-3.5" />
                  {blocked}
                </span>
              )}
              <Button variant="outline" size="sm" disabled={step === 0} onClick={() => goToStep(step - 1)}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
              {step < LAST ? (
                <Button size="sm" disabled={!!blocked} onClick={() => goToStep(step + 1)}>
                  Continue
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button size="sm" disabled={starting} onClick={finish}>
                  {starting ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {editing ? 'Save & sync' : 'Start Sync'}
                </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {confirmExit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {editing ? 'Discard these changes?' : 'Leave setup?'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
              {editing
                ? 'Your live connection keeps its current configuration and nothing stops syncing.'
                : `You're on step ${step + 1} of ${WIZARD_STEPS.length}. Everything you've filled in will be lost
                   and nothing will be synced.`}
            </p>
            <div className="flex flex-wrap justify-end gap-2 mt-5">
              <Button variant="ghost" size="sm" onClick={() => setConfirmExit(false)}>
                Keep editing
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={discardAndClose}
              >
                {editing ? 'Discard changes' : 'Discard setup'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Switches the wizard between its two shells mid-flow. Every answer is held in
 * the draft, so flipping keeps you on the same step with the same data — which
 * is what makes a side-by-side comparison meaningful.
 */
function LayoutToggle({
  layout,
  onChange,
}: {
  layout: WizardLayout;
  onChange: (l: WizardLayout) => void;
}) {
  const options: { id: WizardLayout; icon: typeof Maximize2 }[] = [
    { id: 'popup', icon: Minimize2 },
    { id: 'fullscreen', icon: Maximize2 },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Wizard layout"
      title="A/B test: switch the form between a popup and a full-screen page"
      className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-0.5"
    >
      <FlaskConical className="h-3 w-3 text-gray-400 dark:text-gray-500 ml-1 mr-0.5 hidden sm:block" />
      {options.map((o) => {
        const on = layout === o.id;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              on
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <o.icon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{LAYOUT_LABELS[o.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
