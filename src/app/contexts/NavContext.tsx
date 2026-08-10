import { createContext, useContext, useState, ReactNode } from 'react';

export type NavPage = 'Reports' | 'Integrations' | 'User Management';

interface NavContextType {
  page: NavPage;
  setPage: (p: NavPage) => void;
  /** Provider id whose detail page is open, or null for the integrations list. */
  detailId: string | null;
  openDetail: (id: string) => void;
  closeDetail: () => void;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

export function NavProvider({ children }: { children: ReactNode }) {
  const [page, setPageState] = useState<NavPage>('Reports');
  const [detailId, setDetailId] = useState<string | null>(null);

  const setPage = (p: NavPage) => {
    setPageState(p);
    setDetailId(null);
  };

  return (
    <NavContext.Provider
      value={{ page, setPage, detailId, openDetail: setDetailId, closeDetail: () => setDetailId(null) }}
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

  if (ctx) return ctx;

  return {
    page,
    setPage: (p) => { setLocalPage(p); setLocalDetailId(null); },
    detailId,
    openDetail: setLocalDetailId,
    closeDetail: () => setLocalDetailId(null),
  };
}
