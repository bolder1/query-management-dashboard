import { useState } from 'react';
import {
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ExternalLink, HelpCircle,
  KeyRound, ChevronRight, ArrowLeft, Zap, RefreshCw, ShieldCheck,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import type { WizardDraft } from '../../contexts/IntegrationContext';
import { AtlassianConsent, AtlassianMark } from './AtlassianConsent';

type TestState = 'idle' | 'testing' | 'success' | 'error';
/** Which path the user is on: undecided, the OAuth hand-off, or manual token entry. */
type Method = null | 'atlassian' | 'token';

function isValidUrl(v: string) {
  return /^https:\/\/[\w-]+(\.[\w-]+)+\/?$/.test(v.trim());
}
function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

const DISCOVERED_SITE = 'https://acme-corp.atlassian.net';

export function StepConnect({
  draft,
  update,
}: {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft>) => void;
}) {
  const [method, setMethod] = useState<Method>(
    draft.connected ? (draft.authMethod === 'atlassian' ? 'atlassian' : 'token') : null,
  );
  const [showToken, setShowToken] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [test, setTest] = useState<TestState>(draft.connected ? 'success' : 'idle');
  const [showHelp, setShowHelp] = useState(false);
  const [consent, setConsent] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  const urlError = touched.url && !isValidUrl(draft.siteUrl)
    ? 'Enter a full site URL, e.g. https://company.atlassian.net' : '';
  const emailError = touched.email && !isValidEmail(draft.email)
    ? 'Enter the email address of your Atlassian account' : '';
  const tokenError = touched.token && draft.token.trim().length < 8
    ? 'API tokens are at least 8 characters' : '';

  const canTest = isValidUrl(draft.siteUrl) && isValidEmail(draft.email) && draft.token.trim().length >= 8;
  const isDemoToken = draft.token.startsWith('ATATT') || draft.token.startsWith('SF_demo') ||
    draft.token.startsWith('SN_demo') || draft.token.startsWith('ZD_demo');

  const runTest = () => {
    setTest('testing');
    window.setTimeout(() => {
      // Anything containing "bad" simulates a rejected token.
      const ok = !draft.token.toLowerCase().includes('bad');
      setTest(ok ? 'success' : 'error');
      update({ connected: ok, authMethod: 'direct' });
    }, isDemoToken ? 500 : 1300);
  };

  const invalidate = (patch: Partial<WizardDraft>) => {
    update({ ...patch, connected: false });
    if (test !== 'idle') setTest('idle');
  };

  /** Consent granted — find the site the account can reach, then we're in. */
  const onApprove = (email: string) => {
    setConsent(false);
    setDiscovering(true);
    window.setTimeout(() => {
      update({ email, siteUrl: DISCOVERED_SITE, connected: true, authMethod: 'atlassian' });
      setTest('success');
      setDiscovering(false);
      toast.success('Jira connected', { description: `Signed in as ${email} — read-only access granted.` });
    }, 1200);
  };

  const disconnect = () => {
    update({ connected: false });
    setTest('idle');
    setMethod(null);
  };

  /* ------------------------- Connected: show the account ------------------------ */
  if (draft.connected) {
    return (
      <div className="w-full">
        {/*
         * Green is the status signal only — the status bar and the dot. The body
         * stays on the neutral card surface so the account itself is the loudest
         * thing in the card, then the site, then the metadata.
         */}
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
          {/* Status bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-700 dark:bg-emerald-800">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              Connected
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              <ShieldCheck className="h-3 w-3" />
              Read-only
            </span>
          </div>

          {/* Identity — the headline of this card */}
          <div className="flex items-center gap-3.5 px-4 py-4">
            <span className="h-11 w-11 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
              {draft.authMethod === 'atlassian'
                ? <AtlassianMark size={22} />
                : <KeyRound className="h-5 w-5 text-gray-500 dark:text-gray-400" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {draft.email}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {draft.siteUrl.replace('https://', '')}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>

          {/* Supporting detail — quiet, neutral, clearly subordinate */}
          <dl className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-800 divide-x divide-gray-100 dark:divide-gray-800">
            <div className="px-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Signed in with
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-0.5">
                {draft.authMethod === 'atlassian' ? 'Atlassian account' : 'API token'}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Scope
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white mt-0.5">Issues &amp; projects</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nothing is synced yet — that happens at the last step.
            </p>
            <Button variant="outline" size="sm" className="bg-white dark:bg-gray-900" onClick={disconnect}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Switch account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------- Undecided: pick a path -------------------------- */
  if (method === null) {
    return (
      <div className="w-full">
        {consent && (
          <AtlassianConsent siteUrl={DISCOVERED_SITE} onCancel={() => setConsent(false)} onApprove={onApprove} />
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setConsent(true)}
            className="group w-full flex items-center gap-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-left transition-colors hover:border-blue-500 dark:hover:border-blue-600"
          >
            <span className="h-11 w-11 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
              <AtlassianMark size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Continue with Atlassian</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                  <Zap className="h-2.5 w-2.5" />
                  Recommended
                </span>
              </span>
              <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
                Two clicks, no token to generate or rotate. We read your Jira site from your Atlassian account.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setMethod('token')}
            className="group w-full flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-left transition-colors hover:border-gray-400 dark:hover:border-gray-500"
          >
            <span className="h-11 w-11 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Use an API token</span>
              <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
                For sites without Atlassian SSO, or when you need a dedicated service account.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
          </button>
        </div>

        {discovering && (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">Finding the Jira sites this account can reach…</p>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------ Manual token path ----------------------------- */
  return (
    <div className="w-full">
      <button
        onClick={() => setMethod(null)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Other sign-in options
      </button>

      {isDemoToken && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
          <span className="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">Demo</span>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Sample credentials are pre-filled — hit <span className="font-medium">Test connection</span>, or replace
            them with your own.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm text-gray-700 dark:text-gray-300">Jira URL</Label>
          <Input
            value={draft.siteUrl}
            onChange={(e) => invalidate({ siteUrl: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, url: true }))}
            placeholder="https://company.atlassian.net"
            className={`mt-1.5 ${urlError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
          />
          {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
        </div>

        <div>
          <Label className="text-sm text-gray-700 dark:text-gray-300">Email</Label>
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => invalidate({ email: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="admin@company.com"
            className={`mt-1.5 ${emailError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
          />
          {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-gray-700 dark:text-gray-300">API Token</Label>
            <button
              type="button"
              onClick={() => setShowHelp((s) => !s)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <HelpCircle className="h-3 w-3" />
              How to generate an API token
            </button>
          </div>
          <div className="relative mt-1.5">
            <Input
              type={showToken ? 'text' : 'password'}
              value={draft.token}
              onChange={(e) => invalidate({ token: e.target.value })}
              onBlur={() => setTouched((t) => ({ ...t, token: true }))}
              placeholder="••••••••••••••••"
              className={`pr-9 ${tokenError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowToken((s) => !s)}
              aria-label={showToken ? 'Hide token' : 'Show token'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {tokenError && <p className="text-xs text-red-500 mt-1">{tokenError}</p>}

          {showHelp && (
            <div className="mt-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-3">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300">Generate a Jira API token</p>
              <ol className="mt-1.5 space-y-1 text-xs text-blue-800 dark:text-blue-300/90 list-decimal list-inside">
                <li>Open your Atlassian account security settings.</li>
                <li>Select <span className="font-medium">Create API token</span>.</li>
                <li>Give it a label such as “Query Management Dashboard”.</li>
                <li>Copy the token and paste it above — it is shown only once.</li>
              </ol>
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline"
              >
                Open Atlassian API tokens
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 flex items-center gap-3">
          <Button disabled={!canTest || test === 'testing'} onClick={runTest}>
            {test === 'testing' && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {test === 'testing' ? 'Testing connection…' : 'Test connection'}
          </Button>
          {!canTest && <span className="text-xs text-gray-400">Fill all three fields to test</span>}
        </div>

        {test === 'error' && (
          <div className="lg:col-span-2 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Unable to connect. Check your Jira URL and credentials.
              </p>
              <p className="text-xs text-red-700 dark:text-red-400/80 mt-0.5">
                The token was rejected by {draft.siteUrl}. Tokens expire — try generating a new one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
