/**
 * TUFIXIT Logo component — renders the SVG logo inline for crisp rendering at any size.
 * Supports both light and dark variants.
 */

interface LogoProps {
  variant?: 'dark' | 'white';
  height?: number;
  showTagline?: boolean;
  className?: string;
}

export default function Logo({ variant = 'dark', height = 36, showTagline = false, className = '' }: LogoProps) {
  const textColor = variant === 'white' ? '#ffffff' : '#1a1a2e';
  const taglineColor = variant === 'white' ? 'rgba(255,255,255,0.7)' : '#6c757d';
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
      aria-label="TUFIXIT logo"
      role="img"
    >
      {/* Icon mark — red rounded square with wrench */}
      <g transform="translate(4, 2)">
        <rect width="34" height="34" rx="8" fill="#F84525" />
        <path
          d="M24 10a6 6 0 0 0-5.4 3.3l-7.2 7.2a2.7 2.7 0 1 0 3.8 3.8l7.2-7.2A6 6 0 1 0 24 10Zm0 9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
          fill="#fff"
        />
        <path d="M12 11.5l2 1.2-2 1.3-2-1.2Z" fill="#fff" opacity="0.7" />
      </g>

      {/* Wordmark */}
      <text
        x="46"
        y="27"
        fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="800"
        fontSize="28"
        letterSpacing="-0.5"
      >
        <tspan fill={textColor}>TU</tspan>
        <tspan fill="#F84525">FIX</tspan>
        <tspan fill={textColor}>IT</tspan>
      </text>

      {/* Tagline (optional) */}
      {showTagline && (
        <text
          x="47"
          y="44"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="500"
          fontSize="7.5"
          fill={taglineColor}
          letterSpacing="2.2"
        >
          KENYA&apos;S JUA KALI MARKETPLACE
        </text>
      )}
    </svg>
  );
}
