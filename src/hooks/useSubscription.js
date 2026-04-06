import { useState, useEffect, useCallback } from 'react';
import { apiFetchAuth } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription({ plan: 'free', status: 'none' });
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetchAuth('/payments/status');
      setSubscription(data.subscription);
    } catch {
      setSubscription({ plan: 'free', status: 'none' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isPro = subscription?.status === 'active' && subscription?.plan !== 'free';

  return { subscription, loading, isPro, refresh };
}
