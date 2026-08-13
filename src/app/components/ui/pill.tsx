import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * The one pill in the product.
 *
 * Colour comes from --pill-* custom properties, which are redefined under
 * `.dark` — so a pill carries no `dark:` variants and can never drift out of
 * sync between the two themes. Every pair is contrast-audited in theme.css.
 *
 * `accent` is Purple Ignite, the signature style: tags, counts, categories,
 * anything informational. The semantic tones are for state. Purple is never an
 * action colour — that stays blue — so a pill is never mistaken for a button.
 */
export type PillTone =
  | 'accent' | 'solid' | 'brand' | 'ok' | 'warn' | 'error' | 'info' | 'neutral' | 'surface';

const TONES: Record<PillTone, { bg: string; text: string; line: string }> = {
  accent: { bg: 'var(--pill-accent-bg)', text: 'var(--pill-accent-text)', line: 'var(--pill-accent-line)' },
  solid: { bg: 'var(--pill-accent-solid-bg)', text: 'var(--pill-accent-solid-text)', line: 'transparent' },
  /**
   * The action colour, for a pill that is a control in its on state. Uses the
   * audited --brand/--brand-contrast pair rather than white-on-blue, because
   * dark mode's lighter --brand only clears AA against the dark contrast token.
   */
  brand: { bg: 'var(--brand)', text: 'var(--brand-contrast)', line: 'transparent' },
  /**
   * Card-coloured with a hairline, for a row of choices where only one is
   * taken. `neutral`'s grey fill would read as a chip already carrying a value;
   * an unpicked option should look like an empty slot, not a filled one.
   */
  surface: { bg: 'var(--surface-card)', text: 'var(--pill-neutral-text)', line: 'var(--pill-neutral-line)' },
  ok: { bg: 'var(--pill-ok-bg)', text: 'var(--pill-ok-text)', line: 'var(--pill-ok-line)' },
  warn: { bg: 'var(--pill-warn-bg)', text: 'var(--pill-warn-text)', line: 'var(--pill-warn-line)' },
  error: { bg: 'var(--pill-error-bg)', text: 'var(--pill-error-text)', line: 'var(--pill-error-line)' },
  info: { bg: 'var(--pill-info-bg)', text: 'var(--pill-info-text)', line: 'var(--pill-info-line)' },
  neutral: { bg: 'var(--pill-neutral-bg)', text: 'var(--pill-neutral-text)', line: 'var(--pill-neutral-line)' },
};

const toneStyle = (t: PillTone) => ({
  backgroundColor: TONES[t].bg,
  color: TONES[t].text,
  borderColor: TONES[t].line,
});

/**
 * 12px is the floor for anything carrying a word. `xs` stays smaller because it
 * is only ever used for a bare count or a single glyph in a dense row — the
 * moment a badge has a label on it, it needs to be legible at a glance, and 11px
 * uppercase-adjacent badge text was the main thing making the setup flow squint-y.
 */
const SIZES = {
  xs: 'text-[11px] px-1.5 py-px gap-1',
  sm: 'text-xs px-2 py-0.5 gap-1.5',
  md: 'text-[13px] px-2.5 py-1 gap-1.5',
  /** A standalone control rather than a badge on something — needs a real hit area. */
  lg: 'text-xs px-3 py-1.5 gap-1.5',
} as const;

export function Pill({
  tone = 'neutral',
  size = 'sm',
  icon: Icon,
  children,
  className = '',
  title,
}: {
  tone?: PillTone;
  size?: keyof typeof SIZES;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      style={toneStyle(tone)}
      className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap shrink-0 ${SIZES[size]} ${className}`}
    >
      {Icon && <Icon className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />}
      {children}
    </span>
  );
}

/**
 * A pill that does something. Kept separate from Pill so the static badge stays
 * a `span` — a filter chip is a real control and needs focus and pressed state.
 */
export function PillButton({
  tone = 'neutral',
  size = 'sm',
  icon: Icon,
  active,
  onClick,
  children,
  title,
  className = '',
}: {
  tone?: PillTone;
  size?: keyof typeof SIZES;
  icon?: LucideIcon;
  active?: boolean;
  onClick: () => void;
  children?: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      /* Picked reads as an action, so it takes the action colour. Purple stays
         the accent for things that only carry information. */
      style={toneStyle(active ? 'brand' : tone)}
      className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pill-accent-icon)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-card)] ${SIZES[size]} ${active ? '' : 'hover:border-[var(--pill-accent-line)]'} ${className}`}
    >
      {Icon && <Icon className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />}
      {children}
    </button>
  );
}
