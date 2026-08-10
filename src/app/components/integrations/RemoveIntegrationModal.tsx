import { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { PROVIDERS, useIntegrations, type ProviderId } from '../../contexts/IntegrationContext';
import { ProviderLogo } from './shared';

/** Picks a connected integration and confirms taking it out entirely. */
export function RemoveIntegrationModal({
  onClose,
  onRemove,
}: {
  onClose: () => void;
  onRemove: (id: ProviderId) => void;
}) {
  const { connections } = useIntegrations();
  const connected = PROVIDERS.filter((p) => connections[p.id]);
  const [selected, setSelected] = useState<ProviderId | null>(connected[0]?.id ?? null);
  const [confirming, setConfirming] = useState(false);

  const selectedProvider = PROVIDERS.find((p) => p.id === selected);
  const conn = selected ? connections[selected] : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 pt-5 pb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Remove integration</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Choose the system you want to stop syncing.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-5 space-y-2 max-h-72 overflow-y-auto">
          {connected.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              Nothing is connected yet, so there is nothing to remove.
            </p>
          )}
          {connected.map((p) => {
            const active = selected === p.id;
            const c = connections[p.id]!;
            return (
              <button
                key={p.id}
                onClick={() => { setSelected(p.id); setConfirming(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border rounded-lg transition-colors ${
                  active
                    ? 'border-red-400 bg-red-50/70 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-red-300'
                }`}
              >
                <ProviderLogo provider={p} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {c.config.account} · {c.totalImported} imported record{c.totalImported === 1 ? '' : 's'}
                  </p>
                </div>
                {active && <Check className="h-4 w-4 text-red-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        {confirming && selectedProvider && (
          <div className="mx-6 mb-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">
              Removing {selectedProvider.name} deletes its stored credentials and takes its{' '}
              {conn?.totalImported ?? 0} imported record{conn?.totalImported === 1 ? '' : 's'} out of Query Results.
              Nothing changes inside {selectedProvider.name}.
            </p>
          </div>
        )}

        <div className="px-6 py-3.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              if (!confirming) { setConfirming(true); return; }
              onRemove(selected);
              onClose();
            }}
          >
            {confirming ? `Yes, remove ${selectedProvider?.name}` : 'Remove'}
          </Button>
        </div>
      </div>
    </div>
  );
}
