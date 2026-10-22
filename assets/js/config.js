/** Garden settings — tweak freely. */
export const CONFIG = {
  /** Flower kinds in the starting garden. Use ['lotus'] for the all-orange original look. */
  gardenSpecies: ['lotus', 'rose', 'daisy', 'tulip', 'lily', 'sakura', 'poppy', 'lavender', 'dandelion'],
  /** Each tap on empty ground grows the next kind in this list, then loops. */
  plantOrder: ['rose', 'tulip', 'lily', 'sakura', 'daisy', 'poppy', 'lavender', 'dandelion', 'lotus'],

  /** Chance a planted flower turns out rare. */
  rareChance: 0.1,
  /** Chance each flower of the starting garden is rare. */
  gardenRareChance: 0.06,
  /** Tapping the top part of the screen (this fraction of its height) plants a mysterious bud… */
  legendaryZone: 0.16,
  /** …which becomes legendary with this chance. */
  legendaryChance: 0.35,

  /** Show names of planted / rare flowers when they open. */
  showNames: true,
  /** Flowers in the starting garden; 0 = auto (based on garden width). */
  flowerCount: 0,
  /** The oldest flowers fade out past this many. */
  maxFlowers: 40,
  /** Floating embers; 0 = auto (based on screen area). */
  embers: 0,
  /** Glow (bloom) layer on / off. */
  glow: true,
  /** A short, gentle shake of the view when a legendary flower opens. */
  cameraShake: true,
};
