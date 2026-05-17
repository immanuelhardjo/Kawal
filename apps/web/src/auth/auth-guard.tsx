import type { MeResponse } from '@kawal/contracts';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from './use-current-user.js';
import { createContext, useContext } from 'react';

const CurrentUserContext = createContext<MeResponse | null>(null);

export function useAuthenticatedUser(): MeResponse {
  const u = useContext(CurrentUserContext);
  if (!u) throw new Error('useAuthenticatedUser called outside AuthGuard');
  return u;
}

export function AuthGuard(): JSX.Element {
  const state = useCurrentUser();
  const location = useLocation();
  const { t } = useTranslation();

  if (state.kind === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-chalk-muted">
        {t('common.loading')}
      </div>
    );
  }
  if (state.kind === 'signed_out') {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }
  return (
    <CurrentUserContext.Provider value={state.user}>
      <Outlet />
    </CurrentUserContext.Provider>
  );
}
