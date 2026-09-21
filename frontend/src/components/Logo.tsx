/**
 * FUDARI logo — inline SVG so it stays crisp at any size.
 *
 * Mark: an "F" monogram in a teal squircle with an amber crossbar as the brand accent.
 * `variant="white"` inverts the tile rather than dropping the mark to a flat silhouette.
 */

interface LogoProps {
  variant?: 'dark' | 'white';
  /** Icon only, no wordmark — for avatars, app tiles and tight navbars. */
  markOnly?: boolean;
  height?: number;
  showTagline?: boolean;
  className?: string;
}

const TEAL = '#0D5C63';
const AMBER = '#FFB020';

export default function Logo({
  variant = 'dark',
  markOnly = false,
  height = 36,
  showTagline = false,
  className = '',
}: LogoProps) {
  const onDark = variant === 'white';
  const glyphFill = onDark ? TEAL : '#ffffff';
  const wordFill = onDark ? '#ffffff' : '#12333A';
  const taglineFill = onDark ? 'rgba(255,255,255,0.72)' : '#6C7F84';

  const gradient = (
    <defs>
      <linearGradient id="fudari-mark" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#157A83" />
        <stop offset="1" stopColor="#0A4A50" />
      </linearGradient>
    </defs>
  );

  const mark = (
    <>
      <rect width="48" height="48" rx="13" fill={onDark ? '#ffffff' : 'url(#fudari-mark)'} />
      <rect x="15" y="12" width="6.5" height="24" rx="3.25" fill={glyphFill} />
      <rect x="15" y="12" width="18" height="6.5" rx="3.25" fill={glyphFill} />
      <rect x="15" y="21.75" width="13" height="6.5" rx="3.25" fill={AMBER} />
    </>
  );

  if (markOnly) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        fill="none"
        height={height}
        width={height}
        className={className}
        aria-label="Fudari"
        role="img"
      >
        {!onDark && gradient}
        {mark}
      </svg>
    );
  }

  const viewBox = showTagline ? '0 0 240 48' : '0 0 240 38';
  const aspectRatio = showTagline ? 240 / 48 : 240 / 38;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill="none"
      height={height}
      width={height * aspectRatio}
      className={className}
      aria-label="Fudari"
      role="img"
    >
      {!onDark && gradient}

      <g transform={showTagline ? 'translate(4 4) scale(0.83333)' : 'translate(4 2) scale(0.70833)'}>
        {mark}
      </g>

      <text
        x={showTagline ? 54 : 46}
        y={showTagline ? 31 : 27}
        fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="800"
        fontSize={showTagline ? 28 : 26}
        letterSpacing="0.5"
        fill={wordFill}
      >
        FUDARI
      </text>

      {showTagline && (
        <text
          x="55"
          y="43"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="600"
          fontSize="7"
          letterSpacing="1.6"
          fill={taglineFill}
        >
          KENYA&apos;S SERVICES MARKETPLACE
        </text>
      )}
    </svg>
  );
}
