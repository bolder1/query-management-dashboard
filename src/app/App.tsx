import { useCallback, type CSSProperties } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { FilterProvider, useFilters, type QueryResult } from './contexts/FilterContext';
import { NavProvider, useNav } from './contexts/NavContext';
import {
  IntegrationProvider, useIntegrations, type ImportedRow, type ProviderId,
} from './contexts/IntegrationContext';
import { DashboardHeader } from './components/DashboardHeader';
import { FilterSection } from './components/FilterSection';
import { StatisticsCards } from './components/StatisticsCards';
import { FilterChips } from './components/FilterChips';
import { QueryTable } from './components/QueryTable';
import { IntegrationInsights } from './components/IntegrationInsights';
import { IntegrationsPage } from './components/integrations/IntegrationsPage';
import { IntegrationDetail } from './components/integrations/IntegrationDetail';
import { ConnectionWizard } from './components/integrations/ConnectionWizard';
import { ConnectFlow } from './components/integrations/ConnectFlow';
import { MigrationTakeover } from './components/integrations/MigrationTakeover';
import { Toaster } from 'sonner';

/** Turns an external record into a native dashboard query. */
function toQueryResult(row: ImportedRow): QueryResult {
  return {
    createDate: row.createDate,
    subject: row.subject,
    query: row.query,
    email: row.email,
    type: row.type,
    priority: row.priority,
    group: 'Technical',
    thread: 'View',
    jiraTicket: row.externalId,
    assignee: row.assignee,
    customerStatus: 'Active',
    country: '—',
    customerType: 'existing-customer',
    replyPending: true,
    source: row.source,
    externalId: row.externalId,
    externalProject: row.project,
    custom: row.custom,
  };
}

function Pages() {
  const { page, detailId } = useNav();
  const { draft } = useIntegrations();

  return (
    <>
      {/* Two shells: a compact dialog for linking an account, and the step
          host for changing one saved answer. */}
      {draft?.mode === 'connect' && <ConnectFlow />}
      {draft?.mode === 'task' && <ConnectionWizard />}
      <MigrationTakeover />
      <DashboardHeader />

      {page === 'Reports' && (
        <>
          <FilterSection />
          <IntegrationInsights />
          <StatisticsCards />
          <FilterChips />
          <QueryTable />
        </>
      )}

      {page === 'Integrations' &&
        (detailId ? <IntegrationDetail providerId={detailId as ProviderId} /> : <IntegrationsPage />)}

      {page === 'User Management' && (
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">User management is coming soon.</p>
        </div>
      )}
    </>
  );
}

/** Sonner needs the mode and the palette handed to it explicitly. */
function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-right"
      richColors
      theme={theme}
      style={
        {
          '--success-bg': 'var(--toast-success-bg)',
          '--success-border': 'var(--toast-success-border)',
          '--success-text': 'var(--toast-success-text)',
          '--error-bg': 'var(--toast-error-bg)',
          '--error-border': 'var(--toast-error-border)',
          '--error-text': 'var(--toast-error-text)',
          '--info-bg': 'var(--toast-info-bg)',
          '--info-border': 'var(--toast-info-border)',
          '--info-text': 'var(--toast-info-text)',
          '--warning-bg': 'var(--toast-warning-bg)',
          '--warning-border': 'var(--toast-warning-border)',
          '--warning-text': 'var(--toast-warning-text)',
        } as CSSProperties
      }
    />
  );
}

function AppShell() {
  const { addQueries } = useFilters();
  const handleImport = useCallback(
    (rows: ImportedRow[]) => addQueries(rows.map(toQueryResult)),
    [addQueries],
  );

  return (
    <IntegrationProvider onImport={handleImport}>
      <NavProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          <Pages />
          <ThemedToaster />
        </div>
      </NavProvider>
    </IntegrationProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <FilterProvider>
        <AppShell />
      </FilterProvider>
    </ThemeProvider>
  );
}

export default App;
