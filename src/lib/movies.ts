export const SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const TIER_COUNT = 5 as const;

export type Tier = 0 | 1 | 2 | 3 | 4;

export type Movie = {
  id: string;
  slug: string;
  name: string;
  originalName: string;
  thumbUrl: string;
  year: number;
  quality: string;
  tier: Tier; // Gacha UI cần thuộc tính này để xác định độ hiếm
};

export type MovieSnapshot = {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  snapshotId: string;
  createdAt: string;
  movies: Movie[];
  currentPage: number;
  totalPages: number;
};

export type CurrentSnapshot = {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  snapshotId: string;
  snapshotPath: string;
  createdAt: string;
};

export type RefreshStatus = {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  state: 'idle' | 'refreshing' | 'error';
  updatedAt: string;
  message?: string;
  attempt?: number;
};

// Giữ lại tên Tier chuẩn phong cách mở hòm CS:GO của repo gốc
export const tierNames = [
  'MIL-SPEC',
  'RESTRICTED',
  'CLASSIFIED',
  'COVERT',
  '★ SPECIAL ITEM',
] as const;

// Hàm hỗ trợ lọc text an toàn
export const safeText = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() && value.length <= max
    ? value.trim()
    : null;

// Xác thực toàn bộ data snapshot (đọc từ file JSON)
export function validateSnapshot(input: unknown): MovieSnapshot | null {
  if (!input || typeof input !== 'object') return null;
  const snapshot = input as Record<string, unknown>;

  if (
    snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION ||
    !safeText(snapshot.snapshotId, 80) ||
    !safeText(snapshot.createdAt, 40) ||
    !Array.isArray(snapshot.items) // "items" là mảng phim ta lưu từ NguonC
  ) {
    return null;
  }

  const movies: Movie[] = [];
  const ids = new Set<string>();

  for (const item of snapshot.items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;

    const slug = safeText(row.slug, 200);
    const name = safeText(row.name, 200);
    if (!slug || !name || ids.has(slug)) continue;

    // Phân loại Tier ngẫu nhiên hoặc dựa trên năm/chất lượng để gacha có độ hiếm
    // Ở đây tạm thời random Tier từ 0-4
    const randomTier = Math.floor(Math.random() * TIER_COUNT) as Tier;

    ids.add(slug);
    movies.push({
      id: slug, // Dùng slug làm ID luôn
      slug: slug,
      name: name,
      originalName: safeText(row.original_name, 200) || name,
      thumbUrl: safeText(row.thumb_url, 500) || '',
      year:
        typeof row.year === 'number'
          ? row.year
          : typeof row.year === 'string' && /^\d{4}$/.test(row.year)
            ? Number(row.year)
            : new Date().getFullYear(),
      quality: safeText(row.quality, 50) || 'HD',
      tier: randomTier,
    });
  }

  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    snapshotId: snapshot.snapshotId as string,
    createdAt: snapshot.createdAt as string,
    movies,
    currentPage:
      typeof snapshot.currentPage === 'number' && snapshot.currentPage > 0
        ? Math.floor(snapshot.currentPage)
        : 1,
    totalPages:
      typeof snapshot.totalPages === 'number' && snapshot.totalPages > 0
        ? Math.floor(snapshot.totalPages)
        : 1,
  };
}

// Xác thực metadata của snapshot hiện tại
export function validateCurrent(input: unknown): CurrentSnapshot | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;

  const snapshotId = safeText(value.snapshotId, 80);
  // Cập nhật Regex để trỏ tới đúng thư mục movie-cache mới của chúng ta
  const snapshotPath =
    typeof value.snapshotPath === 'string' &&
      /^\/movie-cache\/snapshot\.json$/i.test(value.snapshotPath)
      ? value.snapshotPath
      : null;

  return value.schemaVersion === SNAPSHOT_SCHEMA_VERSION && snapshotId && snapshotPath
    ? {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      snapshotId,
      snapshotPath,
      createdAt: (value.createdAt as string) || new Date().toISOString(),
    }
    : null;
}