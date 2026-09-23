import { useEffect, useState } from 'react';
import { sharedApi } from './services/sharedApi';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(() => (localStorage.getItem('token') ? 'loading' : 'unauthenticated'));
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setStatus('unauthenticated');
      return;
    }
    let active = true;
    sharedApi.getAuthMe().then(() => { if (active) setStatus('authenticated'); }).catch(() => { if (active) { localStorage.removeItem('token'); setStatus('unauthenticated'); } });
    return () => { active = false; };
  }, []);
  return { status };
}
