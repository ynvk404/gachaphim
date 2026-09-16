import { useEffect, useState } from 'react';
import {
  SNAPSHOT_SCHEMA_VERSION,
  validateSnapshot,
  type MovieSnapshot,
  type RefreshStatus,
} from '@/lib/movies';

const root = '/movie-cache';
const moviesPerPage = 12;
const remoteList = (page: number, query: string, genre: string, kind: string) => {
  const typeQuery = kind ? `&type=${kind}` : '';
  if (query) {
    return `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(query)}&page=${page}${typeQuery}`;
  }
  if (genre) {
    return `https://phim.nguonc.com/api/films/the-loai/${genre}?page=${page}${typeQuery}`;
  }
  return `https://phim.nguonc.com/api/films/quoc-gia/han-quoc?page=${page}${typeQuery}`;
};

// Giả lập trạng thái 'idle' (đứng im) vì ta không cần crawl ngầm nữa
const idle: RefreshStatus = {
  schemaVersion: SNAPSHOT_SCHEMA_VERSION,
  state: 'idle',
  updatedAt: new Date().toISOString(),
  message: 'Kho phim đã sẵn sàng',
};

export function useMovieSnapshot(page: number, query = '', genre = '', kind = '') {
  // Đổi type từ ActressSnapshot sang MovieSnapshot
  const [snapshot, setSnapshot] = useState<MovieSnapshot | null>(null);
  const [status, setStatus] = useState<RefreshStatus>(idle);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;

    const loadData = async () => {
      try {
        const localResponse =
          !query && !genre
            ? await fetch(
              `${root}/snapshot.json?page=${page}&t=${Date.now()}`,
              { cache: 'no-store' },
            )
            : null;
        let rawData: unknown;

        if (localResponse?.ok) {
          rawData = await localResponse.json();
        } else {
          const firstApiPage = Math.floor(((page - 1) * moviesPerPage) / 10) + 1;
          const firstResponse = await fetch(
            remoteList(firstApiPage, query, genre, kind),
            { cache: 'no-store' },
          );
          if (!firstResponse.ok) throw new Error('Không tìm thấy dữ liệu phim');
          const firstData = await firstResponse.json();
          const totalItems =
            typeof firstData?.paginate?.total_items === 'number'
              ? firstData.paginate.total_items
              : Array.isArray(firstData?.items)
                ? firstData.items.length
                : 0;
          const pageOffset = (page - 1) * moviesPerPage;
          const items = Array.isArray(firstData?.items)
            ? [...firstData.items]
            : [];
          let apiPage = firstApiPage + 1;

          while (items.length < moviesPerPage && items.length + pageOffset < totalItems) {
            const nextResponse = await fetch(remoteList(apiPage, query, genre, kind), {
              cache: 'no-store',
            });
            if (!nextResponse.ok) break;
            const nextData = await nextResponse.json();
            if (!Array.isArray(nextData?.items) || !nextData.items.length) break;
            items.push(...nextData.items);
            apiPage += 1;
          }

          rawData = {
            schemaVersion: SNAPSHOT_SCHEMA_VERSION,
            snapshotId: `nguonc-movies-page-${page}-${Date.now()}`,
            createdAt: new Date().toISOString(),
            currentPage: page,
            totalPages: Math.max(1, Math.ceil(totalItems / moviesPerPage)),
            items: items.slice(pageOffset % 10, pageOffset % 10 + moviesPerPage),
          };
        }

        const validSnapshot = validateSnapshot(rawData);

        if (live && validSnapshot) {
          setSnapshot(validSnapshot);
          setError('');
        } else if (live) {
          setError('Cấu trúc dữ liệu phim không hợp lệ');
        }
      } catch (err) {
        if (live) setError('initial-cache-unavailable');
      }
    };

    loadData();

    return () => {
      live = false;
    };
  }, [page, query, genre, kind]);

  return { snapshot, status, error };
}