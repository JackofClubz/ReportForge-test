import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types/supabase';

// Global cache for user profile
let profileCache: {
  userId: string | null;
  profile: UserProfile | null;
} = {
  userId: null,
  profile: null
};

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(
    user?.id && profileCache.userId === user.id ? profileCache.profile : null
  );
  const [loading, setLoading] = useState(!profile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // Return cached data if available
      if (user?.id && profileCache.userId === user.id && profileCache.profile) {
        setProfile(profileCache.profile);
        setLoading(false);
        return;
      }

      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Update cache and state
        profileCache = {
          userId: user.id,
          profile: data
        };
        setProfile(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
        setProfile(null);
        profileCache = { userId: null, profile: null };
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]); // Only re-run when user ID changes

  return { profile, loading, error };
}; 