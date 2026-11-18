import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useApi(path, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled || !path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await api(path);
      setData(result);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}