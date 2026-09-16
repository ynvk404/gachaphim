import { useEffect, useState, useCallback, useRef } from 'react';
import type { Movie } from '@/lib/movies';
import { readCookie, writeCookie } from '@/lib/cookies';
function savedCount() {
  const count = readCookie<number>('spins');
  return Number.isSafeInteger(count) && Number(count) >= 0 ? Number(count) : 0;
}
export function useLocalSpinCount() {
  const [count, setCount] = useState(0),
    current = useRef(0);
  useEffect(() => {
    current.current = savedCount();
    setCount(current.current);
  }, []);
  const recordSpin = useCallback((movie: Movie) => {
    const next = Math.min(
      Number.MAX_SAFE_INTEGER,
      Math.max(current.current, savedCount()) + 1,
    );
    try {
      writeCookie('spins', next);
      writeCookie('last-choice', { id: movie.id, at: Date.now() });
    } catch {
      /* The local choice remains available even when cookies are disabled. */
    }
    current.current = next;
    setCount(next);
  }, []);
  return { count, enabled: true, recordSpin };
}
