import { profileImageFor } from './avatar';
import { skillTypeToLabel, vettingToPackage } from './skills';

export interface FeaturedArtisan {
  id: number;
  name: string;
  skill: string;
  skillType: string;
  package: string;
  rating: number;
  reviews: number;
  location: string;
  price: number;
  image: string;
  totalJobsCompleted: number;
  availableNow: boolean;
}

export interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  description: string;
  count: number;
  slug: string;
}

export interface PlatformStats {
  totalArtisans: number;
  totalCompletedJobs: number;
  totalCategories: number;
  totalListings: number;
}

export const FEATURED_ARTISAN_LIMIT = 20;

/* eslint-disable @typescript-eslint/no-explicit-any */

export function toCategoryItem(c: any): CategoryItem {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon || 'fa-wrench',
    description: c.description || '',
    count: c.artisanCount ?? 0,
    slug: c.slug || String(c.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  };
}

export function toFeaturedArtisan(w: any): FeaturedArtisan {
  const skill = w.skills?.[0];
  const fullName = `${w.firstName} ${w.lastName}`;
  return {
    id: w.id,
    name: fullName,
    skill: skill?.skillType ? skillTypeToLabel(skill.skillType) : 'General',
    skillType: skill?.skillType || '',
    package: vettingToPackage(w.vettingLevel || 'STANDARD'),
    rating: w.trustScore || 0,
    reviews: w.totalReviews || 0,
    location: w.locationName || 'Kenya',
    price: skill?.hourlyRate ? Number(skill.hourlyRate) : 0,
    image: profileImageFor(w.profileImage, fullName, w.id),
    totalJobsCompleted: w.totalJobsCompleted || 0,
    availableNow: w.availableNow === true,
  };
}
