import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { SiteData } from '../types/site';

export function useSite(id: string) {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSite() {
      setLoading(true);
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching site:', error);
        setError(error.message);
        setSite(null);
      } else {
        setSite(data);
        setError(null);
      }
      setLoading(false);
    }

    if (id) {
      fetchSite();
    }
  }, [id]);

  return { site, loading, error };
} 