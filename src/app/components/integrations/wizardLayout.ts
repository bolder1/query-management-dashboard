import { useCallback, useState } from 'react';

/**
 * The two shells the connection wizard can wear. Both render the identical
 * steps — only the framing differs — so an A/B test measures layout alone.
 */
export type WizardLayout = 'popup' | 'fullscreen';

const STORAGE_KEY = 'integration-wizard-layout';

export const LAYOUT_LABELS: Record<WizardLayout, string> = {
  popup: 'Popup',
  fullscreen: 'Full screen',
};

function read(): WizardLayout {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'fullscreen' || v === 'popup' ? v : 'popup';
  } catch {
    // Private browsing or blocked storage — fall back to the default.
    return 'popup';
  }
}

/** Remembers the chosen shell across reloads so a test run stays consistent. */
export function useWizardLayout() {
  const [layout, setLayout] = useState<WizardLayout>(read);

  const update = useCallback((next: WizardLayout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the choice just won't survive a reload.
    }
  }, []);

  return [layout, update] as const;
}

/** Every class that differs between the two shells, in one place. */
export const LAYOUT_STYLES: Record<
  WizardLayout,
  { scrim: string; panel: string; rail: string; content: string; bar: string; dismissOnScrimClick: boolean }
> = {
  popup: {
    scrim:
      'fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-md p-4 sm:p-6 lg:p-8',
    panel:
      'w-full max-w-6xl h-full max-h-[46rem] rounded-2xl bg-white dark:bg-gray-950 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden flex',
    rail: 'hidden lg:flex w-[268px] shrink-0 flex-col bg-[var(--rail-bg)] text-white border-r border-[var(--rail-line)]',
    content: 'mx-auto w-full max-w-4xl px-6 lg:px-10 py-8 lg:py-10',
    bar: 'mx-auto w-full max-w-4xl px-6 lg:px-10',
    dismissOnScrimClick: true,
  },
  fullscreen: {
    scrim: 'fixed inset-0 z-50 flex bg-white dark:bg-gray-950',
    panel: 'flex-1 min-w-0 flex overflow-hidden',
    rail: 'hidden lg:flex w-[320px] shrink-0 flex-col bg-[var(--rail-bg)] text-white border-r border-[var(--rail-line)]',
    content: 'mx-auto w-full max-w-5xl px-6 lg:px-16 py-10 lg:py-14',
    bar: 'mx-auto w-full max-w-5xl px-6 lg:px-16',
    dismissOnScrimClick: false,
  },
};
