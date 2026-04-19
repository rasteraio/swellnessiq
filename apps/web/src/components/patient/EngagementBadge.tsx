import { cn } from '../../lib/utils';

const LEVEL_CONFIG = {
  HIGH: { label: 'High', className: 'badge-green' },
  MEDIUM: { label: 'On track', className: 'badge-blue' },
  LOW: { label: 'Needs attention', className: 'badge-yellow' },
  AT_RISK: { label: 'At risk', className: 'badge-red' },
};

export function EngagementBadge({ level }: { level: string }) {
  const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.MEDIUM;
  return <span className={cn(config.className)}>{config.label}</span>;
}
