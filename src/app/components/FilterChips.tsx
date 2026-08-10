import { Badge } from './ui/badge';
import { useFilters } from '../contexts/FilterContext';

export function FilterChips() {
  const { filters, toggleQueryType, allData } = useFilters();

  const pricingCount = allData.filter(q => q.type.toLowerCase() === 'pricing').length;
  const supportCount = allData.filter(q => q.type.toLowerCase() === 'support').length;
  const demoCount = allData.filter(q => q.type.toLowerCase() === 'demo').length;
  const newReqCount = allData.filter(q => q.type.toLowerCase().replace(/\s+/g, '-') === 'new-requirement').length;
  const facingIssueCount = allData.filter(q => q.type.toLowerCase().replace(/\s+/g, '-') === 'facing-issue').length;
  const accountIssuesCount = allData.filter(q => q.type.toLowerCase().replace(/\s+/g, '-') === 'account-issues').length;
  const deactivationCount = allData.filter(q => q.type.toLowerCase() === 'deactivation').length;
  const setupCount = allData.filter(q => q.type.toLowerCase() === 'setup').length;

  const queryTypes = [
    { label: `Pricing: ${pricingCount}`, value: 'pricing' },
    { label: `Support: ${supportCount}`, value: 'support' },
    { label: `Demo: ${demoCount}`, value: 'demo' },
    { label: `New Requirement: ${newReqCount}`, value: 'new-requirement' },
    { label: `Facing Issue: ${facingIssueCount}`, value: 'facing-issue' },
    { label: `Account Issues: ${accountIssuesCount}`, value: 'account-issues' },
    { label: `Deactivation: ${deactivationCount}`, value: 'deactivation' },
    { label: `Setup: ${setupCount}`, value: 'setup' },
  ];

  return (
    <div className="px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mr-1">Query Type</span>
        {queryTypes.map((type) => (
          <Badge
            key={type.value}
            variant="outline"
            className={`cursor-pointer px-3 py-1 text-xs font-medium transition-all ${
              filters.queryTypes.includes(type.value)
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            onClick={() => toggleQueryType(type.value)}
          >
            {type.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
