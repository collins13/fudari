/**
 * Kenya-specific constants for TUFIXIT.
 * Counties, major towns, and Swahili skill labels for the Kenyan market.
 */

// All 47 Kenya counties — used for location dropdowns, search filters, and SEO
export const KENYA_COUNTIES: string[] = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet',
  'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga',
  'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia',
  'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit',
  'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River',
  'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu',
  'Vihiga', 'Wajir', 'West Pokot',
];

// Major town/city names for autocomplete suggestions
export const KENYA_MAJOR_TOWNS: string[] = [
  'Nairobi CBD', 'Westlands', 'Karen', 'Kilimani', 'Lavington',
  'South B', 'South C', 'Eastleigh', 'Langata', 'Kibra',
  'Parklands', 'Kasarani', 'Ruaka', 'Ruiru', 'Juja',
  'Thika', 'Kiambu', 'Limuru', 'Kikuyu',
  'Mombasa', 'Nyali', 'Bamburi', 'Likoni', 'Changamwe',
  'Kisumu', 'Mamboleo', 'Milimani',
  'Nakuru', 'Naivasha', 'Gilgil',
  'Eldoret', 'Nanyuki', 'Meru', 'Nyeri', 'Machakos',
  'Athi River', 'Kitengela', 'Ongata Rongai', 'Ngong', 'Kajiado',
  'Malindi', 'Kilifi', 'Diani', 'Lamu',
];

// Skill type labels including Swahili/Sheng alternatives for better local relevance
export const SKILL_LABELS_KE: Record<string, { en: string; sw: string }> = {
  ELECTRICIAN:        { en: 'Electrician',         sw: 'Fundi Stima' },
  PLUMBER:            { en: 'Plumber',             sw: 'Fundi Mabomba' },
  MECHANIC:           { en: 'Mechanic',            sw: 'Fundi Magari' },
  CARPENTER:          { en: 'Carpenter',           sw: 'Fundi Seremala' },
  PAINTER:            { en: 'Painter',             sw: 'Fundi Rangi' },
  WELDER:             { en: 'Welder',              sw: 'Fundi Chuma' },
  HVAC_TECHNICIAN:    { en: 'HVAC Technician',     sw: 'Fundi AC' },
  APPLIANCE_REPAIR:   { en: 'Appliance Repair',    sw: 'Fundi Vifaa' },
  ROOFING:            { en: 'Roofing',             sw: 'Fundi Paa' },
  TILING:             { en: 'Tiling',              sw: 'Fundi Tiles' },
  MASON:              { en: 'Mason',               sw: 'Fundi Ujenzi' },
  GARDENER:           { en: 'Gardener',            sw: 'Fundi Bustani' },
  CLEANER:            { en: 'Cleaner',             sw: 'Fundi Usafi' },
  SECURITY:           { en: 'Security Systems',    sw: 'Fundi Usalama' },
  SOLAR_TECHNICIAN:   { en: 'Solar Technician',    sw: 'Fundi Solar' },
  BOREHOLE_DRILLING:  { en: 'Borehole Drilling',   sw: 'Fundi Kisima' },
  FUMIGATION:         { en: 'Fumigation',          sw: 'Fundi Dawa' },
  WATER_TANK_CLEANING:{ en: 'Water Tank Cleaning',  sw: 'Fundi Tanki' },
  GLASS_FITTER:       { en: 'Glass Fitter',        sw: 'Fundi Kioo' },
  CEILING_BOARD:      { en: 'Ceiling Board',       sw: 'Fundi Dari' },
  LOCKSMITH:          { en: 'Locksmith',           sw: 'Fundi Kufuli' },
  CCTV_INSTALLER:     { en: 'CCTV Installer',      sw: 'Fundi Camera' },
  INTERIOR_DESIGNER:  { en: 'Interior Designer',   sw: 'Fundi Mapambo' },
  OTHER:              { en: 'Other',               sw: 'Nyingine' },
};

// Format KES currency Kenyan style
export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

// Quick skill label getter
export function skillLabel(skillType: string): string {
  return SKILL_LABELS_KE[skillType]?.en || skillType;
}

// Bilingual skill label (e.g. "Electrician (Fundi Stima)")
export function skillLabelBilingual(skillType: string): string {
  const entry = SKILL_LABELS_KE[skillType];
  if (!entry) return skillType;
  return `${entry.en} (${entry.sw})`;
}
