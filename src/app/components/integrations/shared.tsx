import { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Loader2, CircleDashed } from 'lucide-react';
import type { Provider, SyncStatus } from '../../contexts/IntegrationContext';

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

export function StatusPill({ status }: { status: SyncStatus | 'connected' | 'not-connected' | 'draft' }) {
  const map: Record<string, { label: string; cls: string; icon: ReactNode }> = {
    connected: {
      label: 'Connected',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    'not-connected': {
      label: 'Not Connected',
      cls: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
      icon: <CircleDashed className="h-3 w-3" />,
    },
    draft: {
      label: 'Setup in progress',
      cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
      icon: <CircleDashed className="h-3 w-3" />,
    },
    completed: {
      label: 'Completed',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    running: {
      label: 'Running',
      cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    failed: {
      label: 'Failed',
      cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
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
