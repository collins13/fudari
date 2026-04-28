/**
 * Deterministic placeholder avatar for users that have no uploaded profileImage.
 * Uses ui-avatars.com so each user gets a unique, initials-based image instead
 * of every empty profile sharing the same stock photo.
 */
export function avatarFor(
  name: string | null | undefined,
  seed: string | number | null | undefined,
  size = 256
): string {
  const safeName = (name || 'TuFixIt User').trim() || 'TuFixIt User';
  const initials = encodeURIComponent(safeName);
  // Stable colour per user so two users with the same name still differ.
  const palette = ['F84525', '0D6EFD', '198754', 'F39C12', '6F42C1', '20C997', 'D63384', '0DCAF0'];
  const key = String(seed ?? safeName);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const bg = palette[hash % palette.length];
  return `https://ui-avatars.com/api/?name=${initials}&background=${bg}&color=fff&size=${size}&bold=true&format=svg`;
}

/** Returns the user's profileImage if set, otherwise a per-user initials avatar. */
export function profileImageFor(
  profileImage: string | null | undefined,
  name: string | null | undefined,
  seed: string | number | null | undefined,
  size = 256
): string {
  if (profileImage && profileImage.trim()) return profileImage;
  return avatarFor(name, seed, size);
}
