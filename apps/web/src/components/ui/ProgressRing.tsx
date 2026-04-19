'use client';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

export function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 8,
  color = '#2563EB',
  trackColor = '#E2E8F0',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`${percent}% complete`}
      role="img"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={circumference / 4} // Start at top
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}
