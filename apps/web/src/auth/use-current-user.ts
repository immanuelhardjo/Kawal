import type { MeResponse } from '@kawal/contracts';
import { useEffect, useState } from 'react';
import { ApiError, api } from '../api/client.js';

export type UserState =
  | { kind: 'loading' }
  | { kind: 'signed_in'; user: MeResponse }
  | { kind: 'signed_out' };

/**
 * Spec: user-management / "All app routes require a valid session".
 * The web shell wraps every protected screen with this hook; a 401 from
 * `/me` flips the state to signed_out and the auth guard redirects.
 */
export function useCurrentUser(): UserState {
  const [state, setState] = useState<UserState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((user) => {
        if (!cancelled) setState({ kind: 'signed_in', user });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setState({ kind: 'signed_out' });
        } else {
          setState({ kind: 'signed_out' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
