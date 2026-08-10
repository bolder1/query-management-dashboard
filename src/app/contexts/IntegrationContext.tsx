import { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';

/* ---------------------------------- Types --------------------------------- */

export type ProviderId =
  | 'jira' | 'salesforce' | 'servicenow' | 'zendesk'
  | 'freshdesk' | 'hubspot' | 'linear' | 'intercom' | 'github' | 'asana';

export interface Provider {
  id: ProviderId;
  name: string;
  category: string;
  description: string;
  color: string;      // brand accent
  initials: string;
  available: boolean; // false => "Coming soon"
  /** Rough timing shown on coming-soon cards so the wait feels bounded. */
  eta?: string;
}

export interface ExternalProject {
  id: string;
  name: string;
  key: string;
  type: string;
  issues: number;
}

export interface FieldMap {
  id: string;
  source: string;      // Jira field
  target: string;      // Query Management field (free text — editable)
  label: string;       // display label in dashboard
  visible: boolean;
  /** Exposed as a filter control on the Reports page. */
  filterable: boolean;
}

export type SyncStatus = 'completed' | 'running' | 'failed';

/** How the account was linked. */
export type AuthMethod = 'direct' | 'atlassian';

/** Ordered stages the animated sync pipeline walks through. */
export const SYNC_PHASES = [
  { id: 'connecting', label: 'Opening secure channel' },
  { id: 'authenticating', label: 'Verifying credentials' },
  { id: 'fetching', label: 'Reading issues' },
  { id: 'mapping', label: 'Applying field mapping' },
  { id: 'importing', label: 'Writing to dashboard' },
  { id: 'done', label: 'Sync complete' },
] as const;

export type SyncPhase = (typeof SYNC_PHASES)[number]['id'];

/** Records a first sync brings across — the most recent batch, not the backlog. */
export const SYNC_BATCH_SIZE = 24;

export interface SyncRun {
  id: string;
  startedAt: string;
  status: SyncStatus;
  imported: number;
  failed: number;
  durationMs: number;
  logs: { level: 'info' | 'warn' | 'error'; time: string; message: string }[];
}

export interface IntegrationConfig {
  providerId: ProviderId;
  siteUrl: string;
  account: string;
  authMethod: AuthMethod;
  projects: ExternalProject[];
  issueTypes: string[];
  mappings: FieldMap[];
  emailMapping: EmailMapping;
}

export interface Connection {
  config: IntegrationConfig;
  connectedAt: string;
  runs: SyncRun[];
  totalImported: number;
  syncing: boolean;
  /** Live pipeline state, driven while `syncing` is true. */
  phase: SyncPhase;
  progress: number;   // 0-100
  processed: number;  // records written so far in the active run
  target: number;     // records the active run will write
}

/* -------------------------------- Catalog --------------------------------- */

export const PROVIDERS: Provider[] = [
  {
    id: 'jira', name: 'Jira', category: 'Issue Tracking', initials: 'JR',
    description: 'Import bugs, tasks and service requests from Jira projects as queries.',
    color: '#2563eb', available: true,
  },
  {
    id: 'salesforce', name: 'Salesforce', category: 'CRM', initials: 'SF',
    description: 'Sync cases and leads from your Salesforce org.',
    color: '#0ea5e9', available: false, eta: 'Q3 2026',
  },
  {
    id: 'servicenow', name: 'ServiceNow', category: 'ITSM', initials: 'SN',
    description: 'Bring incidents and service catalog requests into the dashboard.',
    color: '#059669', available: false, eta: 'Q3 2026',
  },
  {
    id: 'zendesk', name: 'Zendesk', category: 'Support', initials: 'ZD',
    description: 'Import support tickets and side conversations.',
    color: '#16a34a', available: false, eta: 'Q4 2026',
  },
  {
    id: 'freshdesk', name: 'Freshdesk', category: 'Support', initials: 'FD',
    description: 'Pull helpdesk tickets and customer conversations.',
    color: '#f97316', available: false, eta: 'Q4 2026',
  },
  {
    id: 'hubspot', name: 'HubSpot', category: 'CRM', initials: 'HS',
    description: 'Import deals, tickets and contact-level context.',
    color: '#ef4444', available: false, eta: 'Q4 2026',
  },
  {
    id: 'linear', name: 'Linear', category: 'Issue Tracking', initials: 'LN',
    description: 'Sync issues and projects from Linear workspaces.',
    color: '#6366f1', available: false, eta: 'Q1 2027',
  },
  {
    id: 'intercom', name: 'Intercom', category: 'Support', initials: 'IC',
    description: 'Bring in conversations from your Intercom inbox.',
    color: '#0284c7', available: false, eta: 'Q1 2027',
  },
  {
    id: 'github', name: 'GitHub', category: 'Issue Tracking', initials: 'GH',
    description: 'Import issues and discussions from your repositories.',
    color: '#334155', available: false, eta: 'Q1 2027',
  },
  {
    id: 'asana', name: 'Asana', category: 'Work Management', initials: 'AS',
    description: 'Sync tasks and requests from Asana projects.',
    color: '#db2777', available: false, eta: 'Q2 2027',
  },
];

export const MOCK_PROJECTS: ExternalProject[] = [
  { id: 'p1', name: 'IT Support', key: 'ITS', type: 'Service Management', issues: 1284 },
  { id: 'p2', name: 'Customer Success', key: 'CS', type: 'Business', issues: 642 },
  { id: 'p3', name: 'Platform Engineering', key: 'PLAT', type: 'Software', issues: 3117 },
  { id: 'p4', name: 'Billing & Payments', key: 'BILL', type: 'Software', issues: 458 },
  { id: 'p5', name: 'Mobile App', key: 'MOB', type: 'Software', issues: 921 },
  { id: 'p6', name: 'Security Operations', key: 'SEC', type: 'Service Management', issues: 233 },
  { id: 'p7', name: 'Data Platform', key: 'DATA', type: 'Software', issues: 771 },
  { id: 'p8', name: 'Partner Onboarding', key: 'PART', type: 'Business', issues: 96 },
  { id: 'p9', name: 'Web Storefront', key: 'WEB', type: 'Software', issues: 1408 },
  { id: 'p10', name: 'Identity & Access', key: 'IAM', type: 'Service Management', issues: 517 },
  { id: 'p11', name: 'Marketing Ops', key: 'MKT', type: 'Business', issues: 284 },
  { id: 'p12', name: 'Field Operations', key: 'FIELD', type: 'Service Management', issues: 662 },
  { id: 'p13', name: 'Analytics & Reporting', key: 'ANLY', type: 'Software', issues: 389 },
  { id: 'p14', name: 'Procurement', key: 'PROC', type: 'Business', issues: 141 },
  { id: 'p15', name: 'Warehouse Systems', key: 'WHSE', type: 'Software', issues: 803 },
  { id: 'p16', name: 'Customer Onboarding', key: 'CONB', type: 'Service Management', issues: 452 },
  { id: 'p17', name: 'Payments Gateway', key: 'PAY', type: 'Software', issues: 1176 },
  { id: 'p18', name: 'HR Service Desk', key: 'HRSD', type: 'Service Management', issues: 327 },
  { id: 'p19', name: 'Content Platform', key: 'CNTP', type: 'Software', issues: 598 },
  { id: 'p20', name: 'Legal & Compliance', key: 'LEGL', type: 'Business', issues: 118 },
  { id: 'p21', name: 'Network Operations', key: 'NETOPS', type: 'Service Management', issues: 944 },
  { id: 'p22', name: 'Design System', key: 'DS', type: 'Software', issues: 265 },
  { id: 'p23', name: 'Sales Enablement', key: 'SALE', type: 'Business', issues: 173 },
  { id: 'p24', name: 'Quality Assurance', key: 'QA', type: 'Software', issues: 1332 },
  { id: 'p25', name: 'Facilities Requests', key: 'FAC', type: 'Service Management', issues: 209 },
  { id: 'p26', name: 'Developer Portal', key: 'DEVP', type: 'Software', issues: 486 },
  { id: 'p27', name: 'Localization', key: 'LOC', type: 'Business', issues: 92 },
  { id: 'p28', name: 'Incident Response', key: 'IR', type: 'Service Management', issues: 741 },
];

/* ------------------------------ Email mapping ----------------------------- */

/**
 * A Jira field that can supply the customer's email address. Whichever one is
 * picked feeds the dashboard's Email column.
 */
export interface EmailSource {
  field: string;
  description: string;
  /** Share of recent issues that actually have this field populated. */
  coverage: number;
  samples: [string, string];
}

export const EMAIL_SOURCE_FIELDS: EmailSource[] = [
  {
    field: 'Reporter Email',
    description: 'The email on the Jira account that raised the issue',
    coverage: 96,
    samples: ['dana.kim@northwind.com', 'omar.s@globex.io'],
  },
  {
    field: 'Portal User Email',
    description: 'The customer portal account the request was raised from',
    coverage: 89,
    samples: ['dana.kim@northwind.com', 'priya@blueharbor.org'],
  },
  {
    field: 'Assignee Email',
    description: 'The agent the issue is currently assigned to',
    coverage: 84,
    samples: ['aarav.sharma@acme-corp.com', 'priya.patel@acme-corp.com'],
  },
  {
    field: 'Request Participants',
    description: 'Service-desk participants copied on the request',
    coverage: 74,
    samples: ['lena.f@initech.co', 'ops@umbrella-health.com'],
  },
  {
    field: 'Contact Email',
    description: 'The primary contact stored on the linked customer record',
    coverage: 68,
    samples: ['omar.s@globex.io', 'contact@meridian-bank.com'],
  },
  {
    field: 'Support Alias',
    description: 'The shared inbox the request was forwarded from',
    coverage: 65,
    samples: ['support@vertexlabs.io', 'helpdesk@initech.co'],
  },
  {
    field: 'On-behalf-of Email',
    description: 'Set when an agent raises a request for someone else',
    coverage: 61,
    samples: ['lena.f@initech.co', 'dana.kim@northwind.com'],
  },
  {
    field: 'Notification Email',
    description: 'Where Jira sends updates for this issue',
    coverage: 57,
    samples: ['alerts@sterling-retail.com', 'ops@umbrella-health.com'],
  },
  {
    field: 'Organization Email',
    description: 'The service-desk organization the reporter belongs to',
    coverage: 52,
    samples: ['it@northwind.com', 'ops@globex.io'],
  },
  {
    field: 'Account Owner Email',
    description: 'The named account owner on the customer record',
    coverage: 46,
    samples: ['owner@meridian-bank.com', 'am@blueharbor.org'],
  },
  {
    field: 'CC Recipients',
    description: 'Everyone copied on the originating email',
    coverage: 44,
    samples: ['team@initech.co', 'billing@sterling-retail.com'],
  },
  {
    field: 'Customer Email (custom)',
    description: 'A custom field your intake form writes to',
    coverage: 41,
    samples: ['billing@sterling-retail.com', '—'],
  },
  {
    field: 'Watchers',
    description: 'The first watcher added to the issue',
    coverage: 35,
    samples: ['qa@vertexlabs.io', '—'],
  },
  {
    field: 'Approver Email',
    description: 'The approver captured by the request workflow',
    coverage: 31,
    samples: ['meera.iyer@acme-corp.com', '—'],
  },
  {
    field: 'Billing Contact',
    description: 'The billing address on the customer account',
    coverage: 29,
    samples: ['billing@sterling-retail.com', '—'],
  },
  {
    field: 'Description (parsed)',
    description: 'The first email address found in the issue body',
    coverage: 22,
    samples: ['support@vertexlabs.io', '—'],
  },
  {
    field: 'Escalation Contact',
    description: 'Filled in only when an issue is escalated',
    coverage: 18,
    samples: ['escalations@umbrella-health.com', '—'],
  },
  {
    field: 'Vendor Contact',
    description: 'The third-party vendor handling the request',
    coverage: 12,
    samples: ['support@vendor-partners.com', '—'],
  },
];

/** Where the dashboard's Email column is fetched from. */
export interface EmailMapping {
  /** The Jira field supplying the email address. */
  sourceField: string;
}

export function defaultEmailMapping(): EmailMapping {
  return { sourceField: '' };
}

/** The dashboard column the email address always lands in. */
export const EMAIL_TARGET = 'Email';

export const ISSUE_TYPES = [
  { id: 'Bug', description: 'Defects reported by customers or QA', count: 412 },
  { id: 'Task', description: 'Actionable work items', count: 388 },
  { id: 'Service Request', description: 'Requests raised through the service desk', count: 274 },
  { id: 'Story', description: 'Product backlog items', count: 156 },
  { id: 'Incident', description: 'Production incidents and outages', count: 54 },
];

/** Suggestions offered while typing a dashboard field name — the input stays free text. */
export const TARGET_FIELDS = [
  'Query Title', 'Description', 'Status', 'Owner', 'Priority',
  'Group', 'Query Type', 'Created Date', 'Email', 'Country',
];

export const SOURCE_FIELDS = [
  'Summary', 'Description', 'Status', 'Assignee', 'Priority',
  'Project', 'Issue Type', 'Created', 'Reporter Email', 'Labels',
  'Components', 'Due Date', 'Resolution', 'Epic Link',
  'Story Points', 'Sprint', 'Reporter', 'Fix Version', 'Environment',
];

/**
 * Jira fields we can confidently match to a dashboard column on our own.
 * Anything outside this list is deliberately left for the user to map, so the
 * mapping step is a real decision rather than a rubber stamp.
 */
export const AUTO_TARGETS: Record<string, string> = {
  Summary: 'Query Title',
  Description: 'Description',
  Created: 'Created Date',
  'Reporter Email': 'Email',
};

/**
 * The recommended set of Jira fields, offered as a one-click shortcut on the
 * field step. Nothing is selected on the user's behalf — the wizard starts with
 * an empty table and this is only applied when they ask for it.
 */
export const DEFAULT_MAPPINGS: FieldMap[] = [
  { id: 'm1', source: 'Summary', target: 'Query Title', label: 'Query Title', visible: true, filterable: false },
  { id: 'm2', source: 'Description', target: 'Description', label: 'Description', visible: true, filterable: false },
  { id: 'm3', source: 'Created', target: 'Created Date', label: 'Created Date', visible: true, filterable: false },
  { id: 'm5', source: 'Status', target: '', label: '', visible: true, filterable: false },
  { id: 'm6', source: 'Assignee', target: '', label: '', visible: true, filterable: false },
  { id: 'm7', source: 'Priority', target: '', label: '', visible: true, filterable: false },
  { id: 'm8', source: 'Issue Type', target: '', label: '', visible: true, filterable: false },
];

/** Sample values used to populate filterable columns on imported records. */
const CUSTOM_VALUE_POOLS: Record<string, string[]> = {
  Status: ['Open', 'In Progress', 'Resolved'],
  Priority: ['High', 'Medium', 'Low'],
  'Query Type': ['Bug', 'Task', 'Service Request'],
  'Issue Type': ['Bug', 'Task', 'Service Request'],
  Owner: ['Aarav Sharma', 'Priya Patel', 'Rohit Mehta'],
  Sprint: ['Sprint 41', 'Sprint 42', 'Sprint 43'],
  Environment: ['Production', 'Staging', 'Sandbox'],
  'Story Points': ['1', '3', '5', '8'],
};

export function customFieldValue(label: string, index: number) {
  const pool = CUSTOM_VALUE_POOLS[label] ?? ['Segment A', 'Segment B', 'Segment C'];
  return pool[index % pool.length];
}

export function customFieldOptions(label: string) {
  return CUSTOM_VALUE_POOLS[label] ?? ['Segment A', 'Segment B', 'Segment C'];
}

/* ------------------------------ Wizard draft ------------------------------ */

export interface WizardDraft {
  providerId: ProviderId;
  step: number;                 // 0-based
  authMethod: AuthMethod;
  siteUrl: string;
  email: string;
  token: string;
  connected: boolean;
  projectIds: string[];
  issueTypes: string[];
  mappings: FieldMap[];
  emailMapping: EmailMapping;
  /**
   * Whether the field step has already offered its starting selection. It only
   * ever seeds once, so clearing the table doesn't refill behind the user.
   */
  fieldsSeeded: boolean;
  /** Wall-clock of the last edit, shown on the resume card. */
  updatedAt: string;
}

/** Ordered wizard steps — the single source of truth for step indices. */
export const WIZARD_STEPS = [
  { title: 'Connect', hint: 'Sign in to Jira' },
  { title: 'Project', hint: 'Pick what to sync' },
  { title: 'Email', hint: 'Where it comes from' },
  { title: 'Fields', hint: 'Choose what to bring' },
  { title: 'Mapping', hint: 'Match to columns' },
  { title: 'Review', hint: 'Confirm and sync' },
] as const;

/** Demo credentials — realistic enough for prototype walkthroughs, never reach a real API. */
const DEMO_PREFILL: Partial<Record<ProviderId, { siteUrl: string; email: string; token: string }>> = {
  jira: {
    siteUrl: 'https://acme-corp.atlassian.net',
    email: 'admin@acme-corp.com',
    token: 'ATATT3xFfGF0demoQZKTelO8r2vNp9kJmLuX4wYb',
  },
  salesforce: {
    siteUrl: 'https://acme-corp.my.salesforce.com',
    email: 'admin@acme-corp.com',
    token: 'SF_demo_00D5g000004GZ3AEAW_token_xyz',
  },
  servicenow: {
    siteUrl: 'https://acme-corp.service-now.com',
    email: 'admin@acme-corp.com',
    token: 'SN_demo_bearer_v1_acmecorp_prod_2026',
  },
  zendesk: {
    siteUrl: 'https://acme-corp.zendesk.com',
    email: 'admin@acme-corp.com',
    token: 'ZD_demo_api_v2_acmecorp_prod_2026xx',
  },
};

export function emptyDraft(providerId: ProviderId): WizardDraft {
  const { siteUrl, email, token } =
    DEMO_PREFILL[providerId] ?? { siteUrl: '', email: '', token: '' };
  return {
    providerId,
    step: 0,
    authMethod: 'atlassian',
    siteUrl,
    email,
    token,
    connected: false,
    projectIds: [],
    issueTypes: ['Bug', 'Task', 'Service Request'],
    // The field step seeds its own starting selection once it knows the
    // project's schema; until then there is nothing to show.
    mappings: [],
    fieldsSeeded: false,
    emailMapping: defaultEmailMapping(),
    updatedAt: new Date().toISOString(),
  };
}

/* --------------------------------- Context -------------------------------- */

interface IntegrationContextType {
  connections: Partial<Record<ProviderId, Connection>>;
  draft: WizardDraft | null;
  startWizard: (providerId: ProviderId, authMethod?: AuthMethod) => void;
  updateDraft: (patch: Partial<WizardDraft>) => void;
  cancelWizard: () => void;
  /** Providers the user asked to be told about when they ship. */
  notifyList: ProviderId[];
  toggleNotify: (providerId: ProviderId) => void;
  /** Set once a connection finishes its very first sync; cleared when acknowledged. */
  firstSyncDone: ProviderId | null;
  acknowledgeFirstSync: () => void;
  /**
   * The provider whose first-time migration takeover is on screen. Set when the
   * wizard finishes; cleared by the takeover, which then lands on the overview.
   */
  migrating: ProviderId | null;
  finishMigration: () => void;
  /** Persists the draft as a connection and kicks off the animated first sync. */
  completeWizard: () => void;
  /** Removes an integration entirely (credentials + imported records). */
  removeIntegration: (providerId: ProviderId) => void;
  runSync: (providerId: ProviderId, retryFailed?: boolean) => void;
  updateConfig: (providerId: ProviderId, patch: Partial<IntegrationConfig>) => void;
  /** Every filterable mapped field across all live connections. */
  filterFields: { label: string; source: string; provider: string }[];
  onImport?: (rows: ImportedRow[]) => void;
}

export interface ImportedRow {
  externalId: string;
  project: string;
  subject: string;
  query: string;
  type: string;
  priority: 'Low' | 'Medium' | 'High';
  assignee: string;
  email: string;
  createDate: string;
  source: string;
  /** Values for the custom fields the user marked as filterable. */
  custom: Record<string, string>;
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

const JIRA_ASSIGNEES = ['Aarav Sharma', 'Priya Patel', 'Rohit Mehta', 'Sneha Iyer', 'Vikram Nair', 'Ananya Reddy', 'Karan Malhotra', 'Divya Joshi'];
const JIRA_SUBJECTS = [
  ['Login fails with SSO enabled', 'Users on the enterprise plan cannot complete SSO login after the latest release.'],
  ['Invoice PDF missing line items', 'Generated invoices omit discount line items for annual contracts.'],
  ['Request: add bulk export', 'Service request to enable bulk CSV export for admin users.'],
  ['Webhook retries not firing', 'Failed webhook deliveries are not retried according to the documented policy.'],
  ['Slow dashboard load for large orgs', 'Dashboard takes over 12s to load for orgs with more than 50k records.'],
  ['Password reset email delayed', 'Reset emails arrive 20+ minutes late for customers in the EU region.'],
  ['Add SAML group mapping', 'Customer requests group-to-role mapping during SAML provisioning.'],
  ['Duplicate tickets created', 'Inbound email creates duplicate issues when the subject line is edited.'],
];

const CUSTOMER_DOMAINS = [
  'northwind.com', 'globex.io', 'initech.co', 'umbrella-health.com',
  'sterling-retail.com', 'vertexlabs.io', 'blueharbor.org', 'meridian-bank.com',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let runCounter = 0;

export function IntegrationProvider({
  children,
  onImport,
}: {
  children: ReactNode;
  onImport?: (rows: ImportedRow[]) => void;
}) {
  const [connections, setConnectionsState] = useState<Partial<Record<ProviderId, Connection>>>({});
  // Mirror of `connections` so async sync callbacks can read the latest value
  // without keeping every connection in their dependency list.
  const connectionsRef = useRef(connections);
  const setConnections = useCallback(
    (updater: (prev: Partial<Record<ProviderId, Connection>>) => Partial<Record<ProviderId, Connection>>) => {
      connectionsRef.current = updater(connectionsRef.current);
      setConnectionsState(connectionsRef.current);
    },
    [],
  );
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [notifyList, setNotifyList] = useState<ProviderId[]>([]);
  const [firstSyncDone, setFirstSyncDone] = useState<ProviderId | null>(null);
  const [migrating, setMigrating] = useState<ProviderId | null>(null);

  const startWizard = useCallback((providerId: ProviderId, authMethod?: AuthMethod) => {
    const existing = connectionsRef.current[providerId];
    if (!existing) {
      setDraft({ ...emptyDraft(providerId), ...(authMethod ? { authMethod } : {}) });
      return;
    }
    // Reconfiguring: seed the wizard from the saved configuration.
    setDraft({
      ...emptyDraft(providerId),
      authMethod: authMethod ?? existing.config.authMethod,
      connected: true,
      siteUrl: existing.config.siteUrl,
      email: existing.config.account,
      projectIds: existing.config.projects.slice(0, 1).map((p) => p.id),
      issueTypes: existing.config.issueTypes,
      mappings: existing.config.mappings.map((m) => ({ ...m })),
      // Reconfiguring starts from a real selection, so never re-seed over it.
      fieldsSeeded: true,
      emailMapping: { ...existing.config.emailMapping },
    });
  }, []);

  const updateDraft = useCallback((patch: Partial<WizardDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d));
  }, []);

  const cancelWizard = useCallback(() => setDraft(null), []);

  const toggleNotify = useCallback((providerId: ProviderId) => {
    setNotifyList((list) =>
      list.includes(providerId) ? list.filter((p) => p !== providerId) : [...list, providerId],
    );
  }, []);

  const acknowledgeFirstSync = useCallback(() => setFirstSyncDone(null), []);

  const generateRows = useCallback((config: IntegrationConfig, count: number): ImportedRow[] => {
    const providerName = PROVIDERS.find((p) => p.id === config.providerId)?.name ?? 'Jira';
    const customFields = config.mappings.filter((m) => m.filterable && m.target.trim());
    const rows: ImportedRow[] = [];
    for (let i = 0; i < count; i++) {
      const project = config.projects[i % Math.max(config.projects.length, 1)];
      const [subject, body] = JIRA_SUBJECTS[i % JIRA_SUBJECTS.length];
      const d = new Date();
      d.setDate(d.getDate() - (i % 9));
      const custom: Record<string, string> = {};
      customFields.forEach((m, fi) => {
        custom[m.target] = customFieldValue(m.target, i + fi);
      });
      rows.push({
        externalId: `${project?.key ?? 'JIRA'}-${1024 + i}`,
        project: project?.name ?? 'IT Support',
        source: providerName,
        custom,
        subject,
        query: body,
        type: config.issueTypes[i % config.issueTypes.length] ?? 'Task',
        priority: (['High', 'Medium', 'Low'] as const)[i % 3],
        assignee: JIRA_ASSIGNEES[i % JIRA_ASSIGNEES.length],
        // Requesters are customers, so their domain is external to the site.
        email: `${subject.split(' ')[0].toLowerCase()}.${1024 + i}@${CUSTOMER_DOMAINS[i % CUSTOMER_DOMAINS.length]}`,
        // Match the dashboard's existing "02-Mar-2026" date format.
        createDate: `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`,
      });
    }
    return rows;
  }, []);

  /**
   * `instant` is used after the migration takeover: the animation has already
   * told that story at length, so the run completes in a couple of frames
   * instead of replaying a progress bar the user just watched.
   */
  const runSyncForConfig = useCallback((providerId: ProviderId, retryFailed: boolean, instant = false) => {
    // Ignore overlapping runs so a double click cannot schedule two completions.
    const existing = connectionsRef.current[providerId];
    if (!existing || existing.syncing) return;

    const runId = `run-${++runCounter}-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const startedMs = Date.now();
    const imported = retryFailed ? 3 : SYNC_BATCH_SIZE;
    const failed = retryFailed ? 0 : 2;

    setConnections((prev) => {
      const conn = prev[providerId];
      if (!conn || conn.syncing) return prev;
      const running: SyncRun = {
        id: runId, startedAt, status: 'running', imported: 0, failed: 0, durationMs: 0,
        logs: [
          { level: 'info', time: startedAt, message: retryFailed ? 'Retrying previously failed records…' : 'Sync started' },
          { level: 'info', time: startedAt, message: `Opening secure channel to ${conn.config.siteUrl}` },
        ],
      };
      return {
        ...prev,
        [providerId]: {
          ...conn,
          syncing: true, phase: 'connecting', progress: 0, processed: 0, target: imported,
          runs: [running, ...conn.runs],
        },
      };
    });

    // Phase thresholds, in percent. The ticker walks progress up and swaps the
    // phase label as it crosses each boundary, which is what the UI animates on.
    const PHASE_AT: { at: number; phase: SyncPhase; log: (c: Connection) => string }[] = [
      { at: 18, phase: 'authenticating', log: (c) => `Authenticated as ${c.config.account}` },
      { at: 36, phase: 'fetching', log: (c) => `Scanning projects: ${c.config.projects.map((p) => p.key).join(', ')}` },
      { at: 60, phase: 'mapping', log: (c) => `Applying ${c.config.mappings.length} field mappings` },
      { at: 78, phase: 'importing', log: () => 'Writing records into Query Results' },
    ];
    let nextPhase = 0;

    const timer = window.setInterval(() => {
      let finished = false;
      let importedRows: ImportedRow[] = [];

      setConnections((prev) => {
        const conn = prev[providerId];
        if (!conn || !conn.syncing) {
          window.clearInterval(timer);
          return prev;
        }

        const progress = Math.min(100, conn.progress + (instant ? 50 : 4));
        const processed = Math.round((progress / 100) * imported);
        let runs = conn.runs;

        while (nextPhase < PHASE_AT.length && progress >= PHASE_AT[nextPhase].at) {
          const { log } = PHASE_AT[nextPhase];
          const msg = log(conn);
          runs = runs.map((r) =>
            r.id === runId
              ? { ...r, logs: [...r.logs, { level: 'info' as const, time: new Date().toISOString(), message: msg }] }
              : r,
          );
          nextPhase++;
        }
        const phase: SyncPhase =
          nextPhase === 0 ? 'connecting' : PHASE_AT[Math.min(nextPhase, PHASE_AT.length) - 1].phase;

        if (progress < 100) {
          return { ...prev, [providerId]: { ...conn, progress, processed, phase, runs } };
        }

        // Final tick — close out the run.
        window.clearInterval(timer);
        finished = true;
        const finishedAt = new Date().toISOString();
        const durationMs = Date.now() - startedMs;
        runs = runs.map((r) =>
          r.id === runId
            ? {
                ...r,
                status: 'completed' as SyncStatus,
                imported,
                failed,
                durationMs,
                logs: [
                  ...r.logs,
                  { level: 'info' as const, time: finishedAt, message: `Imported ${imported} records` },
                  ...(failed
                    ? [{
                        level: 'error' as const,
                        time: finishedAt,
                        message: `${failed} records failed: "${conn.config.emailMapping.sourceField}" was empty, so no email could be imported`,
                      }]
                    : []),
                  { level: 'info' as const, time: finishedAt, message: 'Sync completed' },
                ],
              }
            : r,
        );
        importedRows = generateRows(conn.config, imported);
        // The very first completed run earns the celebratory landing state.
        if (conn.runs.filter((r) => r.status === 'completed').length === 0) {
          window.setTimeout(() => setFirstSyncDone(providerId), 0);
        }
        return {
          ...prev,
          [providerId]: {
            ...conn,
            syncing: false, phase: 'done', progress: 100, processed: imported,
            runs, totalImported: conn.totalImported + imported,
          },
        };
      });

      if (finished && importedRows.length) onImport?.(importedRows);
    }, instant ? 16 : 120);
  }, [generateRows, onImport, setConnections]);

  const completeWizard = useCallback(() => {
    const d = draft;
    if (!d) return;
    /** First-time setups get the full-screen migration; reconfigures just re-sync. */
    const firstTime = !connectionsRef.current[d.providerId];
    const config: IntegrationConfig = {
      providerId: d.providerId,
      siteUrl: d.siteUrl,
      account: d.email,
      authMethod: d.authMethod,
      projects: MOCK_PROJECTS.filter((p) => d.projectIds.includes(p.id)),
      issueTypes: d.issueTypes,
      mappings: d.mappings,
      emailMapping: d.emailMapping,
    };
    setConnections((prev) => ({
      ...prev,
      [d.providerId]: prev[d.providerId]
        ? { ...prev[d.providerId]!, config }
        : {
            config, connectedAt: new Date().toISOString(), runs: [], totalImported: 0,
            syncing: false, phase: 'connecting', progress: 0, processed: 0, target: 0,
          },
    }));
    setDraft(null);
    if (firstTime) setMigrating(d.providerId);
    else window.setTimeout(() => runSyncForConfig(d.providerId, false), 60);
  }, [draft, runSyncForConfig, setConnections]);

  /** The takeover ran its course — write the records and let the page through. */
  const finishMigration = useCallback(() => {
    const providerId = migrating;
    if (!providerId) return;
    setMigrating(null);
    runSyncForConfig(providerId, false, true);
  }, [migrating, runSyncForConfig]);

  const removeIntegration = useCallback((providerId: ProviderId) => {
    setConnections((prev) => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });
  }, [setConnections]);

  const updateConfig = useCallback((providerId: ProviderId, patch: Partial<IntegrationConfig>) => {
    setConnections((prev) => {
      const conn = prev[providerId];
      if (!conn) return prev;
      return { ...prev, [providerId]: { ...conn, config: { ...conn.config, ...patch } } };
    });
  }, [setConnections]);

  const filterFields = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; source: string; provider: string }[] = [];
    Object.values(connections).forEach((conn) => {
      if (!conn) return;
      const providerName = PROVIDERS.find((p) => p.id === conn.config.providerId)?.name ?? '';
      conn.config.mappings
        .filter((m) => m.filterable && m.target.trim())
        .forEach((m) => {
          if (seen.has(m.target)) return;
          seen.add(m.target);
          out.push({ label: m.target, source: m.source, provider: providerName });
        });
    });
    return out;
  }, [connections]);

  return (
    <IntegrationContext.Provider
      value={{
        connections, draft, filterFields,
        startWizard, updateDraft, cancelWizard, completeWizard,
        notifyList, toggleNotify, firstSyncDone, acknowledgeFirstSync,
        migrating, finishMigration,
        removeIntegration, runSync: (id, retry = false) => runSyncForConfig(id, retry), updateConfig,
      }}
    >
      {children}
    </IntegrationContext.Provider>
  );
}

const NOOP_INTEGRATIONS: IntegrationContextType = {
  connections: {},
  draft: null,
  filterFields: [],
  notifyList: [],
  firstSyncDone: null,
  migrating: null,
  finishMigration: () => {},
  startWizard: () => {},
  updateDraft: () => {},
  cancelWizard: () => {},
  toggleNotify: () => {},
  acknowledgeFirstSync: () => {},
  completeWizard: () => {},
  removeIntegration: () => {},
  runSync: () => {},
  updateConfig: () => {},
};

/**
 * Reads integration state. Falls back to an inert value when no provider is
 * mounted so a hot-reloaded or isolated component still renders.
 */
export function useIntegrations(): IntegrationContextType {
  return useContext(IntegrationContext) ?? NOOP_INTEGRATIONS;
}
