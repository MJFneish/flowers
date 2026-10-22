/**
 * Shared JSDoc types — this file has no runtime code. Other modules pull the types
 * in with a JSDoc `@import` tag, which lets VS Code type-check the whole project.
 */

/** @import { Flower } from '../flowers/flower.js' */

/* ------------------------------------------------------------------ flowers */

/**
 * Draws one petal outline, base at (0,0), tip at (0,-len).
 * @typedef {(c: CanvasRenderingContext2D, len: number, wid: number) => void} PetalShape
 */

/**
 * Hue of petal `i` of `n` in a ring, for petals whose color changes over time.
 * @typedef {(f: Flower, i: number, n: number) => number} HueFn
 */

/**
 * A petal gradient, from base to tip.
 * @typedef {object} PaintDef
 * @property {number} len        gradient length, as a fraction of the flower radius
 * @property {number[][]} stops  [offset, hue shift, saturation %, lightness %, alpha]
 */

/**
 * One ring of petals around the flower center.
 * @typedef {object} RingDef
 * @property {number} n          petal count
 * @property {number} len        petal length, fraction of the flower radius
 * @property {number} wr         petal width / length
 * @property {number} off        angular offset (radians)
 * @property {number} delay      seconds after the bloom starts
 * @property {number} twist      how far petals spiral while unfurling (radians)
 * @property {number} stagger    seconds between adjacent petals
 * @property {number} dur        seconds for one petal to open
 * @property {PetalShape} shape
 * @property {number[] | null} edge  outline color [hue shift, lightness %, alpha]
 * @property {number} vein       midrib length (fraction of petal), 0 = none
 * @property {number} edgeWidth  outline width
 * @property {number} spots      freckles per petal
 * @property {number} flicker    flame-like length flicker (0 = none)
 * @property {number} spin       how much the flower's random rotation applies (0 = always upright)
 * @property {HueFn | null} hueFn  animated per-petal hue; the paint's stops then shift from it
 * @property {number} paint      index into the flower's paints
 */

/**
 * What a species writes for each ring; everything not given gets a default.
 * @typedef {Partial<RingDef> & { n: number, len: number, stops: number[][] }} RingSpec
 */

/**
 * @typedef {object} LeafStyle
 * @property {number} min        fewest leaves
 * @property {number} max        most leaves
 * @property {number} tMin       lowest position along the stem (0 = base, 1 = head)
 * @property {number} tMax       highest position along the stem
 * @property {number} lenMul     length multiplier
 * @property {number} wMul       breadth / length
 * @property {number} angMin     angle away from the stem (radians)
 * @property {number} angMax
 */

/**
 * @typedef {object} LeafDef
 * @property {number} t          position along the stem
 * @property {number} side       -1 = left, 1 = right
 * @property {number} lf         length factor
 * @property {number} wm         breadth / length
 * @property {number} ang        angle away from the stem
 * @property {number} phase      sway phase
 */

/**
 * Per-frame values shared by all head-drawing code.
 * @typedef {object} HeadState
 * @property {number} R          petal radius in world px
 * @property {number} budIn      0 → 1 while the bud appears
 * @property {number} L0         age at which the bloom starts
 * @property {number} bloom      0 → 1 over the bloom
 * @property {number} eBloom     eased bloom
 * @property {number} breathe    gentle scale pulse once open
 */

/** @typedef {'common' | 'rare' | 'legendary'} Rarity */

/**
 * One flower design.
 * @typedef {object} SpeciesDef
 * @property {string} name
 * @property {Rarity} rarity
 * @property {number[]} hues       one is picked per flower
 * @property {number} size         petal-radius multiplier
 * @property {boolean} front       front-facing (gets a perspective tilt) vs side view
 * @property {number} centerY      head center along the head axis, fraction of the radius
 * @property {number} halo         halo radius, fraction of the radius
 * @property {boolean} glint       four-point light glint over the center
 * @property {number[][]} bud      bud gradient [offset, hue shift, saturation %, lightness %]
 * @property {LeafStyle} leaf
 * @property {() => { paints: PaintDef[], rings: RingDef[] }} build
 * @property {(c: CanvasRenderingContext2D, f: Flower, s: HeadState) => void} draw
 * @property {(f: Flower, k: number) => number} [sparkHue]
 *   hue of its sparks, orbiting comets and fountain; `k` (0 – 1) says which one
 *   (defaults to a little around the flower's own hue)
 * @property {(f: Flower, dt: number) => void} [ambient]
 *   an extra effect every frame once it's open (snowfall, crackling sparks …)
 */

/* ------------------------------------------------------------------ world */

/**
 * @typedef {object} ParticleData
 * @property {boolean} [ember]   ambient screen-space ember (respawns at the bottom)
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} life
 * @property {number} age
 * @property {number} size
 * @property {number} hue
 * @property {number} sat
 * @property {number} light
 * @property {number} drag
 * @property {number} gravity
 * @property {number} windK      how much the breeze pushes it
 * @property {number} flick      twinkle speed
 * @property {number} phase
 * @property {number} wobble     side-to-side drift
 */

/**
 * A wavy ribbon of scent rising from a picked flower.
 * @typedef {object} ScentDef
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} age
 * @property {number} life
 * @property {number} hue
 * @property {number} amp
 * @property {number} len
 * @property {number} phase
 * @property {number} w
 */

/**
 * Floating words in the garden (e.g. when a legendary bud fizzles).
 * @typedef {object} FloatText
 * @property {number} x
 * @property {number} y
 * @property {string} text
 * @property {string} color
 * @property {number} age
 * @property {number} life
 */

/**
 * @typedef {object} BeeDef
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {Flower | null} target
 * @property {'arrive' | 'hover' | 'leave'} mode
 * @property {number} until      time the current hover ends
 * @property {number} phase
 * @property {number} face       1 = facing right, -1 = left
 * @property {number} size
 * @property {number} exitX
 * @property {number} exitY
 */

/**
 * @typedef {object} StarDef
 * @property {number} xf
 * @property {number} yf
 * @property {number} r
 * @property {number} base
 * @property {number} sp
 * @property {number} ph
 */

/**
 * @typedef {object} BladeDef
 * @property {number} xf
 * @property {number} hf
 * @property {number} w
 * @property {number} lean
 * @property {number} ph
 * @property {number} delay
 */

/* ------------------------------------------------------------------ input */

/**
 * A pointer pressing on a flower (positions in world coordinates).
 * @typedef {object} PressState
 * @property {Flower} f
 * @property {number} id
 * @property {number} x0
 * @property {number} y0
 * @property {number} x
 * @property {number} y
 * @property {number} t0
 * @property {boolean} dragging
 */

/**
 * A pointer dragging the empty garden (positions in screen coordinates).
 * @typedef {object} PanState
 * @property {number} id
 * @property {number} sx0
 * @property {number} sy0
 * @property {number} camX0
 * @property {number} camY0
 * @property {boolean} moved
 * @property {number} lastX
 * @property {number} lastY
 * @property {number} lastT
 * @property {number} vx
 * @property {number} vy
 */

/**
 * Two fingers zooming.
 * @typedef {object} PinchState
 * @property {number} d0         finger distance when the pinch started
 * @property {number} zoom0
 * @property {number} wx         world point that stays under the fingers
 * @property {number} wy
 */

export {};
