/**
 * Every flower design, by key. To add one: create a file next to these that exports a
 * `SpeciesDef`, import it here, and add it to the list (and to CONFIG if it's common).
 */

import { lotus } from './lotus.js';
import { daisy } from './daisy.js';
import { rose } from './rose.js';
import { tulip } from './tulip.js';
import { lily } from './lily.js';
import { sakura } from './sakura.js';
import { poppy } from './poppy.js';
import { lavender } from './lavender.js';
import { dandelion } from './dandelion.js';
import { crystalRose } from './crystal-rose.js';
import { auroraLotus } from './aurora-lotus.js';
import { sapphireStar } from './sapphire-star.js';
import { moonOrchid } from './moon-orchid.js';
import { frostBloom } from './frost-bloom.js';
import { glowbell } from './glowbell.js';
import { celestial } from './celestial.js';
import { phoenix } from './phoenix.js';
import { nebulaRose } from './nebula-rose.js';
import { eclipseLotus } from './eclipse-lotus.js';
import { stormLily } from './storm-lily.js';

/** @import { Rarity, SpeciesDef } from '../../core/types.js' */

/** @type {Record<string, SpeciesDef>} */
export const SPECIES = {
  // common
  lotus, daisy, rose, tulip, lily, sakura, poppy, lavender, dandelion,
  // rare
  crystalRose, auroraLotus, sapphireStar, moonOrchid, frostBloom, glowbell,
  // legendary
  celestial, phoenix, nebulaRose, eclipseLotus, stormLily,
};

/** @param {Rarity} rarity */
const keysOf = (rarity) => Object.keys(SPECIES).filter((k) => SPECIES[k].rarity === rarity);

export const COMMON = keysOf('common');
export const RARE = keysOf('rare');
export const LEGENDARY = keysOf('legendary');
