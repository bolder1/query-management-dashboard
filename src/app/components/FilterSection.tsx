import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button'; // kept for Reset only
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useFilters } from '../contexts/FilterContext';
import { toast } from 'sonner'; // used by Reset

export function FilterSection() {
  const { filters, updateFilter, resetFilters } = useFilters();

  const handleReset = () => {
    resetFilters();
    toast.info('Filters reset to default');
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              placeholder="Search subject, email, type, priority…"
              className="pl-9 h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />
          </div>

          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="h-8 text-sm w-36 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />

          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="h-8 text-sm w-36 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />

          <Select
            value={filters.supportGroup}
            onValueChange={(value) => updateFilter('supportGroup', value)}
          >
            <SelectTrigger className="h-8 text-sm w-36 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="shopify">Shopify</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleReset} size="sm" variant="outline" className="h-8">Reset</Button>
        </div>
      </div>
    </div>
  );
}
