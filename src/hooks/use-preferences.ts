import { useEffect, useState } from 'react';
import {
  emptyProfile,
  validateProfile,
  type MovieProfile,
} from '@/lib/movie-preferences';
import { readCookie, writeCookie, clearCookie } from '@/lib/cookies';
function load() {
  try {
    return validateProfile(readCookie('movie-pool'));
  } catch {
    return emptyProfile();
  }
}
export function usePreferences() {
  const [profile, setProfile] = useState<MovieProfile>(emptyProfile),
    [error, setError] = useState('');
  useEffect(() => setProfile(load()), []);
  const save = (next: MovieProfile) => {
    try {
      const checked = validateProfile(next);
      writeCookie('movie-pool', checked);
      setProfile(checked);
      setError('');
      return true;
    } catch (error) {
      setError((error as Error).message);
      return false;
    }
  };
  const reload = () => {
    const next = load();
    setProfile(next);
    setError('');
    return next;
  };
  const remove = () => {
    try {
      clearCookie('movie-pool');
      setProfile(emptyProfile());
      setError('');
      return true;
    } catch (error) {
      setError((error as Error).message);
      return false;
    }
  };
  return { profile, error, setError, save, reload, remove };
}
export type Preferences = ReturnType<typeof usePreferences>;
