/**
 * Kenya-specific constants for FUDARI.
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
  BODA_BODA:          { en: 'Boda Boda',           sw: 'Boda Boda' },
  TUK_TUK:            { en: 'Tuk Tuk',             sw: 'Tuk Tuk' },
  COURIER:            { en: 'Courier & Delivery',  sw: 'Mtumaji' },
  MAMA_FUA:           { en: 'Mama Fua',            sw: 'Mama Fua' },
  BARBER:             { en: 'Barber',              sw: 'Kinyozi' },
  HAIR_SALON:         { en: 'Hair Salon',          sw: 'Saluni' },
  MAKEUP_ARTIST:      { en: 'Makeup Artist',       sw: 'Msanii wa Urembo' },
  CAR_WASH:           { en: 'Car Wash',            sw: 'Kuosha Gari' },
  TYRE_SERVICES:      { en: 'Tyre Services',       sw: 'Fundi Matairi' },
  PHOTOGRAPHER:       { en: 'Photographer',        sw: 'Mpiga Picha' },
  GRAPHIC_DESIGNER:   { en: 'Graphic Designer',    sw: 'Mbunifu wa Michoro' },
  IT_TECHNICIAN:      { en: 'IT Technician',       sw: 'Fundi Kompyuta' },
  EVENT_LIGHTING:     { en: 'Event Lighting',      sw: 'Taa za Hafla' },
  OTHER:              { en: 'Other',               sw: 'Nyingine' },
};

/** Every skill type the platform supports, in the order shown to users. */
export const SKILL_TYPES: string[] = Object.keys(SKILL_LABELS_KE);

/** Font Awesome class per skill type; `fa-wrench` is the fallback. */
export const SKILL_ICONS: Record<string, string> = {
  ELECTRICIAN: 'fa-bolt',
  PLUMBER: 'fa-faucet',
  MECHANIC: 'fa-car',
  CARPENTER: 'fa-hammer',
  PAINTER: 'fa-paint-roller',
  WELDER: 'fa-fire',
  HVAC_TECHNICIAN: 'fa-wind',
  APPLIANCE_REPAIR: 'fa-blender',
  ROOFING: 'fa-house-chimney',
  TILING: 'fa-border-all',
  MASON: 'fa-building',
  GARDENER: 'fa-leaf',
  CLEANER: 'fa-broom',
  SECURITY: 'fa-shield-halved',
  SOLAR_TECHNICIAN: 'fa-solar-panel',
  BOREHOLE_DRILLING: 'fa-water',
  FUMIGATION: 'fa-bug',
  WATER_TANK_CLEANING: 'fa-droplet',
  GLASS_FITTER: 'fa-window-maximize',
  CEILING_BOARD: 'fa-table-cells',
  LOCKSMITH: 'fa-key',
  CCTV_INSTALLER: 'fa-video',
  INTERIOR_DESIGNER: 'fa-couch',
  MOVER: 'fa-truck-moving',
  TRANSPORT_PROVIDER: 'fa-truck',
  BODA_BODA: 'fa-motorcycle',
  TUK_TUK: 'fa-van-shuttle',
  COURIER: 'fa-box',
  MAMA_FUA: 'fa-shirt',
  BARBER: 'fa-scissors',
  HAIR_SALON: 'fa-wand-magic-sparkles',
  MAKEUP_ARTIST: 'fa-spa',
  CAR_WASH: 'fa-spray-can-sparkles',
  TYRE_SERVICES: 'fa-circle-dot',
  PHOTOGRAPHER: 'fa-camera',
  GRAPHIC_DESIGNER: 'fa-palette',
  IT_TECHNICIAN: 'fa-laptop',
  EVENT_LIGHTING: 'fa-lightbulb',
  OTHER: 'fa-wrench',
};

export function skillIcon(skillType: string): string {
  return SKILL_ICONS[skillType] || 'fa-wrench';
}

/** Ready-made option list for every skill dropdown / picker in the app. */
export const SKILL_OPTIONS: { label: string; value: string; icon: string }[] =
  SKILL_TYPES.map((value) => ({
    value,
    label: SKILL_LABELS_KE[value].en,
    icon: skillIcon(value),
  }));

// Format KES currency Kenyan style
export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

// Quick skill label getter
export function skillLabel(skillType: string): string {
  return SKILL_LABELS_KE[skillType]?.en || skillType;
}

/**
 * Trades whose plural is not a simple suffix rule, or whose singular label is an
 * activity rather than a person. Keyed across both the current SkillType enum and
 * the broader taxonomy, so unused keys are inert until the enum grows.
 */
const SKILL_PLURALS: Record<string, string> = {

  // 🏠 HOME & CONSTRUCTION
  PLUMBING: 'Plumbers',
  ELECTRICAL: 'Electricians',
  CARPENTRY: 'Carpenters',
  MASONRY: 'Masons',
  PAINTING: 'Painters',
  ROOFING: 'Roofing Contractors',
  TILING: 'Tilers',
  CEILING_BOARD: 'Ceiling Board Fitters',
  WELDING: 'Welders',
  FABRICATION: 'Fabricators',
  ALUMINIUM_WORK: 'Aluminium Fabricators',
  GLASS_WORK: 'Glaziers',
  JOINERY: 'Joiners',
  WATERPROOFING: 'Waterproofing Specialists',
  STEEL_FIXING: 'Steel Fixers',
  PLASTERING: 'Plasterers',
  FLOORING: 'Flooring Specialists',
  INTERIOR_DECORATION: 'Interior Decorators',

  // 🚗 AUTOMOTIVE & MOTORCYCLES
  CAR_MECHANIC: 'Car Mechanics',
  MOTORCYCLE_MECHANIC: 'Motorcycle Mechanics',
  AUTO_ELECTRICIAN: 'Auto Electricians',
  MOTOR_VEHICLE_WIRING: 'Motor Vehicle Wiring Technicians',
  PANEL_BEATING: 'Panel Beaters',
  SPRAY_PAINTING: 'Spray Painters',
  CAR_WASH: 'Car Wash Services',
  TYRE_SERVICES: 'Tyre Specialists',
  BATTERY_SERVICES: 'Battery Services',

  // 🔧 REPAIR & TECHNICAL
  APPLIANCE_REPAIR: 'Appliance Repair Technicians',
  REFRIGERATION: 'Refrigeration Technicians',
  AIR_CONDITIONING: 'AC Technicians',
  PHONE_REPAIR: 'Phone Repair Technicians',
  COMPUTER_REPAIR: 'Computer Repair Technicians',
  ELECTRONICS_REPAIR: 'Electronics Repair Technicians',
  MACHINE_REPAIR: 'Machine Repair Technicians',
  LOCKSMITH: 'Locksmiths',

  // 🧹 HOME SERVICES
  CLEANING: 'Cleaning Services',
  MAMA_FUA: 'Mama Fua',
  FUMIGATION: 'Fumigation Services',
  PEST_CONTROL: 'Pest Control Services',
  WATER_TANK_CLEANING: 'Water Tank Cleaners',
  GARDENING: 'Gardeners',
  LANDSCAPING: 'Landscapers',
  MOVING: 'Moving Services',
  HOUSE_HELP: 'Domestic Helpers',

  // 🚰 WATER & INFRASTRUCTURE
  BOREHOLE_DRILLING: 'Borehole Drilling Contractors',
  BOREHOLE_REPAIR: 'Borehole Technicians',
  WATER_PUMP_REPAIR: 'Water Pump Technicians',
  SEPTIC_SERVICES: 'Septic Tank Services',
  DRAINAGE: 'Drainage Specialists',

  // 👗 FASHION & PERSONAL SERVICES
  TAILORING: 'Tailors',
  DRESSMAKING: 'Dressmakers',
  SHOE_REPAIR: 'Shoe Repairers',
  LEATHER_WORK: 'Leather Workers',
  UPHOLSTERY: 'Upholsterers',
  BARBERS: 'Barbers',
  HAIRDRESSING: 'Hairdressers',
  BEAUTY: 'Beauty Service Providers',

  // 🎉 EVENTS
  EVENT_DECORATION: 'Event Decorators',
  EVENT_LIGHTING: 'Event Lighting Providers',
  TENT_HIRE: 'Tent Hire Services',
  SOUND_SYSTEM: 'Sound System Providers',
  DJ: 'DJs',
  PHOTOGRAPHY: 'Photographers',
  VIDEOGRAPHY: 'Videographers',
  CATERING: 'Caterers',
  CAKE_BAKING: 'Cake Bakers',

  // 🚚 DELIVERY & TRANSPORT
  COURIER: 'Couriers',
  RIDERS: 'Delivery Riders',
  MOVERS: 'Movers',
  LIGHT_TRANSPORT: 'Light Transporters',
  TUK_TUK_SERVICES: 'Tuk Tuk Services',

  // 🛡️ SECURITY
  SECURITY_SYSTEMS: 'Security System Installers',
  CCTV: 'CCTV Installers',
  ALARM_SYSTEMS: 'Alarm System Installers',
  ACCESS_CONTROL: 'Access Control Installers',
  ELECTRIC_FENCE: 'Electric Fence Installers',

  // 💻 DIGITAL
  IT_SUPPORT: 'IT Technicians',
  NETWORKING: 'Network Technicians',
  WEBSITE_DEVELOPMENT: 'Website Developers',
  GRAPHIC_DESIGN: 'Graphic Designers',
  PHONE_SOFTWARE: 'Mobile Software Technicians',

  // 🌾 AGRICULTURE
  FARM_SERVICES: 'Farm Service Providers',
  LIVESTOCK_SERVICES: 'Livestock Service Providers',
  IRRIGATION: 'Irrigation Technicians',
  AGRICULTURAL_MECHANICS: 'Agricultural Mechanics',

  OTHER: 'Other Service Providers',
};

/** Plural trade noun for headings — "Electricians in Nairobi", not "Electrical Services in Kenya". */
export function skillLabelPlural(skillType: string): string {
  const override = SKILL_PLURALS[skillType];
  if (override) return override;
  const label = skillLabel(skillType);
  if (/s$/i.test(label)) return label;
  if (/(sh|ch|x|z)$/i.test(label)) return `${label}es`;
  return `${label}s`;
}

// Bilingual skill label (e.g. "Electrician (Fundi Stima)")
export function skillLabelBilingual(skillType: string): string {
  const entry = SKILL_LABELS_KE[skillType];
  if (!entry) return skillType;
  return `${entry.en} (${entry.sw})`;
}

/** Swahili/Sheng trade name, or null when the trade has no distinct local name. */
export function skillLabelSwahili(skillType: string): string | null {
  const entry = SKILL_LABELS_KE[skillType];
  if (!entry || entry.sw === entry.en) return null;
  return entry.sw;
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
  MAMA_FUA: [
    'laundry', 'washing clothes', 'wash clothes', 'ironing', 'iron clothes', 'mama fua',
    'house help', 'househelp', 'domestic', 'dishes', 'kufua nguo', 'kupiga pasi',
  ],
  BODA_BODA: ['boda', 'boda boda', 'motorbike', 'motorcycle', 'bike ride', 'pikipiki'],
  TUK_TUK: ['tuk tuk', 'tuktuk', 'three wheeler', 'bajaj'],
  COURIER: [
    'send parcel', 'parcel', 'package', 'courier', 'same day delivery', 'errand',
    'pick and drop', 'peleka', 'tuma kitu',
  ],
  BARBER: ['haircut', 'hair cut', 'shave', 'barber', 'fade', 'beard trim', 'kinyozi', 'kunyoa'],
  HAIR_SALON: [
    'braids', 'braiding', 'weave', 'wig', 'dreadlocks', 'locs', 'hair styling', 'blow dry',
    'relaxer', 'salon', 'saluni', 'kusuka',
  ],
  MAKEUP_ARTIST: [
    'makeup', 'make up', 'bridal makeup', 'nails', 'manicure', 'pedicure', 'lashes',
    'beauty therapist', 'urembo',
  ],
  CAR_WASH: ['car wash', 'carwash', 'wash my car', 'valet', 'detailing', 'kuosha gari'],
  TYRE_SERVICES: ['tyre', 'tire', 'puncture', 'wheel balancing', 'wheel alignment', 'matairi'],
  PHOTOGRAPHER: [
    'photographer', 'photography', 'photoshoot', 'photo shoot', 'wedding photos',
    'videographer', 'video shoot', 'mpiga picha',
  ],
  GRAPHIC_DESIGNER: [
    'logo', 'graphic design', 'designer', 'branding', 'flyer', 'poster', 'banner design',
    'business card', 'social media design',
  ],
  IT_TECHNICIAN: [
    'laptop', 'computer', 'pc repair', 'printer', 'wifi', 'router', 'network', 'software',
    'virus', 'data recovery', 'website', 'kompyuta',
  ],
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
