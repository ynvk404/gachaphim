import type { Movie } from './movies';

export type MovieProfile = {
  disabled: string[];
  enabledTiers: boolean[];
  revision: number;
};
export const emptyProfile = (): MovieProfile => ({
  disabled: [],
  enabledTiers: [true, true, true, true, true],
  revision: 1,
});

export function validateProfile(input: unknown): MovieProfile {
  if (!input || typeof input !== 'object')
    throw new Error('Invalid preferences');
  const value = input as Record<string, unknown>;
  if (
    Object.keys(value).some(
      (key) => !['disabled', 'enabledTiers', 'revision'].includes(key),
    ) ||
    !Array.isArray(value.disabled) ||
    !Array.isArray(value.enabledTiers) ||
    value.enabledTiers.length !== 5 ||
    value.enabledTiers.some((x) => typeof x !== 'boolean') ||
    !Number.isSafeInteger(value.revision) ||
    value.revision !== 1 ||
    value.disabled.length > 250 ||
    new Set(value.disabled).size !== value.disabled.length ||
    value.disabled.some(
      (id) => typeof id !== 'string' || !/^[a-z0-9-]{1,100}$/i.test(id),
    )
  )
    throw new Error('Invalid preferences');
  return {
    disabled: value.disabled as string[],
    enabledTiers: value.enabledTiers as boolean[],
    revision: 1,
  };
}

export function eligibleMovies(items: Movie[], profile: MovieProfile) {
  return items.filter(
    (item) =>
      profile.enabledTiers[item.tier] && !profile.disabled.includes(item.id),
  );
}

export function filterMovies(
  items: Movie[],
  profile: MovieProfile = emptyProfile(),
): Movie[] {
  return eligibleMovies(items, profile);
}
