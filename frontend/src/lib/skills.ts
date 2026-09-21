/** Shared skill/vetting utilities — used across homepage, artisan listing, and profile pages. */

import { SKILL_LABELS_KE } from './kenya';

/** Single source of truth is SKILL_LABELS_KE, so new categories never need a second edit. */
export function skillTypeToLabel(skillType: string): string {
  return SKILL_LABELS_KE[skillType]?.en || skillType;
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

/** Trust tiers are shown as Gold/Silver/Bronze so "Pro" is free to mean "a provider". */
export function packageLabel(pkg: string): string {
  if (pkg === 'Gold') return 'Gold';
  if (pkg === 'Silver') return 'Silver';
  return 'Bronze';
}
