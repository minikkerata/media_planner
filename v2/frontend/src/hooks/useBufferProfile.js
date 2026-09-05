import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

// In-memory cache across hook consumers
let cachedProfile = null;
let activeRequest = null;

/**
 * Custom hook to fetch and reactively track the connected Buffer social media account.
 * Automatically updates when 'settings-changed' event is dispatched.
 */
export function useBufferProfile() {
  const [profile, setProfile] = useState(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async (force = false) => {
    if (!force && cachedProfile) {
      setProfile(cachedProfile);
      setLoading(false);
      return cachedProfile;
    }

    if (activeRequest && !force) {
      return activeRequest;
    }

    setLoading(true);
    setError(null);

    activeRequest = api.getBufferProfile()
      .then((data) => {
        activeRequest = null;
        if (data && data.success) {
          cachedProfile = data;
          setProfile(data);
          setError(null);
          return data;
        } else {
          cachedProfile = null;
          setProfile(null);
          setError(data?.error || 'Buffer hesap bilgilerine ulaşılamıyor.');
          return null;
        }
      })
      .catch((err) => {
        activeRequest = null;
        setError(err.message || 'Buffer profili alınamadı');
        setProfile(null);
        return null;
      })
      .finally(() => {
        setLoading(false);
      });

    return activeRequest;
  }, []);

  useEffect(() => {
    fetchProfile();

    const handleSettingsChanged = () => {
      fetchProfile(true);
    };

    window.addEventListener('settings-changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('settings-changed', handleSettingsChanged);
    };
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: () => fetchProfile(true),
    hasProfile: Boolean(profile && (profile.name || profile.displayName || profile.username))
  };
}

export default useBufferProfile;
