import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNav, type NavPage } from '../contexts/NavContext';
import { useIntegrations } from '../contexts/IntegrationContext';
import { Button } from './ui/button';
import logoMonogram from '@/imports/logo-monogram.png';

const navItems: NavPage[] = ['Reports', 'Integrations', 'User Management'];

export function DashboardHeader() {
  const { theme, toggleTheme } = useTheme();
  const { page: activeNav, setPage: setActiveNav } = useNav();
  const { connections } = useIntegrations();
  const connectedCount = Object.keys(connections).length;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="px-6 flex items-center justify-between h-12 gap-6">
        <div className="flex items-center gap-2.5 shrink-0">
          <img src={logoMonogram} alt="Logo" className="h-7 w-7 object-contain" />
          <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">
            Query Management Dashboard
          </h1>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveNav(item)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeNav === item
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {item}
              {item === 'Integrations' && connectedCount > 0 && (
                <span style={{backgroundColor:`var(--pill-accent-bg)`,color:`var(--pill-accent-text)`}} className="text-xs  rounded-full px-1.5">
                  {connectedCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full h-8 w-8 shrink-0"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
