/**
 * Representative values for Jira fields, used to show real-looking data next to
 * every mapping decision rather than asking people to imagine the result.
 */
const SAMPLES: Record<string, [string, string, string]> = {
  Summary: ['Login fails with SSO enabled', 'Invoice PDF missing line items', 'Request: add bulk export'],
  Description: ['Enterprise users cannot complete SSO…', 'Discount lines omitted on annual…', 'Admins need CSV export…'],
  Status: ['In Progress', 'Open', 'Waiting for support'],
  Assignee: ['Aarav Sharma', 'Priya Patel', 'Rohit Mehta'],
  Reporter: ['Dana Kim', 'Omar Sayed', 'Lena Fischer'],
  'Reporter Email': ['dana.kim@northwind.com', 'omar.s@globex.io', 'lena.f@initech.co'],
  Priority: ['High', 'Medium', 'Low'],
  Project: ['Customer Success', 'Customer Success', 'Customer Success'],
  'Issue Type': ['Bug', 'Task', 'Service Request'],
  Created: ['04-Aug-2026', '02-Aug-2026', '01-Aug-2026'],
  'Due Date': ['12-Aug-2026', '—', '19-Aug-2026'],
  Labels: ['sso, auth', 'billing', 'export'],
  Components: ['Identity', 'Invoicing', 'Platform'],
  Resolution: ['Unresolved', 'Unresolved', 'Done'],
  'Epic Link': ['ITS-900', 'BILL-120', 'CS-441'],
  'Story Points': ['5', '3', '8'],
  Sprint: ['Sprint 42', 'Sprint 43', 'Sprint 43'],
  'Fix Version': ['2026.8.1', '2026.8.2', '2026.8.2'],
  Environment: ['Production', 'Staging', 'Production'],
  'Customer Tier': ['Enterprise', 'Growth', 'Starter'],
  'Request Type': ['Report a bug', 'Billing question', 'Access request'],
  'SLA Breach': ['No', 'No', 'Yes'],
  'Satisfaction Rating': ['4 / 5', '5 / 5', '3 / 5'],
  'Release Notes': ['Included', 'Not included', 'Included'],
  'Code Branch': ['fix/sso-login', 'fix/invoice-pdf', 'feat/bulk-export'],
  Approver: ['Meera Iyer', 'Meera Iyer', 'Sanjay Rao'],
  'Cost Centre': ['CC-1042', 'CC-2210', 'CC-1042'],
  // Every field the email step can offer, so whichever one is picked reads as
  // a real address everywhere it is echoed back.
  'Portal User Email': ['dana.kim@northwind.com', 'priya@blueharbor.org', 'omar.s@globex.io'],
  'Assignee Email': ['aarav.sharma@acme-corp.com', 'priya.patel@acme-corp.com', 'rohit.mehta@acme-corp.com'],
  'Request Participants': ['lena.f@initech.co', 'ops@umbrella-health.com', 'team@initech.co'],
  'Contact Email': ['omar.s@globex.io', 'contact@meridian-bank.com', 'dana.kim@northwind.com'],
  'Support Alias': ['support@vertexlabs.io', 'helpdesk@initech.co', 'support@globex.io'],
  'On-behalf-of Email': ['lena.f@initech.co', 'dana.kim@northwind.com', 'omar.s@globex.io'],
  'Notification Email': ['alerts@sterling-retail.com', 'ops@umbrella-health.com', 'alerts@globex.io'],
  'Organization Email': ['it@northwind.com', 'ops@globex.io', 'it@initech.co'],
  'Account Owner Email': ['owner@meridian-bank.com', 'am@blueharbor.org', 'owner@northwind.com'],
  'CC Recipients': ['team@initech.co', 'billing@sterling-retail.com', 'ops@globex.io'],
  'Customer Email (custom)': ['billing@sterling-retail.com', '—', 'billing@meridian-bank.com'],
  Watchers: ['qa@vertexlabs.io', '—', 'qa@globex.io'],
  'Approver Email': ['meera.iyer@acme-corp.com', '—', 'sanjay.rao@acme-corp.com'],
  'Billing Contact': ['billing@sterling-retail.com', '—', 'billing@northwind.com'],
  'Description (parsed)': ['support@vertexlabs.io', '—', 'support@initech.co'],
  'Escalation Contact': ['escalations@umbrella-health.com', '—', 'escalations@globex.io'],
  'Vendor Contact': ['support@vendor-partners.com', '—', 'support@vendor-partners.com'],
};

/** One sample value for a Jira field. `row` is 0-2. */
export function sampleValue(source: string, row: number) {
  const s = SAMPLES[source];
  if (s) return s[row % 3];
  return source ? `${source} value ${row + 1}` : '—';
}

/** The three sample issues used by the email-routing and review previews. */
export const SAMPLE_ISSUES = [0, 1, 2].map((i) => ({
  key: `CS-${1024 + i}`,
  summary: sampleValue('Summary', i),
  email: sampleValue('Reporter Email', i),
}));
