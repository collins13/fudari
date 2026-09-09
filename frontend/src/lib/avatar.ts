/**
 * Deterministic placeholder avatar for users with no uploaded profileImage.
 *
 * Rendered locally as an inline SVG data URI rather than fetched from a third
 * party: it costs no request, survives offline/PWA use and cannot be broken by
 * a network that blocks or intercepts outbound HTTPS.
 */

// Brand teal first, then hues that stay legible behind white text.
const PALETTE = ['0D5C63', '1F6F8B', '2E7D5B', 'B26A00', '6F42C1', '0F766E', 'A33B6B', '1D4E89'];

const FALLBACK_NAME = 'Fudari User';

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colourFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function avatarFor(
  name: string | null | undefined,
  seed: string | number | null | undefined,
  size = 256
): string {
  const safeName = (name || FALLBACK_NAME).trim() || FALLBACK_NAME;
  const initials = initialsOf(safeName);
  const bg = colourFor(String(seed ?? safeName));

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" fill="#${bg}"/>` +
    `<text x="50" y="50" fill="#ffffff" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif"` +
    ` font-size="38" font-weight="700" text-anchor="middle" dominant-baseline="central">${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Returns the user's profileImage if set, otherwise a per-user initials avatar. */
export function profileImageFor(
  profileImage: string | null | undefined,
  name: string | null | undefined,
  seed: string | number | null | undefined,
  size = 256
): string {
  const resolved = resolveProfileImage(profileImage);
  if (resolved) return resolved;
  return avatarFor(name, seed, size);
}

/**
 * The API returns worker photos as the path `/api/workers/{id}/photo`, which has to be
 * resolved against the API origin rather than the site origin.
 */
export function resolveProfileImage(src: string | null | undefined): string {
  const value = (src || '').trim();
  if (!value) return '';
  if (!value.startsWith('/')) return value;
  return `${apiOrigin()}${value}`;
}

function apiOrigin(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  try {
    return new URL(apiUrl).origin;
  } catch {
    return '';
  }
}

/** Generated avatars are already tiny SVGs, so they must skip the image optimizer. */
export function isGeneratedAvatar(src: string | null | undefined): boolean {
  return !!src && src.startsWith('data:');
}
