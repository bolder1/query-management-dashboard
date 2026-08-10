import { useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';

const ACCOUNTS = [
  { email: 'admin@acme-corp.com', name: 'Alex Rivera', initials: 'AR', color: '#0052cc' },
  { email: 'ops@acme-corp.com', name: 'Acme Operations', initials: 'AO', color: '#0b7a43' },
];

const SCOPES = [
  'See your name, email address and Atlassian profile',
  'Read issues and projects you have access to',
  'Read project and field metadata',
];

/** Atlassian's mark, drawn inline so no external asset is needed. */
export function AtlassianMark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="atl-grad" x1="10.2" y1="17.3" x2="4.5" y2="27.2" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0052cc" />
          <stop offset="0.92" stopColor="#2684ff" />
        </linearGradient>
      </defs>
      <path
        fill="url(#atl-grad)"
        d="M9.3 14.9a.86.86 0 0 0-1.46.14L.09 30.5a.89.89 0 0 0 .8 1.29h10.8a.86.86 0 0 0 .8-.48c2.33-4.81.92-12.12-3.19-16.4Z"
      />
      <path
        fill="#2681ff"
        d="M15.26.62a19.4 19.4 0 0 0-1.13 19.15l5.2 10.4a.89.89 0 0 0 .8.49h10.8a.89.89 0 0 0 .8-1.29S17.19 1.1 16.77.76a.86.86 0 0 0-1.51-.14Z"
      />
    </svg>
  );
}

type Stage = 'choose' | 'consent' | 'granting';

/**
 * Simulated Atlassian OAuth flow used by the "automatic" connection method.
 * Nothing leaves the browser — it mirrors the real screens so the prototype
 * reads correctly end to end.
 */
export function AtlassianConsent({
  siteUrl,
  onCancel,
  onApprove,
}: {
  siteUrl: string;
  onCancel: () => void;
  onApprove: (email: string) => void;
}) {
  const [stage, setStage] = useState<Stage>('choose');
  const [account, setAccount] = useState(ACCOUNTS[0].email);

  const grant = () => {
    setStage('granting');
    window.setTimeout(() => onApprove(account), 1400);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 pt-16 px-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-7 pt-7 pb-5 text-center border-b border-gray-100 dark:border-gray-800">
          <div className="flex justify-center">
            <AtlassianMark size={28} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-3">
            {stage === 'choose' ? 'Choose an Atlassian account' : 'Query Management Dashboard wants access'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {stage === 'choose'
              ? 'to continue to Query Management Dashboard'
              : `Signed in as ${account}`}
          </p>
        </div>

        {stage === 'choose' && (
          <div className="p-3">
            {ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => { setAccount(a.email); setStage('consent'); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                  style={{ backgroundColor: a.color }}
                >
                  {a.initials}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-gray-900 dark:text-white">{a.name}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{a.email}</span>
                </span>
              </button>
            ))}
            <button
              onClick={onCancel}
              className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Use another account
            </button>
          </div>
        )}

        {(stage === 'consent' || stage === 'granting') && (
          <div className="px-7 py-5">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              This will allow Query Management Dashboard to:
            </p>
            <ul className="mt-3 space-y-2.5">
              {SCOPES.map((s) => (
                <li key={s} className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{s}</span>
                </li>
              ))}
            </ul>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Access is read-only and applies to {siteUrl.replace('https://', '')}. You can revoke it at any time
              from your Atlassian account settings.
            </p>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" size="sm" disabled={stage === 'granting'} onClick={onCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={stage === 'granting'}
                onClick={grant}
                className="bg-[#0052cc] hover:bg-[#0747a6] text-white"
              >
                {stage === 'granting' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Accept
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
