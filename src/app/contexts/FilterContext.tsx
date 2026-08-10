import { createContext, useContext, useState, ReactNode } from 'react';

export interface QueryResult {
  createDate: string;
  accountCreateDate?: string;
  firstPaymentDate?: string;
  replyDate?: string;
  subject?: string;
  query: string;
  email: string;
  type: string;
  priority: 'Low' | 'Medium' | 'High';
  group: string;
  thread: string;
  jiraTicket?: string;
  assignee?: string;
  customerStatus?: string;
  leadStatus?: string;
  country?: string;
  customerType: 'new-lead' | 'existing-customer' | 'converted' | 'not-converted';
  replyPending: boolean;
  /** Origin of the record — omitted/"Manual" for natively created queries. */
  source?: string;
  /** External system identifier, e.g. ITS-1024 */
  externalId?: string;
  /** External project the record was imported from. */
  externalProject?: string;
  /** Values for custom fields defined in an integration's field mapping. */
  custom?: Record<string, string>;
}

export interface Filters {
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  supportGroup: string;
  priorities: string[];
  queryTypes: string[];
  customerTypes: string[];
  replyPending: boolean | null;
  /** Origin systems to keep — empty means every source. */
  sources: string[];
  /** Custom integration field → selected value. '' means no restriction. */
  custom: Record<string, string>;
}

interface FilterContextType {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  updateFilter: (key: keyof Filters, value: any) => void;
  resetFilters: () => void;
  togglePriority: (priority: string) => void;
  toggleQueryType: (type: string) => void;
  toggleCustomerType: (type: string) => void;
  toggleReplyPending: () => void;
  toggleSource: (source: string) => void;
  setCustomFilter: (field: string, value: string) => void;
  allData: QueryResult[];
  filteredData: QueryResult[];
  /** Append records imported from an external system. Existing external IDs are replaced. */
  addQueries: (rows: QueryResult[]) => void;
  /** Remove every record that came from a given external source. */
  removeQueriesBySource: (source: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const initialFilters: Filters = {
  searchQuery: '',
  dateFrom: '2026-02-02',
  dateTo: '2026-05-03',
  supportGroup: 'all',
  priorities: [],
  queryTypes: [],
  customerTypes: [],
  replyPending: null,
  sources: [],
  custom: {},
};

// Mock data with more entries
const mockAllData: QueryResult[] = [
  {
    createDate: '02-Mar-2026', accountCreateDate: '15-Jan-2026', firstPaymentDate: '20-Jan-2026', replyDate: '03-Mar-2026',
    subject: 'Meeting Report', query: 'This appears to be a meeting report analysis request',
    email: 'adam.warner@region10.org', type: 'Support', priority: 'Low',
    group: 'Shopify', thread: 'View', jiraTicket: 'JIRA-101', assignee: 'Aarav Sharma',
    customerStatus: 'Active', leadStatus: 'Qualified', country: 'USA',
    customerType: 'new-lead', replyPending: true,
  },
  {
    createDate: '02-Mar-2026', accountCreateDate: '10-Feb-2026', firstPaymentDate: '12-Feb-2026', replyDate: '',
    subject: 'Payment Gateway Setup', query: 'Need help with integration setup for payment gateway',
    email: 'sarah.johnson@techcorp.com', type: 'Setup', priority: 'High',
    group: 'Technical', thread: 'View', jiraTicket: 'JIRA-102', assignee: 'Priya Patel',
    customerStatus: 'Active', leadStatus: 'New', country: 'UK',
    customerType: 'new-lead', replyPending: false,
  },
  {
    createDate: '01-Mar-2026', accountCreateDate: '05-Feb-2026', firstPaymentDate: '', replyDate: '02-Mar-2026',
    subject: 'Enterprise Pricing', query: 'Pricing inquiry for enterprise plan with custom features',
    email: 'mike.davis@enterprise.com', type: 'Pricing', priority: 'Medium',
    group: 'Sales', thread: 'View', jiraTicket: 'JIRA-103', assignee: 'Rohit Mehta',
    customerStatus: 'Prospect', leadStatus: 'Qualified', country: 'Canada',
    customerType: 'new-lead', replyPending: true,
  },
  {
    createDate: '01-Mar-2026', accountCreateDate: '20-Feb-2026', firstPaymentDate: '', replyDate: '',
    subject: 'Platform Demo', query: 'Demo request for next week to showcase platform',
    email: 'emma.wilson@startup.io', type: 'Demo', priority: 'Medium',
    group: 'Sales', thread: 'View', jiraTicket: 'JIRA-104', assignee: 'Sneha Iyer',
    customerStatus: 'Prospect', leadStatus: 'New', country: 'Australia',
    customerType: 'new-lead', replyPending: true,
  },
  {
    createDate: '28-Feb-2026', accountCreateDate: '01-Jan-2025', firstPaymentDate: '05-Jan-2025', replyDate: '01-Mar-2026',
    subject: 'Account Deactivation', query: 'Account deactivation request due to budget constraints',
    email: 'john.smith@oldclient.com', type: 'Deactivation', priority: 'High',
    group: 'Shopify', thread: 'View', jiraTicket: 'JIRA-105', assignee: 'Vikram Nair',
    customerStatus: 'Churned', leadStatus: 'Lost', country: 'USA',
    customerType: 'not-converted', replyPending: false,
  },
  {
    createDate: '27-Feb-2026', accountCreateDate: '15-Jun-2025', firstPaymentDate: '20-Jun-2025', replyDate: '28-Feb-2026',
    subject: 'Export Bug', query: 'Facing issue with data export functionality',
    email: 'lisa.brown@company.com', type: 'Facing Issue', priority: 'High',
    group: 'Technical', thread: 'View', jiraTicket: 'JIRA-106', assignee: 'Ananya Reddy',
    customerStatus: 'Active', leadStatus: 'Converted', country: 'Germany',
    customerType: 'existing-customer', replyPending: true,
  },
  {
    createDate: '26-Feb-2026', accountCreateDate: '10-Aug-2025', firstPaymentDate: '15-Aug-2025', replyDate: '',
    subject: 'Custom Dashboard', query: 'New requirement for custom reporting dashboard',
    email: 'david.lee@innovate.com', type: 'New Requirement', priority: 'Medium',
    group: 'Technical', thread: 'View', jiraTicket: 'JIRA-107', assignee: 'Karan Malhotra',
    customerStatus: 'Active', leadStatus: 'Converted', country: 'Singapore',
    customerType: 'existing-customer', replyPending: false,
  },
  {
    createDate: '25-Feb-2026', accountCreateDate: '01-Mar-2025', firstPaymentDate: '05-Mar-2025', replyDate: '26-Feb-2026',
    subject: 'Admin Access', query: 'Account issues - unable to access admin panel',
    email: 'rachel.green@business.com', type: 'Account Issues', priority: 'High',
    group: 'Support', thread: 'View', jiraTicket: 'JIRA-108', assignee: 'Divya Joshi',
    customerStatus: 'Active', leadStatus: 'Converted', country: 'France',
    customerType: 'existing-customer', replyPending: true,
  },
  {
    createDate: '24-Feb-2026', accountCreateDate: '12-Feb-2026', firstPaymentDate: '', replyDate: '25-Feb-2026',
    subject: 'Annual Subscription', query: 'Pricing details for annual subscription',
    email: 'tom.wilson@corp.com', type: 'Pricing', priority: 'Low',
    group: 'Sales', thread: 'View', jiraTicket: 'JIRA-109', assignee: 'Aarav Sharma',
    customerStatus: 'Prospect', leadStatus: 'Qualified', country: 'USA',
    customerType: 'new-lead', replyPending: true,
  },
  {
    createDate: '23-Feb-2026', accountCreateDate: '01-Nov-2025', firstPaymentDate: '05-Nov-2025', replyDate: '',
    subject: 'API Integration', query: 'Support needed for API integration',
    email: 'kelly.martin@dev.com', type: 'Support', priority: 'Medium',
    group: 'Technical', thread: 'View', jiraTicket: 'JIRA-110', assignee: 'Sneha Iyer',
    customerStatus: 'Active', leadStatus: 'Converted', country: 'India',
    customerType: 'converted', replyPending: false,
  },
];

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [allData, setAllData] = useState<QueryResult[]>(mockAllData);

  const addQueries = (rows: QueryResult[]) => {
    setAllData((prev) => {
      const incoming = new Set(rows.map((r) => r.externalId).filter(Boolean));
      const kept = prev.filter((r) => !r.externalId || !incoming.has(r.externalId));
      return [...rows, ...kept];
    });
    // Widen the active date range so freshly imported records are never silently
    // hidden by a range the user set before the integration ran.
    const newest = rows.reduce<number>((max, r) => {
      const t = new Date(r.createDate).getTime();
      return Number.isNaN(t) ? max : Math.max(max, t);
    }, 0);
    if (newest) {
      setFilters((prev) => {
        const to = new Date(prev.dateTo).getTime();
        if (!Number.isNaN(to) && newest <= to) return prev;
        return { ...prev, dateTo: new Date(newest).toISOString().slice(0, 10) };
      });
    }
  };

  const removeQueriesBySource = (source: string) => {
    setAllData((prev) => prev.filter((r) => r.source !== source));
  };

  const updateFilter = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const togglePriority = (priority: string) => {
    setFilters((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority],
    }));
  };

  const toggleQueryType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      queryTypes: prev.queryTypes.includes(type)
        ? prev.queryTypes.filter((t) => t !== type)
        : [...prev.queryTypes, type],
    }));
  };

  const toggleCustomerType = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      customerTypes: prev.customerTypes.includes(type)
        ? prev.customerTypes.filter((t) => t !== type)
        : [...prev.customerTypes, type],
    }));
  };

  const toggleReplyPending = () => {
    setFilters((prev) => ({
      ...prev,
      replyPending: prev.replyPending === true ? null : true,
    }));
  };

  const toggleSource = (source: string) => {
    setFilters((prev) => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter((s) => s !== source)
        : [...prev.sources, source],
    }));
  };

  const setCustomFilter = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, custom: { ...prev.custom, [field]: value } }));
  };

  // Filter logic
  const filteredData = allData.filter((item) => {
    // Search query filter
    if (filters.searchQuery) {
      const search = filters.searchQuery.toLowerCase();
      const searchableText = `${item.query} ${item.email} ${item.type} ${item.priority} ${item.group} ${item.thread}`.toLowerCase();
      if (!searchableText.includes(search)) return false;
    }

    // Date range filter
    const itemDate = new Date(item.createDate);
    const fromDate = new Date(filters.dateFrom);
    const toDate = new Date(filters.dateTo);
    if (itemDate < fromDate || itemDate > toDate) return false;

    // Support group filter
    if (filters.supportGroup !== 'all' && item.group.toLowerCase() !== filters.supportGroup.toLowerCase()) {
      return false;
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(item.priority.toLowerCase())) return false;
    }

    // Query type filter
    if (filters.queryTypes.length > 0) {
      const normalizedType = item.type.toLowerCase().replace(/\s+/g, '-');
      if (!filters.queryTypes.includes(normalizedType)) return false;
    }

    // Customer type filter
    if (filters.customerTypes.length > 0) {
      if (!filters.customerTypes.includes(item.customerType)) return false;
    }

    // Reply pending filter
    if (filters.replyPending !== null) {
      if (item.replyPending !== filters.replyPending) return false;
    }

    // Source filter — records without a source count as "Manual".
    if (filters.sources.length > 0 && !filters.sources.includes(item.source ?? 'Manual')) {
      return false;
    }

    // Custom integration fields
    for (const [field, value] of Object.entries(filters.custom)) {
      if (value && item.custom?.[field] !== value) return false;
    }

    return true;
  });

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        updateFilter,
        resetFilters,
        togglePriority,
        toggleQueryType,
        toggleCustomerType,
        toggleReplyPending,
        toggleSource,
        setCustomFilter,
        allData,
        filteredData,
        addQueries,
        removeQueriesBySource,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
}
