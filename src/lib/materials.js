// Material catalog. Each material carries 3D rendering parameters used by the
// Three.js scene so the sheet and pieces look recognizably different.

export const MATERIALS = [
  {
    id: 'plywood',
    name: 'Plywood',
    tagline: 'Layered wood veneer',
    base: '#C8A06A',
    edge: '#8B5E34',
    description:
      'Engineered wood made of thin veneer layers glued together. Strong, lightweight, and ideal for furniture, cabinetry, and structural panels.',
    uses: ['Cabinetry', 'Furniture frames', 'Subflooring', 'Wall panels'],
    commonSizes: [
      { length: 2440, width: 1220, thickness: 18 },
      { length: 2440, width: 1220, thickness: 12 },
      { length: 1220, width: 610, thickness: 6 },
    ],
    cutting: 'Cross-cut veneer can splinter — use a fine-tooth blade and support the sheet fully.',
    grain: 'Grain runs along the long axis. Rotating pieces across the grain weakens the visible face.',
    safety: 'Wear a dust mask — some adhesives release urea-formaldehyde when cut.',
    // 3D params
    three: {
      kind: 'wood',
      color: '#C8A06A',
      edgeColor: '#8B5E34',
      roughness: 0.85,
      metalness: 0.0,
      opacity: 1,
      transmission: 0,
      clearcoat: 0,
    },
  },
  {
    id: 'mdf',
    name: 'MDF',
    tagline: 'Medium-density fibreboard',
    base: '#C9A97A',
    edge: '#A07A4A',
    description:
      'Smooth, uniform panel of compressed wood fibres and resin. Machines cleanly and paints beautifully, but is heavy and absorbs moisture.',
    uses: ['Painted cabinets', 'Laser-cut templates', 'Speaker boxes', 'Decorative trim'],
    commonSizes: [
      { length: 2440, width: 1220, thickness: 18 },
      { length: 2440, width: 1220, thickness: 6 },
      { length: 1830, width: 610, thickness: 12 },
    ],
    cutting: 'Produces very fine dust — use dust extraction and a down-cut blade to avoid edge tear-out.',
    grain: 'No grain direction — rotation does not affect strength.',
    safety: 'Fine dust is a respiratory irritant. Use a mask and extraction.',
    three: {
      kind: 'mdf',
      color: '#C9A97A',
      edgeColor: '#A07A4A',
      roughness: 0.95,
      metalness: 0.0,
      opacity: 1,
      transmission: 0,
      clearcoat: 0,
    },
  },
  {
    id: 'acrylic',
    name: 'Acrylic',
    tagline: 'Clear cast plastic',
    base: '#7FB7E8',
    edge: '#BFE0F7',
    description:
      'Rigid, transparent plastic with a glass-like finish. Cuts cleanly on a laser or fine router; edges can be flame-polished.',
    uses: ['Signage', 'Display cases', 'Light diffusers', 'Guards & shields'],
    commonSizes: [
      { length: 1220, width: 610, thickness: 5 },
      { length: 1220, width: 610, thickness: 3 },
      { length: 600, width: 400, thickness: 8 },
    ],
    cutting: 'Score-and-snap for thin sheets, or laser cut. Drilling too fast causes cracking.',
    grain: 'No grain — rotation is free.',
    safety: 'Ventilate when laser cutting — fumes are harmful.',
    three: {
      kind: 'acrylic',
      color: '#7FB7E8',
      edgeColor: '#D6EEFB',
      roughness: 0.05,
      metalness: 0.0,
      opacity: 0.55,
      transmission: 0.6,
      clearcoat: 1,
    },
  },
  {
    id: 'cardboard',
    name: 'Cardboard',
    tagline: 'Corrugated kraft board',
    base: '#C9A06A',
    edge: '#A07A4A',
    description:
      'Lightweight corrugated kraft paper. Cheap, recyclable, and easy to knife-cut. Used for packaging, prototypes, and templates.',
    uses: ['Packaging', 'Prototyping', 'Templates', 'Signage'],
    commonSizes: [
      { length: 1200, width: 800, thickness: 5 },
      { length: 1000, width: 700, thickness: 3 },
      { length: 800, width: 600, thickness: 8 },
    ],
    cutting: 'Use a sharp utility knife on a cutting mat — a dull blade tears the flutes.',
    grain: 'Flutes run one direction; folding across them is easier than along them.',
    safety: 'Keep dry — loses strength rapidly when wet.',
    three: {
      kind: 'cardboard',
      color: '#C9A06A',
      edgeColor: '#8A6A3A',
      roughness: 1.0,
      metalness: 0.0,
      opacity: 1,
      transmission: 0,
      clearcoat: 0,
    },
  },
  {
    id: 'metal',
    name: 'Metal',
    tagline: 'Brushed aluminium sheet',
    base: '#C7CCD1',
    edge: '#9AA3AB',
    description:
      'Brushed aluminium sheet — lightweight, corrosion-resistant, and machinable. Used for panels, brackets, and enclosures.',
    uses: ['Enclosures', 'Brackets', 'Face panels', 'Trim'],
    commonSizes: [
      { length: 1220, width: 610, thickness: 3 },
      { length: 1000, width: 500, thickness: 2 },
      { length: 600, width: 400, thickness: 1.5 },
    ],
    cutting: 'Use a carbide blade, slow feed, and lubrication. Deburr sharp edges after cutting.',
    grain: 'No grain — rotation is free. Brushing direction is cosmetic only.',
    safety: 'Edges are sharp after cutting — wear gloves and deburr.',
    three: {
      kind: 'metal',
      color: '#C7CCD1',
      edgeColor: '#9AA3AB',
      roughness: 0.35,
      metalness: 1.0,
      opacity: 1,
      transmission: 0,
      clearcoat: 0.6,
    },
  },
];

export const MATERIAL_MAP = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

export function getMaterial(id) {
  return MATERIAL_MAP[id] || MATERIALS[0];
}

// A stable palette for piece identification overlays.
export const PIECE_COLORS = [
  '#16A34A', '#15803D', '#0EA5E9', '#6366F1', '#F59E0B',
  '#EF4444', '#EC4899', '#14B8A6', '#8B5CF6', '#F97316',
];
