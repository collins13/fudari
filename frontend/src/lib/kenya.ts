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
  MOVER:              { en: 'Mover',               sw: 'Wahamishaji' },
  TRANSPORT_PROVIDER: { en: 'Transport Provider',  sw: 'Usafiri wa Mizigo' },
  EVENT_LIGHTING:     { en: 'Event Lighting',      sw: 'Taa za Hafla' },
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

/**
 * Customers search by symptom ("tap is leaking"), not by trade taxonomy ("Plumber").
 * Keywords are matched against English, Swahili and Sheng phrasing.
 */
const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  PLUMBER: [
    'tap', 'taps', 'leak', 'leaking', 'burst', 'pipe', 'pipes', 'sink', 'drain', 'blocked',
    'toilet', 'cistern', 'flush', 'no water', 'water pressure', 'sewer', 'bomba', 'maji',
    'choo', 'mabomba', 'imeziba', 'inavuja',
  ],
  ELECTRICIAN: [
    'power', 'no power', 'electricity', 'socket', 'sockets', 'switch', 'wiring', 'wire',
    'short circuit', 'shock', 'bulb', 'light', 'lights', 'fuse', 'trip', 'tripping',
    'meter', 'token', 'stima', 'umeme', 'taa', 'hakuna stima',
  ],
  APPLIANCE_REPAIR: [
    'fridge', 'refrigerator', 'freezer', 'washing machine', 'microwave', 'oven', 'cooker',
    'tv', 'television', 'iron', 'kettle', 'blender', 'friji', 'jiko',
  ],
  HVAC_TECHNICIAN: ['ac', 'air con', 'air conditioner', 'aircon', 'cooling', 'fan', 'ventilation', 'hewa'],
  CARPENTER: [
    'door', 'doors', 'window frame', 'cabinet', 'wardrobe', 'shelf', 'shelves', 'furniture',
    'table', 'chair', 'hinge', 'mlango', 'kabati', 'samani', 'seremala',
  ],
  MASON: ['wall', 'crack', 'cracks', 'plaster', 'cement', 'concrete', 'foundation', 'block', 'ukuta', 'ujenzi'],
  PAINTER: ['paint', 'painting', 'repaint', 'peeling', 'wall colour', 'wall color', 'rangi'],
  ROOFING: ['roof', 'roofing', 'ceiling leak', 'gutter', 'iron sheet', 'mabati', 'paa', 'inavuja juu'],
  TILING: ['tile', 'tiles', 'tiling', 'floor tile', 'grout'],
  MECHANIC: [
    'car', 'vehicle', 'engine', 'brake', 'brakes', 'tyre', 'tire', 'puncture', 'battery',
    'wont start', "won't start", 'service car', 'gari', 'injini', 'breki',
  ],
  WELDER: ['gate', 'grill', 'grille', 'metal', 'welding', 'weld', 'steel', 'chuma', 'lango'],
  GLASS_FITTER: ['glass', 'window pane', 'broken window', 'mirror', 'kioo'],
  LOCKSMITH: ['lock', 'locked out', 'key', 'keys', 'padlock', 'kufuli', 'ufunguo'],
  CCTV_INSTALLER: ['cctv', 'camera', 'cameras', 'surveillance', 'security camera'],
  MOVER: [
    'move', 'moving', 'move house', 'house move', 'office move', 'relocate', 'relocation',
    'shifting', 'shift house', 'packing', 'movers', 'hama', 'kuhama', 'nahama', 'kubeba samani',
  ],
  TRANSPORT_PROVIDER: [
    'transport', 'pickup', 'pick up', 'canter', 'lorry', 'truck', 'van', 'cargo', 'courier',
    'delivery', 'deliver', 'ferry', 'haulage', 'luggage', 'boda', 'tuk tuk', 'mkokoteni',
    'usafiri', 'mizigo',
  ],
  EVENT_LIGHTING: [
    'event lighting', 'event lights', 'lighting setup', 'party lights', 'stage lights',
    'stage lighting', 'wedding lights', 'dj lights', 'disco lights', 'floodlight', 'taa za hafla',
  ],
  SOLAR_TECHNICIAN: ['solar', 'panel', 'panels', 'inverter', 'solar water heater'],
  FUMIGATION: [
    'pest', 'pests', 'cockroach', 'cockroaches', 'bedbug', 'bed bugs', 'rats', 'rat',
    'termite', 'termites', 'fumigate', 'mende', 'kunguni', 'panya', 'dawa',
  ],
  CLEANER: ['clean', 'cleaning', 'deep clean', 'sofa cleaning', 'carpet', 'usafi', 'kufua'],
  WATER_TANK_CLEANING: ['tank', 'water tank', 'tanki'],
  BOREHOLE_DRILLING: ['borehole', 'well', 'drilling', 'kisima'],
  GARDENER: ['garden', 'lawn', 'grass', 'hedge', 'shamba', 'bustani'],
  CEILING_BOARD: ['ceiling', 'gypsum', 'ceiling board', 'dari'],
  SECURITY: ['alarm', 'electric fence', 'gate motor', 'intercom'],
};

/**
 * Maps a free-text symptom to the most likely skill types, best match first.
 * Returns an empty array when nothing matches confidently.
 */
export function matchSymptomToSkills(query: string, limit = 3): string[] {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return [];

  const scored = Object.entries(SYMPTOM_KEYWORDS)
    .map(([skillType, keywords]) => {
      let score = 0;
      for (const kw of keywords) {
        if (!q.includes(kw)) continue;
        // Longer keyword matches are more specific, so weight them higher.
        score += kw.includes(' ') ? kw.length * 2 : kw.length;
      }
      return { skillType, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.skillType);
}
