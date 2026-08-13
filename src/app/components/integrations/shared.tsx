import { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Loader2, CircleDashed, type LucideIcon } from 'lucide-react';
import type { Provider, SyncStatus } from '../../contexts/IntegrationContext';
import { Pill, type PillTone } from '../ui/pill';

export function ProviderLogo({
  provider,
  size = 40,
  muted = false,
}: {
  provider: Provider;
  size?: number;
  /**
   * Neutral treatment for providers that aren't available yet. Desaturating the
   * brand colour instead would drop the initials below AA contrast.
   */
  muted?: boolean;
}) {
  if (muted) {
    return (
      <div
        className="rounded-lg flex items-center justify-center font-bold shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {provider.initials}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, backgroundColor: provider.color, fontSize: size * 0.36 }}
    >
      {provider.initials}
    </div>
  );
}

/**
 * Status now runs on the audited --pill-* tokens, so it retones with the theme
 * instead of carrying its own light/dark pairs. "Running" reads as info blue
 * because it is genuinely transient; everything settled uses ok/warn/error.
 */
export function StatusPill({ status }: { status: SyncStatus | 'connected' | 'not-connected' | 'draft' }) {
  const map: Record<string, { label: string; tone: PillTone; icon: LucideIcon; spin?: boolean }> = {
    connected: { label: 'Connected', tone: 'ok', icon: CheckCircle2 },
    'not-connected': { label: 'Not Connected', tone: 'neutral', icon: CircleDashed },
    draft: { label: 'Setup in progress', tone: 'warn', icon: CircleDashed },
    completed: { label: 'Completed', tone: 'ok', icon: CheckCircle2 },
    running: { label: 'Running', tone: 'info', icon: Loader2, spin: true },
    failed: { label: 'Failed', tone: 'error', icon: AlertCircle },
  };
  const s = map[status];
  return (
    <Pill tone={s.tone} size="md">
      <s.icon className={`h-3 w-3 ${s.spin ? 'animate-spin' : ''}`} />
      {s.label}
    </Pill>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{value}</p>
    </div>
  );
}

export function relativeTime(iso?: string) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
