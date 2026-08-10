import { Card } from './ui/card';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Clock 
} from 'lucide-react';
import { useFilters } from '../contexts/FilterContext';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}

function StatCard({ title, value, icon, color, onClick, isActive }: StatCardProps) {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-purple-500 dark:ring-purple-400 bg-purple-50 dark:bg-purple-950' : 'bg-white dark:bg-gray-800'
      } border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className={`p-2 rounded-lg w-fit bg-opacity-10 ${color}`}>
            {icon}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-tight">{title}</p>
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
        </div>
    </Card>
  );
}

export function StatisticsCards() {
  const { filteredData, filters, toggleCustomerType, toggleReplyPending } = useFilters();

  // Calculate statistics from filtered data
  const total = filteredData.length;
  const newLeadCount = filteredData.filter(q => q.customerType === 'new-lead').length;
  const existingCustomerCount = filteredData.filter(q => q.customerType === 'existing-customer').length;
  const convertedCount = filteredData.filter(q => q.customerType === 'converted').length;
  const notConvertedCount = filteredData.filter(q => q.customerType === 'not-converted').length;
  const replyPendingCount = filteredData.filter(q => q.replyPending).length;

  const stats = [
    {
      title: 'TOTAL',
      value: total,
      icon: <Users className="h-6 w-6" />,
      color: 'text-gray-900 dark:text-white',
      onClick: undefined,
      isActive: false,
    },
    {
      title: 'NEW LEAD COUNT',
      value: newLeadCount,
      icon: <UserPlus className="h-6 w-6" />,
      color: 'text-purple-600 dark:text-purple-400',
      onClick: () => toggleCustomerType('new-lead'),
      isActive: filters.customerTypes.includes('new-lead'),
    },
    {
      title: 'EXISTING CUSTOMER COUNT',
      value: existingCustomerCount,
      icon: <UserCheck className="h-6 w-6" />,
      color: 'text-blue-600 dark:text-blue-400',
      onClick: () => toggleCustomerType('existing-customer'),
      isActive: filters.customerTypes.includes('existing-customer'),
    },
    {
      title: 'CONVERTED COUNT',
      value: convertedCount,
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'text-green-600 dark:text-green-400',
      onClick: () => toggleCustomerType('converted'),
      isActive: filters.customerTypes.includes('converted'),
    },
    {
      title: 'NOT CONVERTED COUNT',
      value: notConvertedCount,
      icon: <XCircle className="h-6 w-6" />,
      color: 'text-orange-600 dark:text-orange-400',
      onClick: () => toggleCustomerType('not-converted'),
      isActive: filters.customerTypes.includes('not-converted'),
    },
    {
      title: 'REPLY PENDING',
      value: replyPendingCount,
      icon: <Clock className="h-6 w-6" />,
      color: 'text-blue-600 dark:text-blue-400',
      onClick: toggleReplyPending,
      isActive: filters.replyPending === true,
    },
  ];

  return (
    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-950">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            onClick={stat.onClick}
            isActive={stat.isActive}
          />
        ))}
      </div>
    </div>
  );
}
