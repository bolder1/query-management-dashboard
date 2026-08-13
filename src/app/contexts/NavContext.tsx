import { createContext, useContext, useState, ReactNode } from 'react';

export type NavPage = 'Reports' | 'Integrations' | 'User Management';

/**
 * The sections of an integration's own page. They live in nav state rather than
 * inside the page because the breadcrumb trail — and the setup editor, which
 * floats above the page — both need to move between them.
 */
export type DetailTab = 'overview' | 'setup' | 'configuration';

interface NavContextType {
  page: NavPage;
  setPage: (p: NavPage) => void;
  /** Provider id whose detail page is open, or null for the integrations list. */
  detailId: string | null;
  /** Which section of that page is showing; null means "whichever fits". */
  detailTab: DetailTab | null;
  /**
   * Opens an integration, optionally on a named section. It sets the page too:
   * an integration only exists under Integrations, and routing through
   * `setPage` first used to close the detail and throw away the open section.
   */
  openDetail: (id: string, tab?: DetailTab) => void;
  setDetailTab: (t: DetailTab) => void;
  closeDetail: () => void;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

export function NavProvider({ children }: { children: ReactNode }) {
  const [page, setPageState] = useState<NavPage>('Reports');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab | null>(null);

  const setPage = (p: NavPage) => {
    setPageState(p);
    setDetailId(null);
    setDetailTab(null);
  };

  const openDetail = (id: string, tab?: DetailTab) => {
    setPageState('Integrations');
    // Reopening the same integration keeps whatever section was showing, so
    // saving an edit returns you to the tab you opened it from.
    setDetailId((prev) => (prev === id ? prev : id));
    if (tab || detailId !== id) setDetailTab(tab ?? null);
  };

  return (
    <NavContext.Provider
      value={{
        page,
        setPage,
        detailId,
        detailTab,
        openDetail,
        setDetailTab,
        closeDetail: () => { setDetailId(null); setDetailTab(null); },
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

/**
 * Reads navigation state. If no provider is mounted — which happens when a
 * component is hot-reloaded into an older tree, or previewed in isolation —
 * the hook falls back to local state instead of throwing and blanking the app.
 */
export function useNav(): NavContextType {
  const ctx = useContext(NavContext);
  const [page, setLocalPage] = useState<NavPage>('Reports');
  const [detailId, setLocalDetailId] = useState<string | null>(null);
  const [detailTab, setLocalDetailTab] = useState<DetailTab | null>(null);

  if (ctx) return ctx;

  return {
    page,
    setPage: (p) => { setLocalPage(p); setLocalDetailId(null); setLocalDetailTab(null); },
    detailId,
    detailTab,
    openDetail: (id, tab) => {
      setLocalPage('Integrations');
      setLocalDetailId(id);
      if (tab || detailId !== id) setLocalDetailTab(tab ?? null);
    },
    setDetailTab: setLocalDetailTab,
    closeDetail: () => { setLocalDetailId(null); setLocalDetailTab(null); },
  };
}
