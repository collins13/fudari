/** Shared skill/vetting utilities — used across homepage, artisan listing, and profile pages. */

export function skillTypeToLabel(skillType: string): string {
  const map: Record<string, string> = {
    ELECTRICIAN: 'Electrician',
    PLUMBER: 'Plumber',
    MECHANIC: 'Mechanic',
    CARPENTER: 'Carpenter',
    PAINTER: 'Painter',
    WELDER: 'Welder',
    HVAC_TECHNICIAN: 'HVAC Technician',
    APPLIANCE_REPAIR: 'Appliance Repair',
    ROOFING: 'Roofing',
    TILING: 'Tiling',
    MASON: 'Mason',
    GARDENER: 'Gardener',
    CLEANER: 'Cleaner',
    SECURITY: 'Security',
    OTHER: 'Other',
  };
  return map[skillType] || skillType;
}

export function vettingToPackage(level: string): 'Gold' | 'Silver' | 'Bronze' {
  if (level === 'PRO') return 'Gold';
  if (level === 'VERIFIED') return 'Silver';
  return 'Bronze';
}

export function getPackageBadgeClass(pkg: string): string {
  if (pkg === 'Gold') return 'text-bg-warning';
  if (pkg === 'Silver') return 'text-bg-secondary';
  return 'text-bg-dark';
}

export function packageLabel(pkg: string): string {
  if (pkg === 'Gold') return 'Pro';
  if (pkg === 'Silver') return 'Verified';
  return 'Standard';
}
