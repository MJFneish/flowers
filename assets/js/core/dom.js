/** The page elements the scripts talk to. */

/** @type {(id: string) => any} */
const byId = (id) => document.getElementById(id);

export const dom = {
  garden: /** @type {HTMLCanvasElement} */ (byId('garden')),
  glow: /** @type {HTMLCanvasElement} */ (byId('glow')),
  hint: /** @type {HTMLElement} */ (byId('hint')),
  flash: /** @type {HTMLElement} */ (byId('flash')),
  banner: /** @type {HTMLElement} */ (byId('banner')),
  bannerTag: /** @type {HTMLElement} */ (byId('bannerTag')),
  bannerName: /** @type {HTMLElement} */ (byId('bannerName')),
  replay: /** @type {HTMLButtonElement} */ (byId('replay')),
  zoomIn: /** @type {HTMLButtonElement} */ (byId('zoomIn')),
  zoomOut: /** @type {HTMLButtonElement} */ (byId('zoomOut')),
  zoomFit: /** @type {HTMLButtonElement} */ (byId('zoomFit')),
  motion: /** @type {HTMLButtonElement} */ (byId('motion')),
};
