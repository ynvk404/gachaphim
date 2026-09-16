'use client';

import Link from 'next/link';
import { flushSync } from 'react-dom';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  Box,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Sparkles,
  Volume2,
  VolumeX,
  PlayCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { readCookie, writeCookie } from '@/lib/cookies';
import {
  chooseTiered,
  createSpinProfile,
  spinProgress,
  stopFraction,
} from '@/lib/case-mechanics';

// Đã đổi import từ actresses sang movies
import { type Movie } from '@/lib/movies';
import { copy, type Language } from '@/lib/i18n';
import { useMovieSnapshot } from '@/hooks/use-movie-snapshot';
import { useLocalSpinCount } from '@/hooks/use-local-spin-count';
import { usePreferences } from '@/hooks/use-preferences';
import { filterMovies } from '@/lib/movie-preferences'; // Hàm filter đơn giản ta đã viết
import { PreferencesPanel } from '@/components/preferences-panel';
import { CaseAudio } from '@/lib/case-audio';

const colors = ['#4b69ff', '#8847ff', '#d32ce6', '#eb4b4b', '#e4ae39'];
const reelStep = 254;
const reelInitialOffset = -400;
const movieInventoryCookieKey = 'movie-inventory';
const genreOptions = [
  ['hanh-dong', 'Hành động', 'Action'],
  ['tinh-cam', 'Tình cảm', 'Romance'],
  ['hai-huoc', 'Hài hước', 'Comedy'],
  ['kinh-di', 'Kinh dị', 'Horror'],
  ['hoc-duong', 'Học đường', 'School'],
  ['co-trang', 'Cổ trang', 'Historical'],
  ['tam-ly', 'Tâm lý', 'Drama'],
] as const;

type MovieDetail = Movie & {
  description?: string;
  poster_url?: string;
  original_name?: string;
  time?: string;
  language?: string;
  director?: string;
  casts?: string;
  episodes?: EpisodeGroup[];
};

type Episode = {
  name?: string;
  embed?: string;
  link_m3u8?: string;
};

type EpisodeGroup = {
  server_name?: string;
  items?: Episode[];
};

function plainDescription(value: string | undefined) {
  return value
    ?.replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
}

// Render ảnh dọc cho phim thay vì ảnh vuông/ngang
function MovieImage({ movie, alt }: { movie: Movie; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="movie-image"
      src={movie.thumbUrl}
      alt={alt}
      style={{ objectFit: 'cover', height: '100%', width: '100%' }}
    />
  );
}

const Card = memo(function Card({
  movie,
  language,
  small = false,
  slot,
  onMovieClick,
}: {
  movie: Movie;
  language: Language;
  small?: boolean;
  slot?: number;
  onMovieClick?: (movie: Movie) => void;
}) {
  return (
    <div
      className={`actress-card ${small ? 'small' : ''}`}
      data-slot-id={slot}
      role={onMovieClick ? 'button' : undefined}
      tabIndex={onMovieClick ? 0 : undefined}
      onClick={() => onMovieClick?.(movie)}
      onKeyDown={(event) => {
        if (onMovieClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onMovieClick(movie);
        }
      }}
      aria-label={onMovieClick ? copy[language].movieCardAction : undefined}
      style={
        {
          '--rarity': colors[movie.tier],
          ...(slot === undefined
            ? {}
            : { position: 'absolute', left: slot * reelStep }),
        } as React.CSSProperties
      }
    >
      <span className="tier">{copy[language].tiers[movie.tier]}</span>
      {/* Sửa className CSS nếu cần để bọc ảnh dọc */}
      <div className="card-image-wrapper" style={{ height: small ? '220px' : '300px', overflow: 'hidden' }}>
        <MovieImage movie={movie} alt={movie.name} />
      </div>
      <div className="card-copy" style={{ paddingTop: '10px' }}>
        <strong>{movie.name}</strong>
        <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.8 }}>{movie.year} • {movie.quality}</p>
      </div>
    </div>
  );
});

export default function Home() {
  // Thay hook lấy dữ liệu Phim
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [movieKind, setMovieKind] = useState('');
  const { snapshot, status, error } = useMovieSnapshot(page, searchQuery, genre, movieKind);
  const preferences = usePreferences();
  const { count: localSpins, recordSpin } = useLocalSpinCount();
  const [language, setLanguage] = useState<Language>('vi');
  const [sound, setSound] = useState(true);
  const [spinning, setSpinning] = useState(false);

  // Đổi State từ Actress sang Movie
  const [result, setResult] = useState<Movie | null>(null);
  const [lastChoice, setLastChoice] = useState<Movie | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [personalInventory, setPersonalInventory] = useState<Movie[]>([]);
  const [movieDetail, setMovieDetail] = useState<{
    movie: MovieDetail | null;
    loading: boolean;
  }>({ movie: null, loading: false });
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  // Trạng thái phát video
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState(0);

  const [active, setActive] = useState<Movie[]>([]);
  const [reel, setReel] = useState<{ movie: Movie; id: number }[]>([]);
  const [visibleStart, setVisibleStart] = useState(0);
  const [browseIndex, setBrowseIndex] = useState(0);
  const busy = useRef(false);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const position = useRef(-400);
  const frame = useRef(0);
  const audio = useRef<CaseAudio | null>(null);
  const inventoryHydrated = useRef(false);
  const t = copy[language];

  useEffect(() => {
    const saved = readCookie<Language>('language');
    const next = saved === 'en' ? 'en' : 'vi';
    setLanguage(next);
    document.documentElement.lang = next;
  }, []);

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    document.documentElement.lang = next;
    try {
      writeCookie('language', next);
    } catch { }
  };

  useEffect(() => {
    document.title = language === 'vi' ? 'Tối Nay Xem Gì?' : 'Movie Tonight?';
  }, [language]);

  useEffect(() => {
    const engine = new CaseAudio();
    audio.current = engine;
    engine.preload();
    const handleVisibility = () => {
      if (document.hidden) engine.pause();
      else engine.recover();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      engine.dispose();
      audio.current = null;
    };
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useEffect(() => {
    if (snapshot && !spinning) setActive(snapshot.movies);
  }, [snapshot, spinning]);

  useEffect(() => {
    if (!snapshot || inventoryHydrated.current) return;
    inventoryHydrated.current = true;
    const saved = readCookie<Array<Movie | string>>(movieInventoryCookieKey);
    if (!Array.isArray(saved)) {
      setPersonalInventory([]);
      return;
    }
    const currentMovies = new Map(snapshot.movies.map((movie) => [movie.id, movie]));
    setPersonalInventory(
      saved
        .map((item) =>
          typeof item === 'string' ? currentMovies.get(item) : item,
        )
        .filter((movie): movie is Movie => Boolean(movie)),
    );
  }, [snapshot]);

  const eligible = useMemo(
    () => filterMovies(active).filter((movie) => !movieKind || movie.kind === movieKind),
    [active, movieKind] // Preferences đã tối giản, chỉ filter active list
  );

  useEffect(() => {
    if (!eligible.length) {
      setReel([]);
      setVisibleStart(0);
      position.current = reelInitialOffset;
      if (track.current)
        track.current.style.transform = `translate3d(${position.current}px,0,0)`;
      return;
    }
    const firstSlot = Math.floor(Math.random() * eligible.length);
    setBrowseIndex(firstSlot);
    setReel(
      Array.from({ length: 12 }, (_, index) => {
        const id = firstSlot + index;
        return { id, movie: eligible[id % eligible.length] };
      }),
    );
    setVisibleStart(firstSlot);
    position.current = reelInitialOffset - firstSlot * reelStep;
    if (track.current)
      track.current.style.transform = `translate3d(${position.current}px,0,0)`;
  }, [eligible]);

  useEffect(() => {
    const last = readCookie<{ id?: unknown }>('last-choice');
    if (last?.id && typeof last.id === 'string') {
      const found = active.find((item) => item.id === last.id) ?? null;
      setResult(found);
      setLastChoice(found);
    }
  }, [active]);

  const attachTrack = useCallback((node: HTMLDivElement | null) => {
    track.current = node;
    if (node) node.style.transform = `translate3d(${position.current}px,0,0)`;
  }, []);

  const browseReel = useCallback(
    (direction: -1 | 1) => {
      if (busy.current || !eligible.length) return;
      const nextIndex =
        (browseIndex + direction + eligible.length) % eligible.length;
      setBrowseIndex(nextIndex);
      setReel(
        Array.from({ length: 12 }, (_, index) => ({
          id: index,
          movie: eligible[(nextIndex + index) % eligible.length],
        })),
      );
      setVisibleStart(0);
      position.current = reelInitialOffset;
      if (track.current) {
        track.current.style.transform = `translate3d(${position.current}px,0,0)`;
      }
      audio.current?.play('csgo_ui_crate_item_scroll');
    },
    [browseIndex, eligible],
  );

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setPageInput('1');
    setSearchQuery(searchInput.trim());
  };

  const changeGenre = (value: string) => {
    setGenre(value);
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
    setPageInput('1');
  };

  const changeMovieKind = (value: string) => {
    setMovieKind(value);
    setPage(1);
    setPageInput('1');
  };

  const changeCombinedFilter = (value: string) => {
    if (value === 'single' || value === 'series') {
      setGenre('');
      changeMovieKind(value);
      return;
    }
    setMovieKind('');
    changeGenre(value);
  };

  const goToPage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requested = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(requested) || !snapshot) return;
    const nextPage = Math.min(Math.max(requested, 1), snapshot.totalPages);
    setPage(nextPage);
    setPageInput(String(nextPage));
  };

  // Hàm gọi API NguonC lấy link xem phim khi click nút
  const playEpisode = (items: Episode[], index: number) => {
    const episode = items[index];
    const source = episode?.link_m3u8 || episode?.embed;
    if (!source) return;
    setEpisodes(items);
    setCurrentEpisode(index);
    setPlayingVideo(source);
  };

  const handleWatchMovie = async (slug: string) => {
    try {
      const res = await fetch(`https://phim.nguonc.com/api/film/${slug}`);
      const data = await res.json();
      const rawItems: Episode[] = Array.isArray(data?.movie?.episodes)
        ? data.movie.episodes.flatMap((group: EpisodeGroup) => group.items || [])
        : [];
      const seenEpisodes = new Set<string>();
      const items = rawItems.filter((episode, index) => {
        const key = episode.name?.trim().toLowerCase() ||
          episode.link_m3u8 || episode.embed || `episode-${index}`;
        if (seenEpisodes.has(key)) return false;
        seenEpisodes.add(key);
        return true;
      });
      if (data.status === 'success' && items.length > 0) {
        playEpisode(items, 0);
      } else {
        alert(t.watchUnavailable);
      }
    } catch (err) {
      alert(t.watchError);
    }
  };

  function open() {
    if (busy.current || !eligible.length || !track.current || !viewport.current)
      return;
    audio.current?.unlock();
    busy.current = true;
    const winner = chooseTiered(eligible);
    const step = reelStep,
      tileWidth = 240,
      width = viewport.current.clientWidth;
    const start = position.current;
    const center = Math.floor((width / 2 - start) / step);
    const profile = createSpinProfile(
      Math.random,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    const target = center + profile.tiles;
    const end = width / 2 - tileWidth * stopFraction() - target * step;
    const current = reel.filter(
      ({ id }) => id >= Math.max(0, center - 6) && id <= target + 4,
    );
    let last = current.length
      ? Math.max(...current.map((item) => item.id))
      : center;
    const recent: Movie[] = [];
    while (last < target + 4) {
      last++;
      const options = eligible.filter((item) => !recent.includes(item));
      const movieObj =
        last === target
          ? winner
          : chooseTiered(options.length ? options : eligible);
      current.push({ id: last, movie: movieObj });
      recent.push(movieObj);
      if (recent.length > 8) recent.shift();
    }
    flushSync(() => {
      setReel(current);
      setSpinning(true);
      setResult(null);
    });
    audio.current?.play('csgo_ui_crate_open');
    const began = performance.now();
    let shown = visibleStart;
    let lastCell = Math.floor((start - width / 2) / step);

    const animate = (now: number) => {
      const progress = Math.max(
        0,
        Math.min(1, (now - began) / profile.durationMs),
      );
      const next =
        start + (end - start) * spinProgress(progress, profile.friction);
      position.current = next;
      const first = Math.max(0, Math.floor(-next / step));
      if (first - shown >= 4 || first < shown) {
        shown = Math.max(0, first - 2);
        setVisibleStart(shown);
      }
      if (track.current)
        track.current.style.transform = `translate3d(${next}px,0,0)`;
      const cell = Math.floor((next - width / 2) / step);
      while (cell !== lastCell) {
        lastCell += cell > lastCell ? 1 : -1;
        audio.current?.play('csgo_ui_crate_item_scroll');
      }
      if (progress < 1) {
        frame.current = requestAnimationFrame(animate);
        return;
      }
      recordSpin(winner);
      busy.current = false;
      setSpinning(false);
      setResult(winner);
      setLastChoice(winner);
      setRevealed(true);
      audio.current?.play(
        (
          [
            'item_reveal3_rare',
            'item_reveal4_mythical',
            'item_reveal5_legendary',
            'item_reveal6_ancient',
            'item_reveal6_ancient',
          ] as const
        )[winner.tier],
      );
    };
    frame.current = requestAnimationFrame(animate);
  }

  const addToInventory = useCallback((movie: Movie) => {
    setPersonalInventory((items) => {
      if (items.some((item) => item.id === movie.id)) return items;
      const next = [movie, ...items].slice(0, 12);
      try {
        writeCookie(
          movieInventoryCookieKey,
          next,
        );
      } catch {
        // Cookie storage is optional for the local inventory. The in-memory list still works.
      }
      return next;
    });
  }, []);

  const removeFromInventory = useCallback((movieId: string) => {
    setPersonalInventory((items) => {
      const next = items.filter((item) => item.id !== movieId);
      try {
        writeCookie(
          movieInventoryCookieKey,
          next,
        );
      } catch {
        // Ignore cookie write failures.
      }
      return next;
    });
  }, []);

  const openMovieDescription = useCallback(async (movie: Movie) => {
    setDescriptionOpen(true);
    setMovieDetail({ movie: null, loading: true });
    try {
      const response = await fetch(
        `https://phim.nguonc.com/api/film/${movie.slug}`,
      );
      const payload = await response.json();
      const detail = payload?.movie as MovieDetail | undefined;
      setMovieDetail({
        movie: detail
          ? {
            ...movie,
            ...detail,
            description: detail.description || 'Chưa có mô tả chi tiết.',
            original_name: detail.original_name || movie.originalName,
            poster_url: detail.poster_url || movie.thumbUrl,
          }
          : movie,
        loading: false,
      });
    } catch {
      setMovieDetail({
        movie,
        loading: false,
      });
    }
  }, []);

  const isInCollection = movieDetail.movie
    ? personalInventory.some((item) => item.id === movieDetail.movie?.id)
    : false;

  const inventory = useMemo(
    () =>
      [...eligible]
        .sort(
          (a, b) => b.tier - a.tier || a.name.localeCompare(b.name),
        )
        .map((movie) => (
          <Card
            key={movie.id}
            movie={movie}
            language={language}
            small
            onMovieClick={openMovieDescription}
          />
        )),
    [eligible, language, openMovieDescription],
  );

  if (!snapshot)
    return (
      <main className="cache-state">
        <h1>{t.title}</h1>
        <p>{error ? t.cacheError : t.loading}</p>
        <small>{status.message}</small>
      </main>
    );

  return (
    <div className="site-shell">
      <header>
        <Link href="/" className="brand">
          <CircleHelp className="brand-case" size={24} strokeWidth={2.5} />
          <span>
            TỐI NAY <b>XEM GÌ?</b>
          </span>
        </Link>
        <div className="header-actions">
          {/* Tạm ẩn PreferencePanel vì ta không lọc chi tiết nữa */}
          <button
            className="language-button"
            onClick={() => changeLanguage(language === 'vi' ? 'en' : 'vi')}
            aria-label={t.language}
          >
            {language === 'vi' ? 'EN' : 'VI'}
          </button>
          <button
            className="sound-button"
            onClick={() => {
              audio.current?.setMuted(sound);
              setSound(!sound);
            }}
            aria-label={sound ? t.turnSoundOff : t.turnSoundOn}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>
      <main>
        <div className="intro">
          <div>
            <h1>{t.heroTitle}</h1>
          </div>
          <div className="stattrak-container" title={t.localCounterTitle}>
            <div className="stattrak-badge">
              <span className="stattrak-label">{t.stattrakLabel}</span>
              <span className="stattrak-caption">{t.spinCaption}</span>
              <span className="stattrak-digits">
                {String(localSpins).padStart(6, '0')}
              </span>
            </div>
          </div>
        </div>

        <section className="movie-tools" aria-label={t.search}>
          <form className="movie-search" onSubmit={submitSearch}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
            />
            <button type="submit" className="tool-button">
              {t.search}
            </button>
          </form>
          <label className="genre-control">
            <span>{t.genreFilter}</span>
            <select
              value={movieKind || genre}
              onChange={(event) => changeCombinedFilter(event.target.value)}
            >
              <option value="">{t.allGenres}</option>
              {genreOptions.map(([slug, vi, en]) => (
                <option key={slug} value={slug}>
                  {language === 'vi' ? vi : en}
                </option>
              ))}
              <optgroup label={t.movieTypeFilter}>
                <option value="single">{t.singleMovie}</option>
                <option value="series">{t.seriesMovie}</option>
              </optgroup>
            </select>
          </label>
        </section>

        <div className="cs-case-heading">
          <div className="cs-case-emblem" aria-hidden="true">
            <Box size={20} />
          </div>
          <div className="cs-case-info">
            <span className="cs-case-subtitle">{t.caseSubtitle}</span>
            <h2 className="cs-case-title">{t.caseTitle}</h2>
          </div>
          <div className={`cs-case-status ${spinning ? 'opening' : 'ready'}`}>
            <span className="cs-case-status-dot" />
            <span>{spinning ? t.openingNow : t.ready}</span>
          </div>
        </div>
        <section className="case-panel" aria-label={t.caseAria}>
          <div className="reel-window" ref={viewport}>
            <button
              className="reel-nav reel-nav-left"
              type="button"
              aria-label={t.browsePrevious}
              onClick={() => browseReel(-1)}
              disabled={spinning || !eligible.length}
            >
              <ChevronLeft size={24} />
            </button>
            <div className="selector-line">
              <div className="selector-marker top" />
              <div className="selector-marker bottom" />
            </div>
            <div className="reel-track" ref={attachTrack}>
              {reel
                .filter(
                  ({ id }) => id >= visibleStart && id < visibleStart + 12,
                )
                .map(({ movie, id }) => (
                  <Card
                    key={id}
                    movie={movie}
                    language={language}
                    slot={id}
                    onMovieClick={openMovieDescription}
                  />
                ))}
            </div>
            <div className="reel-fade left" />
            <div className="reel-fade right" />
            <button
              className="reel-nav reel-nav-right"
              type="button"
              aria-label={t.browseNext}
              onClick={() => browseReel(1)}
              disabled={spinning || !eligible.length}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </section>
        <div className="control-bar">
          <div className="last-choice-slot">
            <span className="last-choice-tag">{t.lastMovie}</span>
            {lastChoice ? (
              <div className="last-choice-card">
                <span
                  className="last-choice-tier-pill"
                  style={
                    {
                      '--rarity': colors[lastChoice.tier],
                    } as React.CSSProperties
                  }
                >
                  {t.tiers[lastChoice.tier]}
                </span>
                <strong className="last-choice-name">
                  {lastChoice.name}
                </strong>
              </div>
            ) : (
              <span className="last-choice-empty">—</span>
            )}
          </div>
          <button
            className="open-button"
            disabled={spinning || !eligible.length}
            onClick={open}
          >
            {spinning ? <AudioLines size={22} /> : <Sparkles size={21} />}
            {spinning ? t.opening : result ? t.openAgain : t.open}
          </button>
        </div>

        {/* Modal Hiện Kết Quả Phim */}
        <Dialog open={revealed} onOpenChange={setRevealed}>
          <DialogContent className="winner-dialog" showCloseButton={true}>
            {result && (
              <>
                <DialogTitle className="winner-title" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
                  {result.name}
                </DialogTitle>
                <p className="winner-native-name" style={{ textAlign: 'center', opacity: 0.7 }}>
                  {result.originalName}
                </p>
                <DialogDescription className="winner-description" style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <span style={{ color: colors[result.tier], fontWeight: 'bold' }}>{t.tiers[result.tier]}</span>
                </DialogDescription>

                <div
                  className="winner-art"
                  style={
                    {
                      '--rarity': colors[result.tier],
                      height: '400px',
                      margin: '0 auto',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: `0 0 20px ${colors[result.tier]}40`
                    } as React.CSSProperties
                  }
                >
                  <MovieImage movie={result} alt={result.name} />
                </div>

                <div className="winner-details" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '15px' }}>
                  <div className="winner-detail" style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t.releaseYear}</span>
                    <strong style={{ display: 'block', fontSize: '1.2rem' }}>{result.year}</strong>
                  </div>
                  <div className="winner-detail" style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t.qualityLabel}</span>
                    <strong style={{ display: 'block', fontSize: '1.2rem' }}>{result.quality}</strong>
                  </div>
                </div>

                <div className="winner-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    style={{ flex: '1 1 180px', padding: '12px', background: colors[result.tier], color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    onClick={() => handleWatchMovie(result.slug)}
                  >
                    <PlayCircle size={20} />
                    {t.watchNow}
                  </button>
                  <button
                    style={{ flex: '1 1 160px', padding: '12px', background: '#2e2a54', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    onClick={() => addToInventory(result)}
                  >
                    {t.addToCollection}
                  </button>
                  <button
                    style={{ flex: '1 1 160px', padding: '12px', background: '#333', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                    onClick={() => openMovieDescription(result)}
                  >
                    {t.description}
                  </button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Phát Video */}
        <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
          <DialogContent className="watch-dialog" showCloseButton>
            {episodes.length > 0 && (
              <div className="episode-picker">
                <strong>{t.episodes}</strong>
                <div className="episode-list">
                  {episodes.map((episode, index) => (
                    <button
                      key={`${episode.name || t.episode}-${index}`}
                      className={index === currentEpisode ? 'episode-button active' : 'episode-button'}
                      onClick={() => playEpisode(episodes, index)}
                    >
                      {episode.name || `${t.episode} ${index + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {playingVideo && (
              playingVideo.includes('.m3u8') || playingVideo.endsWith('.mp4') ? (
                <video
                  key={playingVideo}
                  src={playingVideo}
                  controls
                  autoPlay
                  onEnded={() => {
                    if (currentEpisode < episodes.length - 1) {
                      playEpisode(episodes, currentEpisode + 1);
                    }
                  }}
                  style={{ display: 'block', width: '100%', maxHeight: '500px' }}
                />
              ) : (
                <iframe
                  key={playingVideo}
                  src={playingVideo}
                  width="100%"
                  height="500px"
                  frameBorder="0"
                  allowFullScreen
                  style={{ display: 'block' }}
                />
              )
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
          <DialogContent className="description-dialog" showCloseButton>
            {movieDetail.loading ? (
              <p>{t.descriptionLoading}</p>
            ) : movieDetail.movie ? (
              <>
                <DialogTitle style={{ fontSize: '1.5rem' }}>
                  {movieDetail.movie.name}
                </DialogTitle>
                <DialogDescription style={{ marginBottom: '14px' }}>
                  {movieDetail.movie.original_name || movieDetail.movie.originalName}
                </DialogDescription>
                <div
                  className="description-layout"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '180px minmax(0, 1fr)',
                    gap: '16px',
                    alignItems: 'start',
                  }}
                >
                  <MovieImage
                    movie={{
                      ...movieDetail.movie,
                      thumbUrl:
                        movieDetail.movie.poster_url ||
                        movieDetail.movie.thumbUrl,
                    }}
                    alt={movieDetail.movie.name}
                  />
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {movieDetail.movie.time && (
                        <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#f3f4f6', color: '#111', fontSize: '0.7rem', fontWeight: 700 }}>
                          {movieDetail.movie.time}
                        </span>
                      )}
                      {movieDetail.movie.quality && (
                        <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#e0e7ff', color: '#3730a3', fontSize: '0.7rem', fontWeight: 700 }}>
                          {movieDetail.movie.quality}
                        </span>
                      )}
                    </div>
                    {movieDetail.movie.director && (
                      <p style={{ margin: 0 }}><strong>{t.director}:</strong> {movieDetail.movie.director}</p>
                    )}
                    {movieDetail.movie.casts && (
                      <p style={{ margin: 0 }}><strong>{t.cast}:</strong> {movieDetail.movie.casts}</p>
                    )}
                    {movieDetail.movie.language && (
                      <p style={{ margin: 0 }}><strong>{t.languageLabel}:</strong> {movieDetail.movie.language}</p>
                    )}
                    <div
                      style={{
                        maxHeight: '260px',
                        overflowY: 'auto',
                        lineHeight: 1.7,
                        color: '#374151',
                        fontSize: '0.92rem',
                      }}
                    >
                      {plainDescription(movieDetail.movie.description) ||
                        t.noDescription}
                    </div>
                    <div className="detail-actions">
                      <button
                        className="detail-action detail-action-primary"
                        onClick={() => {
                          setDescriptionOpen(false);
                          void handleWatchMovie(movieDetail.movie!.slug);
                        }}
                      >
                        <PlayCircle size={18} />
                        {t.watchNow}
                      </button>
                      <button
                        className="detail-action"
                        onClick={() =>
                          isInCollection
                            ? removeFromInventory(movieDetail.movie!.id)
                            : addToInventory(movieDetail.movie!)
                        }
                      >
                        {isInCollection
                          ? t.removeFromCollection
                          : t.addToCollection}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <section className="inventory">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.insideList}</span>
              <div className="inventory-title-row">
                <h2>
                  {t.koreanMoviesPage} {page}: <span>{snapshot.movies.length}</span>
                </h2>
              </div>
            </div>
            <div className="rarity-legend">
              {t.tiers.map((tier, index) => (
                <span key={tier}>
                  <i style={{ background: colors[index] }} />
                  {tier}
                </span>
              ))}
            </div>
          </div>
          <div className="inventory-grid">{inventory}</div>
          <div className="pagination" aria-label={t.insideList}>
            <button
              className="pagination-button"
              disabled={page <= 1 || spinning}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t.previousPage}
            </button>
            <span>
              {t.page} <strong>{page}</strong> / {snapshot.totalPages}
            </span>
            <form className="go-to-page" onSubmit={goToPage}>
              <label htmlFor="page-number">{t.goToPage}</label>
              <input
                id="page-number"
                type="number"
                min="1"
                max={snapshot.totalPages}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
              />
              <button className="pagination-button" type="submit">
                {t.go}
              </button>
            </form>
            <button
              className="pagination-button"
              disabled={page >= snapshot.totalPages || spinning}
              onClick={() => setPage((current) => current + 1)}
            >
              {t.nextPage}
            </button>
          </div>
        </section>

        <section className="inventory" aria-label={t.collectionAria}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.collection}</span>
              <div className="inventory-title-row">
                <h2>
                  {t.collectionTitle} <span>{personalInventory.length}</span>
                </h2>
              </div>
            </div>
          </div>
          {personalInventory.length ? (
            <div className="inventory-grid">
              {personalInventory.map((movie) => (
                <div key={movie.id} style={{ display: 'grid', gap: '8px' }}>
                  <Card
                    movie={movie}
                    language={language}
                    small
                    onMovieClick={openMovieDescription}
                  />
                  <div className="collection-actions">
                    <button
                      className="collection-button"
                      onClick={() => openMovieDescription(movie)}
                    >
                      {t.description}
                    </button>
                    <button
                      className="collection-button collection-button-danger"
                      onClick={() => removeFromInventory(movie.id)}
                    >
                      {t.removeFromCollection}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#6b7280' }}>
              {t.collectionEmpty}
            </p>
          )}
        </section>

        <footer>
          {/* Giữ lại footer gốc để tôn trọng credit của nagisanzenin */}
          {/* ... */}
        </footer>
      </main>
    </div>
  );
}